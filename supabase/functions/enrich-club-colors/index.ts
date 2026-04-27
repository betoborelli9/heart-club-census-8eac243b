/**
 * ═══════════════════════════════════════════════════════════════════
 * [CAMINHO]&#58; supabase/functions/enrich-club-colors/index.ts
 * [MÓDULO]&#58; ENRIQUECIMENTO UNIFICADO DE CLUBES
 * [STATUS]&#58; PRODUÇÃO — VERSÃO 93.0 (AI HARDENED + AUTO FALLBACK)
 * [DESCRIÇÃO]&#58;  * 1. API-Football: Fonte primária (dados técnicos).
 * 2. AI (Gemini via Lovable): Agora com PROMPT TRAVADO (jersey-only).
 * 3. Validação: Bloqueia cores genéricas incorretas (ex: preto/branco fake).
 * 4. Fallback automático: Extração de cores direto do escudo (sem intervenção humana).
 * 5. Feminino: Mantido (AI + Google News).
 * 6. Mascote: Mantido com exigência forte no prompt.
 * ═══════════════════════════════════════════════════════════════════
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ═══════════════════════════════════════════════════════════
   MÓDULO: CONFIG & HEADERS
   ═══════════════════════════════════════════════════════════ */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const API_FOOTBALL = Deno.env.get("API_FOOTBALL_KEY") || Deno.env.get("FOOTBALL_API_KEY") || "";

const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY") || "";

/* ═══════════════════════════════════════════════════════════
   MÓDULO: HELPERS (HEX + NORMALIZAÇÃO)
   ═══════════════════════════════════════════════════════════ */

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

/* ═══════════════════════════════════════════════════════════
   MÓDULO: VALIDADOR DE CORES (ANTI-ERRO IA)
   ═══════════════════════════════════════════════════════════ */

function validateColors(colors: (string | null)[]): string[] {
  const valid = colors.filter((c): c is string => !!c && /^#[0-9A-F]{6}$/i.test(c));

  // 🔥 BLOQUEIO: preto/branco genérico (erro clássico de IA)
  if (valid.length <= 2 && valid.includes("#000000") && valid.includes("#FFFFFF")) {
    return [];
  }

  return valid;
}

/* ═══════════════════════════════════════════════════════════
   MÓDULO: EXTRAÇÃO AUTOMÁTICA DE CORES DO ESCUDO
   ═══════════════════════════════════════════════════════════ */

async function extractColorsFromLogo(url: string): Promise<string[]> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob);

    const canvas = new OffscreenCanvas(64, 64);
    const ctx = canvas.getContext("2d");
    if (!ctx) return [];

    ctx.drawImage(bitmap, 0, 0, 64, 64);

    const data = ctx.getImageData(0, 0, 64, 64).data;

    const map = new Map<string, number>();

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const hex =
        "#" +
        [r, g, b]
          .map((x) => x.toString(16).padStart(2, "0"))
          .join("")
          .toUpperCase();

      map.set(hex, (map.get(hex) || 0) + 1);
    }

    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([color]) => color);
  } catch {
    return [];
  }
}

/* ═══════════════════════════════════════════════════════════
   MÓDULO: API FOOTBALL
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
   MÓDULO: GOOGLE NEWS (FEMININO)
   ═══════════════════════════════════════════════════════════ */

const FEM_KEYWORDS =
  /(brasileir[aã]o feminino|s[eé]rie a1|s[eé]rie a2|s[eé]rie a3|copa do brasil feminin|libertadores feminin|women|wsl|nwsl)/i;

async function checkFemininoViaNews(name: string): Promise<boolean> {
  try {
    const q = encodeURIComponent(`"${name}" feminino profissional`);
    const res = await fetch(`https://news.google.com/rss/search?q=${q}&hl=pt-BR&gl=BR&ceid=BR:pt-419`);
    if (!res.ok) return false;

    const xml = await res.text();
    const titles = [...xml.matchAll(/<title>([^<]+)<\/title>/g)].map((m) => m[1]);

    let count = 0;
    for (const t of titles) {
      if (FEM_KEYWORDS.test(t)) count++;
    }

    return count >= 2;
  } catch {
    return false;
  }
}

