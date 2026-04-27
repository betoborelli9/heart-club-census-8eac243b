/**
 * ═══════════════════════════════════════════════════════════════════
 * [CAMINHO]: supabase/functions/enrich-club-colors/index.ts
 * [MÓDULO]: ENRIQUECIMENTO UNIFICADO DE CLUBES
 * [STATUS]: PRODUÇÃO — VERSÃO 90.0 (FULL PIPELINE)
 * [DESCRIÇÃO]:
 *   1. API-Football: nome, nome_curto, país, cidade, fundado, escudo,
 *      estádio (nome/cidade/capacidade), divisão atual.
 *   2. API-Football (women search): detecta time feminino oficial.
 *   3. Lovable AI Gateway (Gemini 2.5 Flash) com Google Search grounding:
 *      cores HEX exatas (até 4), mascote e confirmação de feminino.
 *   4. Fallback Google News RSS para feminino.
 *   5. Persistência em clubes_cache (todas as colunas).
 * ═══════════════════════════════════════════════════════════════════
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const API_FOOTBALL = Deno.env.get("API_FOOTBALL_KEY") || Deno.env.get("FOOTBALL_API_KEY") || "";
const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY") || "";

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
    if (!res.ok) {
      console.warn(`[API-FOOTBALL] ${path} → ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.error(`[API-FOOTBALL ERROR] ${path}`, e);
    return null;
  }
}

/* ─────────────── Google News RSS (feminino fallback) ─────────────── */

const FEM_KEYWORDS =
  /(brasileir[aã]o feminino|s[eé]rie a1|s[eé]rie a2|s[eé]rie a3|copa do brasil feminin|libertadores feminin|paulist[ãa]o feminin|carioc[ãa]o feminin|gauch[ãa]o feminin|mineiro feminin|goian[ãa]o feminin|feminino sub|women|wsl|nwsl|liga f|primera (división|division) femenina)/i;
const YOUTH_ONLY = /(sub-?17|sub-?20|sub-?15|base|categoria de base)/i;

async function checkFemininoViaNews(name: string): Promise<boolean> {
  try {
    const q = encodeURIComponent(`"${name}" feminino`);
    const res = await fetch(
      `https://news.google.com/rss/search?q=${q}&hl=pt-BR&gl=BR&ceid=BR:pt-419`,
    );
    if (!res.ok) return false;
    const xml = await res.text();
    const titles = [...xml.matchAll(/<title>([^<]+)<\/title>/g)].map((m) => m[1]);
    let pro = 0;
    for (const t of titles) {
      if (FEM_KEYWORDS.test(t) && !YOUTH_ONLY.test(t)) pro++;
    }
    return pro >= 2;
  } catch {
    return false;
  }
}

/* ─────────────── Lovable AI (Gemini + Google Search) ─────────────── */

async function aiEnrich(clubName: string, country: string | null): Promise<{
  cor_primaria: string | null;
  cor_secundaria: string | null;
  cor_terciaria: string | null;
  cor_quarta: string | null;
  mascote: string | null;
  tem_feminino: boolean | null;
  nome_curto: string | null;
}> {
  const empty = {
    cor_primaria: null, cor_secundaria: null, cor_terciaria: null, cor_quarta: null,
    mascote: null, tem_feminino: null, nome_curto: null,
  };
  if (!LOVABLE_KEY) {
    console.warn("[AI] LOVABLE_API_KEY ausente — pulando IA");
    return empty;
  }

  const sys =
    "Você é um pesquisador especialista em clubes de futebol. Use buscas na web (Wikipedia, site oficial, Google) para responder com EXATIDÃO. Cores devem ser do UNIFORME TITULAR (tecido), em HEX #RRGGBB. NUNCA invente. Se não souber com certeza, retorne null.";

  const userMsg = `Clube: "${clubName}"${country ? ` (${country})` : ""}.

Preciso de:
1. cor_primaria, cor_secundaria, cor_terciaria, cor_quarta — cores OFICIAIS do uniforme titular em HEX (#RRGGBB). Ignore contornos de escudo, estrelas e enfeites. Se houver menos de 4 cores, devolva null nas restantes.
2. mascote — nome oficial do mascote (ex: "Tigre", "Porco", "Mengão"). Se não houver, null.
3. tem_feminino — true se o clube possui time PROFISSIONAL FEMININO ATIVO em competições oficiais (Brasileirão A1/A2/A3, estaduais femininos, WSL, NWSL, Liga F, etc.). Categorias de base (sub-17/sub-20) não contam.
4. nome_curto — apelido popular curto (ex: "Vila", "Galo", "Timão"). Se não houver, null.

Use Google Search para confirmar.`;

  const body = {
    model: "google/gemini-2.5-flash",
    messages: [
      { role: "system", content: sys },
      { role: "user", content: userMsg },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "registrar_clube",
          description: "Registra os dados verificados do clube",
          parameters: {
            type: "object",
            properties: {
              cor_primaria: { type: ["string", "null"] },
              cor_secundaria: { type: ["string", "null"] },
              cor_terciaria: { type: ["string", "null"] },
              cor_quarta: { type: ["string", "null"] },
              mascote: { type: ["string", "null"] },
              tem_feminino: { type: ["boolean", "null"] },
              nome_curto: { type: ["string", "null"] },
            },
            required: ["cor_primaria", "cor_secundaria", "tem_feminino"],
            additionalProperties: false,
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "registrar_clube" } },
  };

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const t = await res.text();
      console.error(`[AI] ${res.status} → ${t.slice(0, 300)}`);
      return empty;
    }
    const json = await res.json();
    const call = json.choices?.[0]?.message?.tool_calls?.[0];
    const args = call?.function?.arguments;
    if (!args) return empty;
    const parsed = typeof args === "string" ? JSON.parse(args) : args;
    return {
      cor_primaria: normalizeHex(parsed.cor_primaria),
      cor_secundaria: normalizeHex(parsed.cor_secundaria),
      cor_terciaria: normalizeHex(parsed.cor_terciaria),
      cor_quarta: normalizeHex(parsed.cor_quarta),
      mascote:
        parsed.mascote && String(parsed.mascote).trim() && !/^null$/i.test(String(parsed.mascote).trim())
          ? String(parsed.mascote).trim()
          : null,
      tem_feminino: typeof parsed.tem_feminino === "boolean" ? parsed.tem_feminino : null,
      nome_curto: parsed.nome_curto && String(parsed.nome_curto).trim() ? String(parsed.nome_curto).trim() : null,
    };
  } catch (e) {
    console.error("[AI ERROR]", e);
    return empty;
  }
}

