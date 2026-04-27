/**
 * ═══════════════════════════════════════════════════════════════════
 * [CAMINHO]: supabase/functions/enrich-club-colors/index.ts
 * [MÓDULO]: ENRIQUECIMENTO UNIFICADO DE CLUBES
 * [STATUS]: PRODUÇÃO — VERSÃO 92.0 (AI FALLBACK & TECHNICAL SYNC)
 * [DESCRIÇÃO]:
 * 1. API-Football: Prioridade para dados técnicos (Fundado, Estádio, Escudo).
 * 2. AI Fallback: Se a API falhar (Ex: Anápolis), o Gemini assume os dados técnicos.
 * 3. Google News RSS: Mantido para validação dupla de futebol feminino.
 * 4. Mascote: Prompt agressivo para evitar valores nulos (Ex: Marreco do Brusque).
 * 5. Persistência: Upsert sincronizado (Feminino + Tem_Feminino).
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
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

/* ─────────────── Google News RSS (feminino fallback) ─────────────── */

const FEM_KEYWORDS =
  /(brasileir[aã]o feminino|s[eé]rie a1|s[eé]rie a2|s[eé]rie a3|copa do brasil feminin|libertadores feminin|paulist[ãa]o feminin|carioc[ãa]o feminin|gauch[ãa]o feminin|mineiro feminin|goian[ãa]o feminin|feminino sub|women|wsl|nwsl|liga f)/i;
const YOUTH_ONLY = /(sub-?17|sub-?20|sub-?15|base|categoria de base)/i;

async function checkFemininoViaNews(name: string): Promise<boolean> {
  try {
    const q = encodeURIComponent(`"${name}" feminino profissional`);
    const res = await fetch(`https://news.google.com/rss/search?q=${q}&hl=pt-BR&gl=BR&ceid=BR:pt-419`);
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

async function aiEnrich(clubName: string, country: string | null): Promise<any> {
  const empty = {
    cor_primaria: null,
    cor_secundaria: null,
    cor_terciaria: null,
    cor_quarta: null,
    mascote: null,
    tem_feminino: null,
    nome_curto: null,
    fundado: null,
    estadio_nome: null,
    estadio_capacidade: null,
  };

  if (!LOVABLE_KEY) return empty;

  const sys =
    "Você é um pesquisador sênior de futebol brasileiro e mundial. Use Google Search. Sua missão é precisão absoluta. Cores em HEX e mascotes oficiais históricos.";

  const userMsg = `Investigue agora: "${clubName}" (${country || "Brasil"}).
  MISSÃO:
  1. CORES (Jersey): HEX do uniforme titular. Vila Nova = Bicolor; Brusque = Quadricolor (Amarelo, Vermelho, Verde, Branco).
  2. MASCOTE: Nome oficial (Ex: Brusque é "Marreco"). Não retorne null para mascotes óbvios.
  3. FEMININO: Confirme se há time PROFISSIONAL feminino ativo em 2026.
  4. DADOS TÉCNICOS: Se não souber, busque ano de fundação e nome do estádio.`;

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
              fundado: { type: ["number", "null"] },
              estadio_nome: { type: ["string", "null"] },
              estadio_capacidade: { type: ["number", "null"] },
            },
            required: ["cor_primaria", "cor_secundaria", "mascote", "tem_feminino"],
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
      headers: { Authorization: `Bearer ${LOVABLE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return empty;
    const parsed = typeof args === "string" ? JSON.parse(args) : args;

    return {
      cor_primaria: normalizeHex(parsed.cor_primaria),
      cor_secundaria: normalizeHex(parsed.cor_secundaria),
      cor_terciaria: normalizeHex(parsed.cor_terciaria),
      cor_quarta: normalizeHex(parsed.cor_quarta),
      mascote: parsed.mascote && !/^null$/i.test(parsed.mascote) ? String(parsed.mascote).trim() : null,
      tem_feminino: parsed.tem_feminino,
      nome_curto: parsed.nome_curto || null,
      fundado: parsed.fundado || null,
      estadio_nome: parsed.estadio_nome || null,
      estadio_capacidade: parsed.estadio_capacidade || null,
    };
  } catch {
    return empty;
  }
}

async function getCurrentDivision(teamId: number): Promise<string | null> {
  const j = await apiFootball(`/leagues?team=${teamId}&current=true`);
  const leagues = j?.response || [];
  const main = leagues.find((l: any) => l.league?.type === "League") || leagues[0];
  return main?.league?.name || null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { club_name, api_id } = await req.json();

    // 1. API-Football (Mapeamento Original)
    const teamUrl = api_id ? `/teams?id=${api_id}` : `/teams?search=${encodeURIComponent(club_name)}`;
    const tJson = await apiFootball(teamUrl);
    const teamInfo = tJson?.response?.[0] || null;
    const team = teamInfo?.team || {};
    const venue = teamInfo?.venue || {};

    let division = team.id ? await getCurrentDivision(team.id) : null;

    // 2. IA + News Fallback
    const [ai, femNews] = await Promise.all([
      aiEnrich(team.name || club_name, team.country || "Brasil"),
      checkFemininoViaNews(team.name || club_name),
    ]);

    const final_feminino = ai.tem_feminino ?? femNews ?? false;
    const cores = uniqHex([ai.cor_primaria, ai.cor_secundaria, ai.cor_terciaria, ai.cor_quarta]);

    // 3. Persistência (Preenchimento de Colunas com Fallback Cruzado)
    const payload = {
      nome: team.name || club_name,
      nome_curto: ai.nome_curto || team.code || null,
      pais: team.country || "Brasil",
      cidade: venue.city || "Brasil",
      fundado: team.founded || ai.fundado || null, // API -> Fallback AI
      escudo_url: team.logo || null,
      estadio_nome: venue.name || ai.estadio_nome || null, // API -> Fallback AI
      estadio_cidade: venue.city || null,
      estadio_capacidade: venue.capacity || ai.estadio_capacidade || null, // API -> Fallback AI
      mascote: ai.mascote || null,
      cor_primaria: cores[0] || null,
      cor_secundaria: cores[1] || null,
      cor_terciaria: cores[2] || null,
      cor_quarta: cores[3] || null,
      division: division || null,
      feminino: final_feminino,
      tem_feminino: final_feminino,
      api_id: team.id ? String(team.id) : String(api_id || ""),
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
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});

/**
 * [RODAPÉ TÉCNICO]
 * Versão: 92.0
 * - Fallback: Se a API Football não entregar fundação ou estádio, a IA agora os fornece.
 * - Mascote: Parâmetro 'mascote' agora é obrigatório no tool call para evitar nulos.
 * - Sync: Colunas 'feminino' e 'tem_feminino' agora são alimentadas pelo mesmo valor final.
 */