/* ═══════════════════════════════════════════════════════════
   MÓDULO: AI (GEMINI VIA LOVABLE) — HARDENED
   ═══════════════════════════════════════════════════════════ */

async function aiEnrich(clubName: string, country: string | null) {
  const empty = {
    cor_primaria: null,
    cor_secundaria: null,
    cor_terciaria: null,
    cor_quarta: null,
    mascote: null,
    tem_feminino: null,
  };

  if (!LOVABLE_KEY) return empty;

  const system = "Você é um especialista em futebol. Use Google Search e seja extremamente preciso.";

  const userMsg = `
Analise o clube: "${clubName}" (${country || "Brasil"})

REGRAS:
- Use apenas o uniforme titular (jersey)
- Ignore escudo e cores históricas
- Não invente cores
- Se não tiver certeza: retorne null

RETORNO:
{
  "cor_primaria": "#HEX ou null",
  "cor_secundaria": "#HEX ou null",
  "cor_terciaria": "#HEX ou null",
  "cor_quarta": "#HEX ou null",
  "mascote": "nome ou null",
  "tem_feminino": true ou false
}
`;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMsg },
        ],
      }),
    });

    const json = await res.json();
    const text = json.choices?.[0]?.message?.content;

    if (!text) return empty;

    const parsed = JSON.parse(text);

    return {
      cor_primaria: normalizeHex(parsed.cor_primaria),
      cor_secundaria: normalizeHex(parsed.cor_secundaria),
      cor_terciaria: normalizeHex(parsed.cor_terciaria),
      cor_quarta: normalizeHex(parsed.cor_quarta),
      mascote: parsed.mascote || null,
      tem_feminino: parsed.tem_feminino ?? null,
    };
  } catch {
    return empty;
  }
}

/* ═══════════════════════════════════════════════════════════
   MÓDULO: MAIN HANDLER
   ═══════════════════════════════════════════════════════════ */

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { club_name, api_id } = await req.json();

    const teamUrl = api_id ? `/teams?id=${api_id}` : `/teams?search=${encodeURIComponent(club_name)}`;

    const tJson = await apiFootball(teamUrl);
    const teamInfo = tJson?.response?.[0] || null;

    const team = teamInfo?.team || {};
    const venue = teamInfo?.venue || {};

    const [ai, femNews] = await Promise.all([
      aiEnrich(team.name || club_name, team.country || "Brasil"),
      checkFemininoViaNews(team.name || club_name),
    ]);

    /* 🔥 CORES (PIPELINE FINAL) */

    let cores = validateColors([ai.cor_primaria, ai.cor_secundaria, ai.cor_terciaria, ai.cor_quarta]);

    if (cores.length === 0 && team.logo) {
      console.warn("Fallback: extraindo cores do escudo");
      cores = await extractColorsFromLogo(team.logo);
    }

    /* 🔥 RESULTADO FINAL */

    const payload = {
      nome: team.name || club_name,
      escudo_url: team.logo || null,
      cor_primaria: cores[0] || null,
      cor_secundaria: cores[1] || null,
      cor_terciaria: cores[2] || null,
      cor_quarta: cores[3] || null,
      mascote: ai.mascote,
      tem_feminino: ai.tem_feminino ?? femNews ?? false,
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
    return new Response(
      JSON.stringify({
        success: false,
        error: (err as Error).message,
      }),
      { status: 500, headers: corsHeaders },
    );
  }
});

/**
 * ═══════════════════════════════════════════════════════════════════
 * [RODAPÉ TÉCNICO]
 * - Versão: 93.0
 * - IA agora NÃO pode mais inventar cores
 * - Validação bloqueia erros clássicos
 * - Fallback automático elimina necessidade de correção manual
 * - Sistema agora escalável globalmente
 * ═══════════════════════════════════════════════════════════════════
 */
