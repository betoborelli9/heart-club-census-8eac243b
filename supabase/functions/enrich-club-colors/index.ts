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
import UPNG from "npm:upng-js@2.1.0";

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

function normalizeName(value: unknown): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/* ═══════════════════════════════════════════════════════════
   COR PELO ESCUDO (plano B quando a IA/Google não acha a cor do clube)
   Lê o escudo (PNG), ignora fundo transparente e pega as cores que mais
   aparecem (dominantes de matiz); branco/preto só entram se forem relevantes.
   Funciona para clube de QUALQUER lugar do mundo. Confiança: baixa.
═══════════════════════════════════════════════════════════ */
function rgbToHsv(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max ? d / max : 0, v: max };
}

function colorsFromRgba(rgba: Uint8Array): string[] {
  const bins = new Map<string, { n: number; r: number; g: number; b: number }>();
  let opaque = 0;
  const add = (key: string, r: number, g: number, b: number) => {
    const e = bins.get(key) || { n: 0, r: 0, g: 0, b: 0 };
    e.n++; e.r += r; e.g += g; e.b += b;
    bins.set(key, e);
  };
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] < 200) continue;
    const r = rgba[i], g = rgba[i + 1], b = rgba[i + 2];
    opaque++;
    const { h, s, v } = rgbToHsv(r, g, b);
    if (v < 0.22) add("preto", r, g, b);
    else if (s < 0.14 && v > 0.82) add("branco", r, g, b);
    else if (s < 0.14) add("cinza", r, g, b);
    else add("h" + Math.floor(h / 20) + (v < 0.5 ? "d" : "l"), r, g, b);
  }
  if (!opaque) return [];
  const list = [...bins.entries()].map(([k, e]) => ({
    k, share: e.n / opaque, rgb: [e.r / e.n, e.g / e.n, e.b / e.n], h: k.startsWith("h") ? parseInt(k.slice(1)) * 20 : -1,
  }));
  const far = (a: number, b: number) => { const d = Math.abs(a - b); return Math.min(d, 360 - d) >= 40; };
  const merged: { share: number; rgb: number[]; h: number }[] = [];
  for (const c of list.filter((x) => x.k.startsWith("h")).sort((a, b) => b.share - a.share)) {
    const m = merged.find((x) => !far(x.h, c.h));
    if (m) {
      const t = m.share + c.share;
      m.rgb = m.rgb.map((v, i) => (v * m.share + c.rgb[i] * c.share) / t);
      m.share = t;
    } else merged.push({ share: c.share, rgb: [...c.rgb], h: c.h });
  }
  const white = list.find((x) => x.k === "branco");
  const black = list.find((x) => x.k === "preto");
  const cands: { share: number; rgb: number[] }[] = [];
  for (const m of merged) if (m.share >= 0.06) cands.push({ share: m.share, rgb: m.rgb });
  if (white && white.share >= 0.1) cands.push({ share: white.share, rgb: [255, 255, 255] });
  if (black && black.share >= 0.12) cands.push({ share: black.share, rgb: [17, 17, 17] });
  cands.sort((a, b) => b.share - a.share);
  const hex = (c: number[]) =>
    "#" + c.map((x) => Math.round(x).toString(16).padStart(2, "0")).join("").toUpperCase();
  return cands.slice(0, 3).map((c) => hex(c.rgb));
}

async function colorsFromCrest(url: string | null | undefined): Promise<string[]> {
  if (!url) return [];
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const img = UPNG.decode(await res.arrayBuffer());
    return colorsFromRgba(new Uint8Array(UPNG.toRGBA8(img)[0]));
  } catch (e) {
    console.error("[CREST] falhou:", (e as Error).message);
    return [];
  }
}