/* ─────────────── divisão atual ─────────────── */

const TIER_HINTS = [
  "Serie A", "Série A", "Serie B", "Série B", "Serie C", "Série C", "Serie D", "Série D",
  "Brasileirão", "Premier League", "La Liga", "Bundesliga", "Ligue 1", "Serie A TIM",
  "Eredivisie", "Primeira Liga", "MLS", "Liga MX", "Championship",
];

async function getCurrentDivision(teamId: number): Promise<string | null> {
  const j = await apiFootball(`/leagues?team=${teamId}&current=true`);
  const leagues: any[] = j?.response || [];
  if (!leagues.length) return null;
  // Prioriza ligas nacionais com nome conhecido
  const main =
    leagues.find((l) => l.league?.type === "League" && TIER_HINTS.some((t) => l.league.name?.includes(t))) ||
    leagues.find((l) => l.league?.type === "League") ||
    leagues[0];
  return main?.league?.name || null;
}

/* ─────────────── feminino via API-Football ─────────────── */

async function checkFemininoViaApi(clubName: string): Promise<boolean> {
  // API-Football tem times femininos com nome contendo "Women" / "Feminino" / "(W)"
  const queries = [`${clubName} women`, `${clubName} feminino`, `${clubName} (W)`];
  for (const q of queries) {
    const j = await apiFootball(`/teams?search=${encodeURIComponent(q)}`);
    const teams: any[] = j?.response || [];
    const hit = teams.find((t) => {
      const n = (t?.team?.name || "").toLowerCase();
      const base = clubName.toLowerCase();
      return (
        (n.includes("women") || n.includes("feminino") || n.includes("(w)") || n.includes(" w ")) &&
        // mesma raiz do nome
        n.replace(/(women|feminino|\(w\))/gi, "").trim().includes(base.split(" ")[0])
      );
    });
    if (hit) return true;
  }
  return false;
}

/* ─────────────── handler ─────────────── */

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { club_name, api_id } = await req.json();
    if (!club_name || typeof club_name !== "string") {
      throw new Error("club_name é obrigatório");
    }

    console.log(`[ENRICH 90.0] → ${club_name} (api_id=${api_id ?? "—"})`);

    /* 1. API-Football: dados técnicos completos */
    const teamUrl = api_id
      ? `/teams?id=${encodeURIComponent(api_id)}`
      : `/teams?search=${encodeURIComponent(club_name)}`;
    const tJson = await apiFootball(teamUrl);
    const teamInfo = tJson?.response?.[0] || null;

    const team = teamInfo?.team || {};
    const venue = teamInfo?.venue || {};

    let division: string | null = null;
    if (team?.id) {
      division = await getCurrentDivision(team.id);
    }

    /* 2. Feminino: API-Football + RSS fallback */
    const [femApi, femNews] = await Promise.all([
      checkFemininoViaApi(team?.name || club_name),
      checkFemininoViaNews(team?.name || club_name),
    ]);
    const femFromSources = femApi || femNews;

    /* 3. IA: cores + mascote + nome_curto + confirmação feminino */
    const ai = await aiEnrich(team?.name || club_name, team?.country || null);

    const tem_feminino =
      ai.tem_feminino === true ? true : femFromSources ? true : ai.tem_feminino === false ? false : false;

    const cores = uniqHex([ai.cor_primaria, ai.cor_secundaria, ai.cor_terciaria, ai.cor_quarta]);

    /* 4. Persistência (TODAS as colunas do clubes_cache) */
    const payload = {
      nome: team?.name || club_name,
      nome_curto: ai.nome_curto || team?.code || null,
      pais: team?.country || "Brasil",
      cidade: venue?.city || team?.country || "Brasil",
      fundado: team?.founded ?? null,
      escudo_url: team?.logo || null,
      estadio_nome: venue?.name || null,
      estadio_cidade: venue?.city || null,
      estadio_capacidade: venue?.capacity ?? null,
      mascote: ai.mascote || null,
      cor_primaria: cores[0] || null,
      cor_secundaria: cores[1] || null,
      cor_terciaria: cores[2] || null,
      cor_quarta: cores[3] || null,
      division: division || null,
      feminino: tem_feminino,
      tem_feminino: tem_feminino,
      api_id: team?.id ? String(team.id) : api_id ? String(api_id) : null,
      atualizado_em: new Date().toISOString(),
    };

    console.log(`[ENRICH 90.0] payload:`, JSON.stringify(payload));

    const { data, error } = await supabase
      .from("clubes_cache")
      .upsert(payload, { onConflict: "nome" })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({
        success: true,
        club: data,
        sources: {
          api_football: !!teamInfo,
          ai: !!LOVABLE_KEY,
          feminino_api: femApi,
          feminino_news: femNews,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[CRITICAL]", err);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
