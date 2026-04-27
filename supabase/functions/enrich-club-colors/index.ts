/**
 * ═══════════════════════════════════════════════════════════════════
 * [CAMINHO]: supabase/functions/enrich-club-colors/index.ts
 * [MÓDULO]: ENRIQUECIMENTO UNIFICADO DE CLUBES
 * [STATUS]: PRODUÇÃO — VERSÃO 90.0 (FULL PIPELINE)
 * [DESCRIÇÃO]:
 *   1. API-Football: nome, nome_curto, país, cidade, fundado, escudo,
 *      estádio (nome/cidade/capacidade), divisão atual.
 *   2. API-Football (women search): detecta time feminino oficial.
 *   3. Gemini direto com Google Search + fontes públicas:
 *      cores HEX oficiais/tradicionais (até 4), sem custo Lovable no bloco de cores.
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
const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") || "";
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

/* ─────────────── Gemini direto + bloco confiável de cores ─────────────── */

type AIResult = {
  cor_primaria: string | null;
  cor_secundaria: string | null;
  cor_terciaria: string | null;
  cor_quarta: string | null;
  mascote: string | null;
  tem_feminino: boolean | null;
  nome_curto: string | null;
};

const EMPTY_AI: AIResult = {
  cor_primaria: null, cor_secundaria: null, cor_terciaria: null, cor_quarta: null,
  mascote: null, tem_feminino: null, nome_curto: null,
};

type ColorEvidence = {
  colors: string[];
  source: string;
  confidence: number;
};

const CANONICAL_HEX: Record<string, string> = {
  azul: "#006EB6", blue: "#006EB6", "azul-marinho": "#001F5B", navy: "#001F5B",
  branco: "#FFFFFF", white: "#FFFFFF", preto: "#000000", black: "#000000",
  vermelho: "#E30613", red: "#E30613", verde: "#009640", green: "#009640",
  amarelo: "#FFDD00", yellow: "#FFDD00", dourado: "#D4AF37", gold: "#D4AF37",
  grená: "#7A0019", grena: "#7A0019", vinho: "#7A0019", bordo: "#7A0019", bordeaux: "#7A0019",
  laranja: "#FF6600", orange: "#FF6600", roxo: "#552583", purple: "#552583",
  celeste: "#87CEEB", cinza: "#808080", gray: "#808080", grey: "#808080", rosa: "#FF69B4", pink: "#FF69B4",
};

