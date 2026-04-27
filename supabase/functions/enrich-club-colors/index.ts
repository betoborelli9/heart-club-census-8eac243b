/**
 * ═══════════════════════════════════════════════════════════════════
 * [CAMINHO]: supabase/functions/enrich-club-colors/index.ts
 * [MÓDULO]: ENRIQUECIMENTO UNIFICADO DE CLUBES
 * [STATUS]: PRODUÇÃO — VERSÃO 100.0 (LOVABLE AI + GOOGLE SEARCH GROUNDING)
 * [DESCRIÇÃO]:
 *   1. API-Football: dados técnicos (nome, escudo, cidade, país, estádio, divisão, fundação).
 *   2. CORES: Lovable AI Gateway (Gemini 2.5 Flash) com Google Search nativo,
 *      mesma lógica usada em investigate-club-colors (que está funcionando).
 *      Suporta BICOLOR / TRICOLOR / QUADRICOLOR (2, 3 ou 4 cores HEX).
 *   3. Mascote + Feminino: Lovable AI Gateway com Google Search.
 *   4. Persistência completa em clubes_cache (todas as colunas).
 * ═══════════════════════════════════════════════════════════════════
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ═══════════════════════════════════════════════════════════
   CONFIG / CORS
═══════════════════════════════════════════════════════════ */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const API_FOOTBALL = Deno.env.get("API_FOOTBALL_KEY") || Deno.env.get("FOOTBALL_API_KEY") || "";
const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY") || "";

/* ═══════════════════════════════════════════════════════════
   HELPERS HEX
═══════════════════════════════════════════════════════════ */
const HEX_RE = /^#?([0-9a-fA-F]{6})$/;

function normalizeHex(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const m = value.trim().match(HEX_RE);
  return m ? `#${m[1].toUpperCase()}` : null;
}

function dedupeHex(list: (string | null | undefined)[]): string[] {
  const out: string[] = [];
  for (const c of list) {
    const h = normalizeHex(c);
    if (h && !out.includes(h)) out.push(h);
  }
  return out;
}

