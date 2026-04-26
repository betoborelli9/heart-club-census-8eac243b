/**
 * ═══════════════════════════════════════════════════════════════════
 * [CAMINHO]: supabase/functions/enrich-club-colors/index.ts
 * [MÓDULO]: ENRIQUECIMENTO AUTOMÁTICO DE CLUBES (CORES + FEMININO)
 * [STATUS]: PRODUÇÃO — VERSÃO 76.0 (UNIFIED PIPELINE)
 * [DESCRIÇÃO]:
 * - Cores oficiais (HEX) via Gemini 2.5 + Google Search Grounding (Wikipedia first).
 * - Verificação automática de futebol feminino via Google News RSS + Gemini Search.
 * - Persistência única em clubes_cache (cor_primaria/secundaria/terciaria/quarta + tem_feminino).
 * - Sem paletas extras: apenas HEX puro nas colunas existentes.
 * ═══════════════════════════════════════════════════════════════════
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/* ═══════════════════════════════════════════════════════════
    MÓDULO 1: UTILITÁRIOS
   ═══════════════════════════════════════════════════════════ */
function cleanResponse(text: string): string {
  return text.replace(/```json|```/g, "").trim();
}

function normalizeHex(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v || v.toLowerCase() === "null") return null;
  const m = v.match(/#?([0-9a-fA-F]{6})/);
  return m ? `#${m[1].toUpperCase()}` : null;
}

const decodeXml = (value: string) =>
  value
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const stripHtml = (value: string) =>
  decodeXml(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());

const readTag = (item: string, tag: string) => {
  const match = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXml(match[1]).trim() : "";
};

/* ═══════════════════════════════════════════════════════════
    MÓDULO 2: API FOOTBALL (LOGO/ID)
   ═══════════════════════════════════════════════════════════ */
async function fetchTechnicalData(club_name: string, api_id: string | null, apiKey: string) {
  try {
    const url = api_id
      ? `https://v3.football.api-sports.io/teams?id=${api_id}`
      : `https://v3.football.api-sports.io/teams?search=${encodeURIComponent(club_name)}`;

    const res = await fetch(url, { headers: { "x-apisports-key": apiKey } });
    const json = await res.json();
    return json.response?.[0] || null;
  } catch (e) {
    console.error("[TÉCNICO]: Falha API Football", e);
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════
    MÓDULO 3: INVESTIGAÇÃO IA — CORES + DADOS GERAIS
   ═══════════════════════════════════════════════════════════ */
async function investigateClubWithAI(club_name: string, lovableKey: string) {
  const CURRENT_DATE = "Abril de 2026";

  const systemPrompt =
    "Você é um auditor sênior de branding de futebol. Sua fonte absoluta é a Wikipedia e sites oficiais. Responda APENAS JSON puro, sem markdown.";

  const userPrompt = `
  Investigue o clube "${club_name}" com foco na temporada de ${CURRENT_DATE}.

  REGRAS DE CORES (DESIGN DE TECIDO — APENAS HEX #RRGGBB):
  1. IGNORE cores de contorno de escudo, bordas pretas de segurança ou dourado de estrelas.
  2. CLASSIFICAÇÃO:
     - BICOLOR (Vila Nova, Palmeiras): cor_terciaria e cor_quarta DEVEM ser null.
     - TRICOLOR (São Paulo, Santa Cruz): cor_quarta DEVE ser null.
     - QUADRICOLOR (Brusque): Amarelo, Verde, Vermelho e Branco (Obrigatórios).
  3. COR_PRIMARIA: Cor identitária de força. JAMAIS use Preto se o clube não for Alvinegro.
  4. Use EXCLUSIVAMENTE códigos HEX. Nada de RGB, HSL ou nomes.

  REGRAS DE NEGÓCIO:
  5. DIVISÃO 2026: Verifique a série nacional (A, B, C ou D).
  6. FEMININO: true se houver time profissional/sênior ativo (Brasileirão A1/A2/A3, estaduais adultos, Libertadores Feminina).
  7. MASCOTE: Nome oficial histórico.

  RETORNE JSON puro: {"cor_primaria":"#HEX","cor_secundaria":"#HEX","cor_terciaria":"#HEX ou null","cor_quarta":"#HEX ou null","mascote":"NOME","tem_feminino":true|false,"division":"Série X"}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "registrar_clube",
            description: "Registra dados oficiais do clube",
            parameters: {
              type: "object",
              properties: {
                cor_primaria: { type: "string", description: "HEX #RRGGBB" },
                cor_secundaria: { type: "string", description: "HEX #RRGGBB" },
                cor_terciaria: { type: ["string", "null"], description: "HEX #RRGGBB ou null" },
                cor_quarta: { type: ["string", "null"], description: "HEX #RRGGBB ou null" },
                mascote: { type: ["string", "null"] },
                tem_feminino: { type: "boolean" },
                division: { type: ["string", "null"] },
              },
              required: ["cor_primaria", "cor_secundaria", "tem_feminino"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "registrar_clube" } },
    }),
  });

  if (!res.ok) {
    const errTxt = await res.text();
    console.error("[IA]: HTTP", res.status, errTxt.slice(0, 300));
    return null;
  }
  const json = await res.json();
  const toolCall = json.choices?.[0]?.message?.tool_calls?.[0];
  const args = toolCall?.function?.arguments;
  if (!args) {
    console.error("[IA]: sem tool_call", JSON.stringify(json).slice(0, 300));
    return null;
  }
  try {
    return typeof args === "string" ? JSON.parse(args) : args;
  } catch (e) {
    console.error("[IA]: parse falhou", e);
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════
    MÓDULO 4: VERIFICAÇÃO FEMININO (GOOGLE NEWS RSS)
   ═══════════════════════════════════════════════════════════ */
type NewsHit = { title: string; snippet: string; source: string };

async function fetchFemininoHits(clubName: string): Promise<NewsHit[]> {
  const queries = [
    `"${clubName}" "futebol feminino"`,
    `"${clubName}" "Brasileirão Feminino"`,
    `"${clubName}" "time feminino"`,
  ];
  const hits: NewsHit[] = [];
  for (const query of queries) {
    try {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
      const response = await fetch(url, { headers: { "User-Agent": "HeartClubBot/1.0" } });
      if (!response.ok) continue;
      const xml = await response.text();
      const items = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
      for (const item of items.slice(0, 5)) {
        hits.push({
          title: stripHtml(readTag(item, "title")),
          snippet: stripHtml(readTag(item, "description")),
          source: stripHtml(readTag(item, "source")) || "Google News",
        });
      }
    } catch (e) {
      console.error("[FEMININO RSS]:", e);
    }
  }
  return hits;
}

function detectFemininoFromHits(hits: NewsHit[]): boolean | null {
  const positive = hits.find((hit) => {
    const text = `${hit.title} ${hit.snippet}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const adultCompetition =
      /brasileir(?:a|o) feminino|serie a-?[123] feminina|campeonato .* feminino|paulista feminino|carioca feminino|mineiro feminino|gauchao feminino|goianao feminino|libertadores feminina|champions feminina/.test(
        text,
      );
    const genericTeam = /time feminino|equipe feminina|futebol feminino/.test(text);
    const youthOnly = /sub-?1[57]|sub-?20|base/.test(text) && !adultCompetition;
    return !youthOnly && (adultCompetition || genericTeam);
  });
  if (positive) return true;
  return null; // inconclusivo
}