const COLOR_NAME_HEX: Array<[string, string]> = [
  ["azul-marinho", "#001F5B"], ["navy", "#001F5B"], ["azul", "#006EB6"], ["blue", "#006EB6"],
  ["branco", "#FFFFFF"], ["white", "#FFFFFF"],
  ["preto", "#000000"], ["black", "#000000"],
  ["vermelho", "#E30613"], ["red", "#E30613"],
  ["verde", "#009640"], ["green", "#009640"],
  ["amarelo", "#FFDD00"], ["yellow", "#FFDD00"],
  ["dourado", "#D4AF37"], ["gold", "#D4AF37"], ["golden", "#D4AF37"],
  ["grená", "#7A0019"], ["grena", "#7A0019"], ["vinho", "#7A0019"], ["bordô", "#7A0019"], ["bordeaux", "#7A0019"], ["burgundy", "#7A0019"], ["maroon", "#7A0019"], ["claret", "#7A0019"],
  ["laranja", "#FF6600"], ["orange", "#FF6600"],
  ["roxo", "#552583"], ["purple", "#552583"],
  ["celeste", "#87CEEB"], ["sky blue", "#87CEEB"], ["sky-blue", "#87CEEB"],
  ["cinza", "#808080"], ["gray", "#808080"], ["grey", "#808080"],
  ["rosa", "#FF69B4"], ["pink", "#FF69B4"],
];

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function slugify(value: string): string {
  return stripAccents(value)
    .toLowerCase()
    .replace(/\b(futebol clube|football club|esporte clube|sport club|soccer club)\b/g, "")
    .replace(/\b(fc|f\.c\.|sc|s\.c\.|ec|e\.c\.|afc|cf|cd|ac)\b/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function plainText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#8211;|&ndash;/gi, "-")
    .replace(/&#8212;|&mdash;/gi, "-")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "HeartClubBot/1.0 club-color-verification" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function extractHexColors(text: string): string[] {
  return uniqHex([...(text.matchAll(/#[0-9a-fA-F]{6}/g))].map((m) => m[0])).slice(0, 4);
}

function colorsFromNames(fragment: string): string[] {
  const normalized = stripAccents(fragment).toLowerCase();
  const found: Array<{ index: number; hex: string }> = [];

  for (const [name, hex] of COLOR_NAME_HEX) {
    const safeName = stripAccents(name).toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(^|[^a-z0-9])${safeName}([^a-z0-9]|$)`, "i");
    const match = normalized.match(re);
    if (match?.index !== undefined) found.push({ index: match.index, hex });
  }

  return uniqHex(found.sort((a, b) => a.index - b.index).map((item) => item.hex)).slice(0, 4);
}

function colorsFromNamesList(names: unknown): string[] {
  if (!Array.isArray(names)) return [];
  const expanded = names.flatMap((name) => {
    if (typeof name !== "string") return null;
    const key = stripAccents(name).toLowerCase().trim();
    return CANONICAL_HEX[key] || colorsFromNames(name);
  });
  return uniqHex(expanded).slice(0, 4);
}

function extractOfficialColorPhrase(text: string): string | null {
  const patterns = [
    /(cores\s+oficiais|official\s+colou?rs|team\s+colou?rs|club\s+colou?rs)\s*[:\-–]?\s*([^.;\n]{3,180})/i,
    /(cores\s+do\s+clube|quatro\s+cores\s+do\s+clube|tr[eê]s\s+cores\s+do\s+clube)\s*[:\-–]?\s*([^.;\n]{3,180})/i,
    /(colou?rs\s+are|colors\s+are|cores\s+s[aã]o)\s*([^.;\n]{3,180})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[2]) return match[2];
  }
  return null;
}

function evidenceFromText(text: string, source: string, preferHex: boolean): ColorEvidence | null {
  const clean = plainText(text);
  const section = clean.slice(0, 6000);
  const phrase = extractOfficialColorPhrase(section);
  const sourceConfidence = source.includes("site oficial do clube")
    ? 99
    : source.includes("Wikipedia")
      ? 98
    : source.includes("Federação") || source.includes("oficial")
      ? 97
      : source.includes("teamcolorcodes.com")
        ? 94
        : source.includes("brandcolorcode.com")
          ? 82
          : 76;

  if (phrase) {
    const named = colorsFromNames(phrase);
    if (named.length) return { colors: named, source, confidence: sourceConfidence };
  }

  const hexes = preferHex ? extractHexColors(section) : [];
  if (hexes.length) return { colors: hexes, source, confidence: sourceConfidence };

  return null;
}

function clubSection(text: string, clubName: string): string | null {
  const clean = plainText(text);
  const normalized = stripAccents(clean).toLowerCase();
  const needle = stripAccents(clubName).toLowerCase();
  const firstWord = needle.split(/\s+/).find((w) => w.length > 3) || needle;
  const index = normalized.indexOf(needle) >= 0 ? normalized.indexOf(needle) : normalized.indexOf(firstWord);
  if (index < 0) return null;
  return clean.slice(index, index + 2200);
}

function officialSiteFromSection(section: string): string | null {
  const siteMatch = section.match(/Site:\s*(?:\[[^\]]+\]\()?((?:https?:\/\/|www\.)[^\s)\]]+)/i);
  const links = [...section.matchAll(/(?:https?:\/\/|www\.)[^\s)\]]+/gi)].map((m) => m[0]);
  const raw = siteMatch?.[1] || links.find((link) => !/\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(link));
  if (!raw) return null;
  const url = raw.replace(/[.,;]+$/g, "");
  return url.startsWith("http") ? url : `https://${url}`;
}

async function officialClubSiteEvidence(siteUrl: string, clubName: string): Promise<ColorEvidence | null> {
  const root = siteUrl.replace(/\/$/, "");
  const urls = [...new Set([root, `${root}/o-clube/`, `${root}/clube/`, `${root}/historia/`, `${root}/historia-do-clube/`])];
  for (const url of urls) {
    const text = await fetchText(url);
    if (!text) continue;
    const evidence = evidenceFromText(text, `${url} (site oficial do clube)`, false);
    if (evidence?.colors.length) return evidence;
  }
  return null;
}

async function wikipediaEvidence(clubName: string): Promise<ColorEvidence | null> {
  const languages = ["pt", "en", "es"];
  const queries = [`${clubName} futebol clube`, `${clubName} football club`, clubName];

  try {
    for (const lang of languages) {
      for (const query of queries) {
        const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
        const searchText = await fetchText(searchUrl);
        if (!searchText) continue;

        const searchJson = JSON.parse(searchText || "{}");
        const titles = (searchJson?.query?.search || [])
          .map((item: { title?: string }) => item.title)
          .filter((title: unknown): title is string => typeof title === "string")
          .slice(0, 3);

        for (const title of titles) {
          const extractUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&titles=${encodeURIComponent(title)}&format=json&origin=*`;
          const extractText = await fetchText(extractUrl);
          if (!extractText) continue;

          const extractJson = JSON.parse(extractText || "{}");
          const pages = Object.values(extractJson?.query?.pages || {}) as Array<{ extract?: string }>;
          const extract = pages.map((page) => page.extract || "").join("\n");
          const evidence = evidenceFromText(extract, `Wikipedia ${lang}: ${title}`, false);
          if (evidence?.colors.length) return evidence;
        }
      }
    }
  } catch (e) {
    console.warn(`[WIKIPEDIA COLOR ERROR] ${clubName}`, e);
  }
  return null;
}

async function researchColorsFromWeb(clubName: string, country: string | null): Promise<ColorEvidence | null> {
  const base = slugify(clubName);
  const compact = base.replace(/-(fc|sc|ec|cf|cd|ac)$/i, "");
  const candidates = [...new Set([
    `https://teamcolorcodes.com/${base}-color-codes/`,
    `https://teamcolorcodes.com/${compact}-color-codes/`,
    `https://www.brandcolorcode.com/${base}`,
    `https://www.brandcolorcode.com/${compact}`,
    `https://www.brandcolorcode.com/${base}-fc`,
    `https://www.brandcolorcode.com/${compact}-fc`,
  ])];

  const [wikiEvidence, pages] = await Promise.all([
    wikipediaEvidence(clubName),
    Promise.all(candidates.map(async (url) => ({ url, text: await fetchText(url) }))),
  ]);
  const evidences = pages
    .filter((page): page is { url: string; text: string } => !!page.text)
    .map((page) => evidenceFromText(page.text, page.url, true))
    .filter((item): item is ColorEvidence => !!item);
  if (wikiEvidence) evidences.push(wikiEvidence);

  if (country && /brazil|brasil/i.test(country)) {
    const fcfText = await fetchText("https://fcf.com.br/clubes-filiados/");
    const section = fcfText ? clubSection(fcfText, clubName) : null;
    const officialSite = section ? officialSiteFromSection(section) : null;
    const siteEvidence = officialSite ? await officialClubSiteEvidence(officialSite, clubName) : null;
    if (siteEvidence) evidences.push(siteEvidence);
    const fcfEvidence = section ? evidenceFromText(section, "FCF - Federação Catarinense de Futebol (oficial)", false) : null;
    if (fcfEvidence) evidences.push(fcfEvidence);
  }

  const best = evidences.sort((a, b) => b.confidence - a.confidence || b.colors.length - a.colors.length)[0] || null;
  if (best) console.log(`[COLOR SOURCE] ${clubName} → ${best.colors.join(", ")} (${best.source})`);
  return best;
}

function buildGeminiPrompt(clubName: string, country: string | null): string {
  return `Você é a IA de dados esportivos do Heart Club. Use Google Search obrigatoriamente para pesquisar as cores oficiais/tradicionais do clube consultado.

CLUBE: ${clubName}${country ? `\nPAÍS: ${country}` : ""}

Faça pesquisas equivalentes a:
1. "quais são as cores do clube ${clubName}"
2. "${clubName} cores oficiais futebol"
3. "${clubName} official club colours football"
4. "${clubName} home kit colors"

Regras críticas:
- Priorize site oficial, federação/liga, Wikipedia/Wikidata e resultados diretos do Google sobre memória interna.
- Retorne TODAS as cores oficiais/tradicionais do clube ou do uniforme titular principal, até 4 cores.
- Se o clube for conhecido como bicolor, retorne 2; tricolor, 3; quadricolor, 4.
- Não use cores de contorno do escudo, estrela, sombra, letra, patrocínio, fabricante, goleiro ou uniforme alternativo.
- Não omita branco/preto quando fizerem parte real da camisa/tradição do clube.
- O HEX pode ser aproximado canônico da cor quando a fonte informa apenas o nome da cor.

Retorne EXCLUSIVAMENTE JSON puro:
{
  "cor_primaria": "#RRGGBB ou null",
  "cor_secundaria": "#RRGGBB ou null",
  "cor_terciaria": "#RRGGBB ou null",
  "cor_quarta": "#RRGGBB ou null",
  "nomes_cores": ["nome das cores oficiais na ordem encontrada"],
  "mascote": "string ou null",
  "tem_feminino": true,
  "nome_curto": "string ou null"
}`;
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const clean = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(clean.slice(start, end + 1));
  } catch {
    try {
      return JSON.parse(clean.slice(start, end + 1).replace(/,\s*}/g, "}").replace(/,\s*]/g, "]"));
    } catch {
      return null;
    }
  }
}

function normalizeAIResult(parsed: Record<string, unknown>): AIResult {
  const namedColors = colorsFromNamesList(parsed.nomes_cores);
  const hexColors = uniqHex([
    normalizeHex(parsed.cor_primaria),
    normalizeHex(parsed.cor_secundaria),
    normalizeHex(parsed.cor_terciaria),
    normalizeHex(parsed.cor_quarta),
  ]);
  const colors = namedColors.length >= hexColors.length ? namedColors : hexColors;

  return {
    cor_primaria: colors[0] || null,
    cor_secundaria: colors[1] || null,
    cor_terciaria: colors[2] || null,
    cor_quarta: colors[3] || null,
    mascote:
      parsed.mascote && String(parsed.mascote).trim() && !/^null$/i.test(String(parsed.mascote).trim())
        ? String(parsed.mascote).trim()
        : null,
    tem_feminino: typeof parsed.tem_feminino === "boolean" ? parsed.tem_feminino : null,
    nome_curto: parsed.nome_curto && String(parsed.nome_curto).trim() ? String(parsed.nome_curto).trim() : null,
  };
}

async function callGeminiGroundedColors(model: string, clubName: string, country: string | null): Promise<AIResult | null> {
  if (!GEMINI_KEY) return null;
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: buildGeminiPrompt(clubName, country) }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.05, topP: 0.2, maxOutputTokens: 1600 },
      }),
    });

    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      console.error(`[GEMINI ${model} ${res.status}]`, JSON.stringify(payload).slice(0, 500));
      return null;
    }

    const text = payload?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text || "")
      .join("\n")
      .trim();
    const parsed = text ? extractJsonObject(text) : null;
    return parsed ? normalizeAIResult(parsed) : null;
  } catch (e) {
    console.error(`[GEMINI ${model} ERROR]`, e);
    return null;
  }
}