/* ═══════════════════════════════════════════════════════════
   API FOOTBALL (dados técnicos do clube)
═══════════════════════════════════════════════════════════ */
async function apiFootball(path: string): Promise<any> {
  if (!API_FOOTBALL) return null;
  try {
    const res = await fetch(`https://v3.football.api-sports.io${path}`, {
      headers: { "x-apisports-key": API_FOOTBALL },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════
   PROMPT — CORES + MASCOTE + FEMININO + DIVISÃO
   (mesma lógica da edge investigate-club-colors)
═══════════════════════════════════════════════════════════ */
function buildPrompt(clubName: string, country?: string) {
  const ctx = country ? ` (país: ${country})` : "";
  return `
Você é a IA de dados esportivos do Heart Club.

Use OBRIGATORIAMENTE a ferramenta Google Search para responder cores oficiais, mascote, futebol feminino e divisão atual do clube.

CLUBE CONSULTADO: ${clubName}${ctx}

PESQUISE NO GOOGLE:
1. "quais são as cores do clube ${clubName}"
2. "${clubName} cores oficiais uniforme futebol"
3. "${clubName} official club colors football"
4. "${clubName} mascote"
5. "${clubName} futebol feminino"
6. "${clubName} divisão atual série"

REGRAS DE CORES:
- Use as cores oficiais/tradicionais do clube e do uniforme principal.
- NÃO use cores que aparecem apenas no contorno do escudo, borda, estrelas, sombras, letras ou detalhes decorativos.
- BICOLOR = 2 cores. TRICOLOR = 3 cores. QUADRICOLOR = 4 cores.
- Exemplos de referência:
  • Palmeiras → Verde e Branco (BICOLOR)
  • Vila Nova-GO → Vermelho e Branco (BICOLOR, sem preto do contorno)
  • Real Madrid → Branco e Dourado (BICOLOR)
  • São Paulo → Branco, Vermelho e Preto (TRICOLOR)
  • Santa Cruz-PE → Vermelho, Preto e Branco (TRICOLOR)
  • Brusque-SC → Amarelo, Verde, Vermelho e Branco (QUADRICOLOR)
  • Fluminense → Grená, Verde e Branco (TRICOLOR)
  • Avaí → Azul e Branco (BICOLOR)

SAÍDA OBRIGATÓRIA — JSON puro, sem markdown, sem explicação:
{
  "nome_confirmado": "Nome oficial do clube",
  "cor_primaria": "#HEX",
  "cor_secundaria": "#HEX",
  "cor_terciaria": "#HEX ou null",
  "cor_quarta": "#HEX ou null",
  "mascote": "Nome do mascote ou null",
  "tem_feminino": true | false,
  "division": "Série A | Série B | Série C | Série D | La Liga | Premier League | etc, ou null"
}
`.trim();
}

/* ═══════════════════════════════════════════════════════════
   LOVABLE AI GATEWAY — Gemini 2.5 Flash com Google Search
═══════════════════════════════════════════════════════════ */
async function callAIGrounded(clubName: string, country?: string): Promise<any | null> {
  if (!LOVABLE_KEY) {
    console.error("[ENRICH] LOVABLE_API_KEY ausente");
    return null;
  }

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: buildPrompt(clubName, country) }],
        tools: [{ type: "google_search" }],
        temperature: 0.05,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[LOVABLE AI ${res.status}]`, errText.slice(0, 300));
      return null;
    }

    const json = await res.json();
    const text: string = json.choices?.[0]?.message?.content || "";
    if (!text) return null;

    // Extrai JSON do texto
    const clean = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    const slice = clean.slice(start, end + 1);

    try {
      return JSON.parse(slice);
    } catch {
      return JSON.parse(slice.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]"));
    }
  } catch (err) {
    console.error("[ENRICH AI] erro:", (err as Error).message);
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════
   FEMININO — verificação dedicada via API-Football (se disponível)
═══════════════════════════════════════════════════════════ */
async function checkFemininoApi(clubName: string): Promise<boolean | null> {
  // Busca por "<clube> feminino" na API-Football. Se encontrar resultado, true.
  const tJson = await apiFootball(`/teams?search=${encodeURIComponent(clubName + " feminino")}`);
  const found = tJson?.response?.length || 0;
  if (found > 0) return true;
  return null; // inconclusivo, mantém o que IA falou
}

/* ═══════════════════════════════════════════════════════════
   MAIN HANDLER
═══════════════════════════════════════════════════════════ */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { club_name, api_id } = await req.json();
    if (!club_name && !api_id) {
      return new Response(JSON.stringify({ success: false, error: "club_name ou api_id obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[ENRICH 100.0] → ${club_name} (api_id=${api_id || "n/a"})`);

    /* 1️⃣ API-Football: dados técnicos */
    const teamUrl = api_id ? `/teams?id=${api_id}` : `/teams?search=${encodeURIComponent(club_name)}`;
    const tJson = await apiFootball(teamUrl);
    const teamInfo = tJson?.response?.[0] || null;
    const team = teamInfo?.team || {};
    const venue = teamInfo?.venue || {};

    const finalName: string = team.name || club_name;
    const country: string = team.country || "Brazil";

    /* 2️⃣ Divisão atual via leagues (se tiver api_id) */
    let division: string | null = null;
    if (team.id) {
      const lJson = await apiFootball(`/leagues?team=${team.id}&current=true`);
      const league = lJson?.response?.[0]?.league || null;
      if (league?.name) division = league.name;
    }

    /* 3️⃣ IA com Google Search: cores + mascote + feminino + divisão */
    const ai = await callAIGrounded(finalName, country);
    console.log(`[AI GROUNDED] ${finalName} →`, ai ? Object.keys(ai).join(",") : "null");

    const cores = dedupeHex([
      ai?.cor_primaria,
      ai?.cor_secundaria,
      ai?.cor_terciaria,
      ai?.cor_quarta,
    ]).slice(0, 4);

    /* 4️⃣ Crosscheck feminino via API */
    const femApi = await checkFemininoApi(finalName);
    const tem_feminino: boolean = femApi === true ? true : Boolean(ai?.tem_feminino);

    /* 5️⃣ Payload final para clubes_cache (todas as colunas) */
    const payload: Record<string, unknown> = {
      nome: finalName,
      nome_curto: team.code || finalName.split(" ")[0],
      pais: country,
      cidade: venue.city || team.city || "Não informado",
      fundado: team.founded || null,
      escudo_url: team.logo || null,
      estadio_nome: venue.name || null,
      estadio_cidade: venue.city || null,
      estadio_capacidade: venue.capacity || null,
      mascote: (ai?.mascote && String(ai.mascote).trim()) || null,
      cor_primaria: cores[0] || null,
      cor_secundaria: cores[1] || null,
      cor_terciaria: cores[2] || null,
      cor_quarta: cores[3] || null,
      division: division || ai?.division || null,
      feminino: tem_feminino,
      tem_feminino,
      api_id: team.id ? String(team.id) : (api_id ? String(api_id) : null),
      atualizado_em: new Date().toISOString(),
    };

    console.log(`[ENRICH 100.0] payload:`, JSON.stringify(payload));

    const { data, error } = await supabase
      .from("clubes_cache")
      .upsert(payload, { onConflict: "nome" })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, club: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = (err as Error).message || "Erro desconhecido";
    console.error("[ENRICH 100.0] ERRO:", message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * ═══════════════════════════════════════════════════════════════════
 * [RODAPÉ TÉCNICO] — Versão 100.0
 * - Cores agora vêm do Lovable AI Gateway com Google Search grounding
 *   (mesma lógica de investigate-club-colors, que está funcionando).
 * - Suporta 2, 3 ou 4 cores (BICOLOR/TRICOLOR/QUADRICOLOR) automaticamente.
 * - Removido scraping frágil de Wikipedia + chamadas diretas ao Gemini
 *   (que estourava cota do free tier e devolvia cores erradas).
 * - Persistência completa em todas as colunas do clubes_cache.
 * ═══════════════════════════════════════════════════════════════════
 */