/* ═══════════════════════════════════════════════════════════
    MÓDULO 5: ORQUESTRAÇÃO
   ═══════════════════════════════════════════════════════════ */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;
    const footballKey = Deno.env.get("API_FOOTBALL_KEY") || Deno.env.get("FOOTBALL_API_KEY") || "";

    const { club_name, api_id } = await req.json();
    if (!club_name) throw new Error("Nome do clube é obrigatório");

    console.log(`[ORQUESTRAÇÃO 76.0]: Investigando ${club_name}...`);

    // Execução paralela: técnico + IA + RSS feminino
    const [technical, aiData, femHits] = await Promise.all([
      footballKey ? fetchTechnicalData(club_name, api_id, footballKey) : Promise.resolve(null),
      investigateClubWithAI(club_name, geminiKey),
      fetchFemininoHits(club_name),
    ]);

    if (!aiData) throw new Error("IA falhou na investigação de cores/dados");

    // Cruzamento: RSS prevalece se positivo; senão usa IA
    const femFromRss = detectFemininoFromHits(femHits);
    const tem_feminino = femFromRss === true ? true : Boolean(aiData.tem_feminino);

    const payload = {
      nome: club_name,
      api_id: technical?.team?.id?.toString() || api_id?.toString() || null,
      escudo_url: technical?.team?.logo || null,
      division: aiData.division ?? null,
      mascote: aiData.mascote ?? null,
      tem_feminino,
      cor_primaria: normalizeHex(aiData.cor_primaria),
      cor_secundaria: normalizeHex(aiData.cor_secundaria),
      cor_terciaria: normalizeHex(aiData.cor_terciaria),
      cor_quarta: normalizeHex(aiData.cor_quarta),
      atualizado_em: new Date().toISOString(),
    };

    const { data, error: upsertError } = await supabase
      .from("clubes_cache")
      .upsert(payload, { onConflict: "nome" })
      .select()
      .single();

    if (upsertError) throw upsertError;

    return new Response(
      JSON.stringify({
        success: true,
        club: data,
        feminino_source: femFromRss === true ? "google_news" : "gemini",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[ERRO CRÍTICO]:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * [RODAPÉ TÉCNICO]
 * VERSÃO: 76.0
 * MODIFICAÇÕES:
 * - Unificou cores + futebol feminino em uma única chamada.
 * - Cores normalizadas para HEX puro (#RRGGBB), demais paletas removidas.
 * - Verificação dupla de feminino: Google News RSS + Gemini Google Search.
 * - Persistência atômica via upsert em clubes_cache.
 */