async function aiEnrich(clubName: string, country: string | null): Promise<AIResult> {
  const [flash, sourceColors] = await Promise.all([
    callGeminiGroundedColors("gemini-2.5-flash", clubName, country),
    researchColorsFromWeb(clubName, country),
  ]);
  let result = flash;
  console.log(`[GEMINI flash] ${clubName} →`, JSON.stringify(result));

  const flashCount = result
    ? [result.cor_primaria, result.cor_secundaria, result.cor_terciaria, result.cor_quarta].filter(Boolean).length
    : 0;
  const sourceCount = sourceColors?.colors.length || 0;

  if (!result || flashCount < 2 || flashCount < sourceCount) {
    const pro = await callGeminiGroundedColors("gemini-2.5-pro", clubName, country);
    console.log(`[GEMINI pro] ${clubName} →`, JSON.stringify(pro));
    const proCount = pro ? [pro.cor_primaria, pro.cor_secundaria, pro.cor_terciaria, pro.cor_quarta].filter(Boolean).length : 0;
    if (pro && proCount >= flashCount) result = pro;
  }

  const merged = result || { ...EMPTY_AI };
  const aiColors = uniqHex([merged.cor_primaria, merged.cor_secundaria, merged.cor_terciaria, merged.cor_quarta]);
  const trustedColors = sourceColors?.colors.length ? sourceColors.colors : [];
  const finalColors = uniqHex([...trustedColors, ...aiColors]).slice(0, 4);

  if (finalColors.length) {
    [merged.cor_primaria, merged.cor_secundaria, merged.cor_terciaria, merged.cor_quarta] = [
      finalColors[0] || null,
      finalColors[1] || null,
      finalColors[2] || null,
      finalColors[3] || null,
    ];
  }

  return merged;
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
          ai: !!GEMINI_KEY,
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