function isSafeClubQuery(value: unknown): boolean {
  const raw = String(value || "").trim();
  if (raw.length < 3 || raw.length > 80) return false;
  if (!/[A-Za-zÀ-ÿ]/.test(raw)) return false;
  if (/^(selecione|seu clube|novo time|teste|test|xxx|n\/a|na|nenhum|sem nome|undefined|null)$/i.test(raw)) return false;
  return true;
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
        model: "google/gemini-2.5-pro",
        messages: [{ role: "user", content: buildPrompt(clubName, country) }],
        tools: [{ type: "google_search" }],
        temperature: 0,
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

    const { club_name, api_id, crest_only, logo_url } = await req.json();

    // Diagnóstico (não grava nada): mostra as cores que o escudo daria.
    if (crest_only && logo_url) {
      return new Response(JSON.stringify({ crest_colors: await colorsFromCrest(String(logo_url)) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!club_name && !api_id) {
      return new Response(JSON.stringify({ success: false, error: "club_name ou api_id obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (club_name && !isSafeClubQuery(club_name)) {
      return new Response(JSON.stringify({ success: false, error: "clube inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 🛡️ DEDUP: procura por api_id E por nome normalizado (sem acento/caixa)
    let existing: any = null;
    if (api_id) {
      const { data } = await supabase
        .from("clubes_cache")
        .select("*")
        .eq("api_id", String(api_id))
        .maybeSingle();
      if (data) existing = data;
    }
    if (!existing && club_name) {
      const norm = normalizeName(club_name);
      const { data: rows } = await supabase
        .from("clubes_cache")
        .select("*")
        .or(`nome.ilike.${club_name},nome_curto.ilike.${club_name}`);
      existing = (rows || []).find((r: any) => normalizeName(r.nome) === norm || normalizeName(r.nome_curto) === norm) || null;
    }
    // Clube já salvo SEM cor volta a ser enriquecido (antes ficava "preso" sem cor para sempre).
    // Para não gastar IA à toa, só tenta de novo se a última tentativa foi há mais de 10 minutos.
    const semCor = !!existing && !existing.cor_primaria;
    const tentouAgora =
      !!existing?.atualizado_em && Date.now() - new Date(existing.atualizado_em).getTime() < 10 * 60 * 1000;
    if (existing && (existing.api_id || existing.escudo_url) && (!semCor || tentouAgora)) {
      return new Response(JSON.stringify({ success: true, club: existing, source: "cache" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[ENRICH 100.0] → ${club_name} (api_id=${api_id || "n/a"})`);

    /* 1️⃣ API-Football: dados técnicos */
    const idParaBusca = api_id || existing?.api_id || null;
    const teamUrl = idParaBusca ? `/teams?id=${idParaBusca}` : `/teams?search=${encodeURIComponent(club_name)}`;
    const tJson = await apiFootball(teamUrl);
    const teamInfo = tJson?.response?.[0] || null;
    const team = teamInfo?.team || {};
    const venue = teamInfo?.venue || {};

    if (!team?.id || !team?.name) {
      return new Response(JSON.stringify({ success: false, error: "clube não encontrado na API-Football", not_found: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!api_id && club_name && normalizeName(team.name) !== normalizeName(club_name)) {
      return new Response(JSON.stringify({ success: false, error: "clube não confirmado pela API-Football", not_found: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    let cores = dedupeHex([
      ai?.cor_primaria,
      ai?.cor_secundaria,
      ai?.cor_terciaria,
      ai?.cor_quarta,
    ]).slice(0, 4);
    let coresFonte: string | null = cores.length ? "ia_google" : null;
    let coresConfianca: string | null = cores.length ? "media" : null;

    // Plano B: a IA/Google não achou (clube pequeno ou de mercado remoto) → cores do escudo.
    // Também completa quando a IA devolveu só 1 cor (clube bicolor/tricolor ficaria incompleto).
    if (cores.length < 2) {
      const doEscudo = dedupeHex(await colorsFromCrest(team.logo));
      const dist = (a: string, b: string) => {
        const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
        const x = p(a), y = p(b);
        return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
      };
      const junto = [...cores];
      for (const c of doEscudo) {
        if (junto.length >= 3) break;
        if (junto.every((j) => dist(j, c) > 90)) junto.push(c);
      }
      if (junto.length > cores.length) {
        coresFonte = cores.length ? "ia_google+escudo" : "escudo";
        coresConfianca = "baixa";
        cores = junto;
      }
    }

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
      cores_fonte: coresFonte,
      cores_confianca: coresConfianca,
      division: division || ai?.division || null,
      feminino: tem_feminino,
      tem_feminino,
      api_id: team.id ? String(team.id) : (api_id ? String(api_id) : null),
      atualizado_em: new Date().toISOString(),
    };

    console.log(`[ENRICH 100.0] payload:`, JSON.stringify(payload));

    // 🛡️ Anti-duplicidade: se já existe (mesmo nome normalizado OU mesmo api_id),
    // faz UPDATE pelo id; caso contrário, INSERT. Não usa upsert por "nome" (case/acento sensível).
    let dupExisting: any = existing || null;
    if (!dupExisting) {
      const norm = normalizeName(finalName);
      const { data: rows } = await supabase
        .from("clubes_cache")
        .select("id, nome, api_id")
        .or(`api_id.eq.${payload.api_id ?? "__none__"},nome.ilike.${finalName}`);
      dupExisting = (rows || []).find((r: any) =>
        (payload.api_id && r.api_id && String(r.api_id) === String(payload.api_id)) ||
        normalizeName(r.nome) === norm
      ) || null;
    }

    let data: any, error: any;
    if (dupExisting?.id) {
      ({ data, error } = await supabase
        .from("clubes_cache")
        .update(payload)
        .eq("id", dupExisting.id)
        .select()
        .single());
    } else {
      ({ data, error } = await supabase
        .from("clubes_cache")
        .insert(payload)
        .select()
        .single());
    }

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
