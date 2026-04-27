/**
 * ═══════════════════════════════════════════════════════════════════
 * [CAMINHO]: supabase/functions/enrich-club-colors/index.ts
 * [MÓDULO]: ENRIQUECIMENTO UNIFICADO DE CLUBES (AI DIRECT)
 * [STATUS]: PRODUÇÃO — VERSÃO 91.0 (DIRECT GEMINI + SEARCH GROUNDING)
 * [DESCRIÇÃO]:
 * 1. API-Football: Mapeamento direto (Fundado, Estádio, Escudo).
 * 2. Gemini 2.5 Flash (API Direta): Mascote, Cores (Jersey) e Feminino.
 * 3. Google Search Grounding: Ativado para evitar 'null' em mascotes conhecidos.
 * 4. Persistência: Upsert blindado em todas as colunas.
 * ═══════════════════════════════════════════════════════════════════
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const API_FOOTBALL = Deno.env.get("API_FOOTBALL_KEY") || Deno.env.get("FOOTBALL_API_KEY") || "";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";

/* ─────────────── helpers ─────────────── */

const HEX_RE = /^#?([0-9a-fA-F]{6})$/;
function normalizeHex(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v || /^null$/i.test(v)) return null;
  const m = v.match(HEX_RE);
  if (!m) return null;
  return `#${m[1].toUpperCase()}`;
}

function uniqHex(list: (string | null)[]): string[] {
  const out: string[] = [];
  for (const c of list) {
    const h = normalizeHex(c);
    if (h && !out.includes(h)) out.push(h);
  }
  return out;
}

async function apiFootball(path: string): Promise<any> {
  if (!API_FOOTBALL) return null;
  try {
    const res = await fetch(`https://v3.football.api-sports.io${path}`, {
      headers: { "x-apisports-key": API_FOOTBALL },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

/* ─────────────── Inteligência Direta (Gemini 2.5 Flash + Search) ─────────────── */

async function aiEnrichDirect(clubName: string, country: string | null): Promise<any> {
  const empty = {
    cor_primaria: null,
    cor_secundaria: null,
    cor_terciaria: null,
    cor_quarta: null,
    mascote: null,
    tem_feminino: null,
    nome_curto: null,
  };

  if (!GEMINI_API_KEY) {
    console.error("[AI] GEMINI_API_KEY ausente.");
    return empty;
  }

  const systemPrompt =
    "Você é um pesquisador sênior de futebol. Sua missão é precisão absoluta usando Google Search. Retorne APENAS JSON puro.";

  const userPrompt = `Investigue o clube "${clubName}" (${country || "Brasil"}).
  
  MISSÃO OBRIGATÓRIA:
  1. CORES (Jersey): HEX do uniforme titular. Vila Nova = Bicolor; Brusque = Quadricolor (Amarelo, Verde, Vermelho, Branco). Ignore bordas de escudo.
  2. MASCOTE: Nome oficial (Ex: Brusque é "Marreco"). Não retorne null se existir na Wikipedia.
  3. FEMININO: Verifique se há time PROFISSIONAL feminino ativo em 2026.
  4. APELIDO: Nome curto popular.

  RETORNE EXCLUSIVAMENTE JSON:
  {"cor_primaria": "#HEX", "cor_secundaria": "#HEX", "cor_terciaria": "#HEX/null", "cor_quarta": "#HEX/null", "mascote": "STRING", "tem_feminino": boolean, "nome_curto": "STRING"}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          tools: [{ google_search: {} }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        }),
      },
    );

    const json = await res.json();
    const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) return empty;

    const parsed = JSON.parse(rawText.replace(/```json|```/g, "").trim());

    return {
      cor_primaria: normalizeHex(parsed.cor_primaria),
      cor_secundaria: normalizeHex(parsed.cor_secundaria),
      cor_terciaria: normalizeHex(parsed.cor_terciaria),
      cor_quarta: normalizeHex(parsed.cor_quarta),
      mascote: parsed.mascote && !/^null$/i.test(parsed.mascote) ? parsed.mascote : null,
      tem_feminino: typeof parsed.tem_feminino === "boolean" ? parsed.tem_feminino : null,
      nome_curto: parsed.nome_curto || null,
    };
  } catch (e) {
    console.error("[AI ERROR]", e);
    return empty;
  }
}

/* ─────────────── Division Helper ─────────────── */

async function getCurrentDivision(teamId: number): Promise<string | null> {
  const j = await apiFootball(`/leagues?team=${teamId}&current=true`);
  const leagues = j?.response || [];
  if (!leagues.length) return null;
  const main = leagues.find((l: any) => l.league?.type === "League") || leagues[0];
  return main?.league?.name || null;
}

/* ─────────────── Handler Principal ─────────────── */

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { club_name, api_id } = await req.json();
    if (!club_name) throw new Error("club_name é obrigatório");

    console.log(`[ENRICH 91.0] → ${club_name}`);

    // 1. API-Football (Dados Técnicos Inalterados)
    const teamUrl = api_id ? `/teams?id=${api_id}` : `/teams?search=${encodeURIComponent(club_name)}`;
    const tJson = await apiFootball(teamUrl);
    const teamInfo = tJson?.response?.[0] || null;

    const team = teamInfo?.team || {};
    const venue = teamInfo?.venue || {};

    let division = team.id ? await getCurrentDivision(team.id) : null;

    // 2. IA Direta (Sem Lovable Gateway)
    const ai = await aiEnrichDirect(team.name || club_name, team.country || "Brasil");

    const cores = uniqHex([ai.cor_primaria, ai.cor_secundaria, ai.cor_terciaria, ai.cor_quarta]);

    // 3. Persistência (Unificação de Colunas)
    const payload = {
      nome: team.name || club_name,
      nome_curto: ai.nome_curto || team.code || null,
      pais: team.country || "Brasil",
      cidade: venue.city || "Brasil",
      fundado: team.founded || null,
      escudo_url: team.logo || null,
      estadio_nome: venue.name || null,
      estadio_cidade: venue.city || null,
      estadio_capacidade: venue.capacity || null,
      mascote: ai.mascote || null,
      cor_primaria: cores[0] || null,
      cor_secundaria: cores[1] || null,
      cor_terciaria: cores[2] || null,
      cor_quarta: cores[3] || null,
      division: division || null,
      feminino: ai.tem_feminino ?? false, // Mantém compatibilidade com a coluna antiga
      tem_feminino: ai.tem_feminino ?? false, // Garante preenchimento na nova
      api_id: team.id ? String(team.id) : api_id ? String(api_id) : null,
      atualizado_em: new Date().toISOString(),
    };

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
    console.error("[CRITICAL]", err);
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});

/**
 * [RODAPÉ TÉCNICO]
 * Versão: 91.0
 * - Conexão: Substituído Lovable Gateway por chamada direta à API do Gemini (Google).
 * - Grounding: Google Search ativado nativamente para evitar mascotes nulos (Ex: Marreco do Brusque).
 * - Persistência: Sincronização entre as colunas 'feminino' e 'tem_feminino'.
 * - Segurança: Mapeamento de dados técnicos da API Football preservado 100%.
 */
