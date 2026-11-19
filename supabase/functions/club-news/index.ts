import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildLocalQueries, isLocalRelevant, marketFor, mergeNews, sanitizeProfile, selectByWindow, type LocalProfile,
} from "../_shared/club-news-local.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STOPWORDS = new Set([
  "fc",
  "sc",
  "de",
  "do",
  "da",
  "dos",
  "das",
  "club",
  "clube",
  "esporte",
  "futebol",
  "sport",
]);

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .trim();
}

// Decodifica entidades HTML básicas (&#225;, &amp;, &quot;…) — Bing News e
// outros feeds devolvem títulos com entidades numéricas que o React não
// renderiza automaticamente.
function decodeHtmlEntities(s: string): string {
  if (!s) return s;
  const decoded = s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
  return fixMojibake(decoded);
}

// Corrige "mojibake" — títulos que vêm com bytes UTF-8 (ex.: "é") lidos como
// se fossem Latin-1, virando "Ã©" e afins. Reinterpreta os char codes da
// string como bytes originais e decodifica como UTF-8 de verdade; só aplica
// a correção quando esses bytes formam UTF-8 válido, pra nunca estragar um
// título que já está correto.
function fixMojibake(s: string): string {
  if (!s) return s;
  let hasPattern = false;
  for (let i = 0; i < s.length - 1; i++) {
    const c1 = s.charCodeAt(i);
    const c2 = s.charCodeAt(i + 1);
    if ((c1 === 0xc2 || c1 === 0xc3) && c2 >= 0x80 && c2 <= 0xbf) {
      hasPattern = true;
      break;
    }
  }
  if (!hasPattern) return s;
  try {
    const bytes = Uint8Array.from([...s].map((c) => c.charCodeAt(0)));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return s;
  }
}

function extractSource(title: string): { cleanTitle: string; source: string } {
  const match = title.match(/^(.*)\s-\s([^-]+)$/);
  if (match) return { cleanTitle: match[1].trim(), source: match[2].trim() };
  return { cleanTitle: title, source: "Google News" };
}

function getClubTokens(clubName: string): string[] {
  return normalize(clubName)
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

function isStrictlyRelevant(title: string, clubName: string): boolean {
  const titleNorm = normalize(title);
  const fullNorm = normalize(clubName);
  if (titleNorm.includes(fullNorm)) return true;

  const tokens = getClubTokens(clubName);
  if (tokens.length === 0) return false;

  // aceita "vila-go", "atletico-mg", etc. (token + UF)
  if (new RegExp(`\\b${tokens[0]}[- ]?[a-z]{2}\\b`).test(titleNorm)) return true;

  const matches = tokens.filter((token) => titleNorm.includes(token));
  if (tokens.length === 1) return matches.length === 1;
  return matches.length >= Math.min(tokens.length, 2);
}

function isPortalLogoImage(url: string | null | undefined): boolean {
  if (!url) return false;
  const value = normalize(url);

  return (
    (value.includes("s.glbimg.com") && value.includes("ge") &&
      (value.includes("logo") || value.includes("favicon"))) ||
    value.includes("logo-ge") ||
    (value.includes("ge.globo") && value.includes("favicon"))
  );
}

function extractImage(block: string): string | null {
  const enclosure = block.match(/<enclosure[^>]+url="([^"]+)"/);
  if (enclosure) return enclosure[1];

  const media = block.match(/<media:content[^>]+url="([^"]+)"/);
  if (media) return media[1];

  const thumb = block.match(/<media:thumbnail[^>]+url="([^"]+)"/);
  if (thumb) return thumb[1];

  const descImg = block.match(/<description[^>]*>([\s\S]*?)<\/description>/);
  if (descImg) {
    const imgMatch = (descImg[1] || "").match(/src="([^"]+)"/);
    if (imgMatch) return imgMatch[1];
  }

  return null;
}

async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(url, {
      headers: { "User-Agent": "HeartClub/1.0" },
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!res.ok) return null;

    const html = await res.text();

    const ogMatch = html.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    ) ||
      html.match(
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      ) ||
      html.match(
        /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      );

    return ogMatch ? ogMatch[1] : null;
  } catch {
    return null;
  }
}

// Raízes de nomes notoriamente ambíguas no Brasil/mundo. Quando o clube cair
// numa dessas raízes, exigimos um discriminador (cidade, mascote, UF, país)
// no título para aceitar a notícia — bloqueia "intrusos" homônimos.
const AMBIGUOUS_ROOTS = [
  "atletico", "america", "nacional", "sport", "real", "vitoria", "guarani",
  "portuguesa", "operario", "uniao", "central", "botafogo", "fluminense",
  "ferroviario", "ferroviaria", "industrial", "comercial", "olimpia",
  "independente", "metropol", "juventude", "santos", "river", "boca",
  "vila", "nova", "velha", "rica", "aliança", "alianca",
];

function clubHasAmbiguousRoot(clubName: string): boolean {
  const tokens = normalize(clubName).split(/\s+/);
  return tokens.some((t) => AMBIGUOUS_ROOTS.includes(t));
}

function clubNeedsGeoDiscriminator(clubName: string): boolean {
  const tokens = getClubTokens(clubName);
  if (tokens.length === 0) return false;

  const ambiguousTokens = tokens.filter((token) => AMBIGUOUS_ROOTS.includes(token));
  if (ambiguousTokens.length === 0) return false;

  // Só nome de UMA palavra ambígua (América, Nacional, Atlético, Real...)
  // exige cidade/UF/estado obrigatoriamente citada — sem isso, é impossível
  // saber qual "América" é. Nome composto (Vila Nova, Nova Iguaçu...) já é
  // suficientemente específico com os dois termos batendo (isStrictlyRelevant
  // exige ambos) + contexto de futebol (FOOTBALL_CTX); exigir também a
  // cidade bloquearia notícia legítima que não menciona a cidade-sede.
  return tokens.length === 1;
}

// UF brasileira a partir do estado/cidade conhecidos (best-effort)
const UF_BY_CITY: Record<string, string> = {
  "belo horizonte": "mg", "contagem": "mg", "uberlandia": "mg",
  "sao paulo": "sp", "campinas": "sp", "santos": "sp", "ribeirao preto": "sp",
  "rio de janeiro": "rj", "niteroi": "rj", "volta redonda": "rj",
  "porto alegre": "rs", "caxias do sul": "rs", "pelotas": "rs",
  "curitiba": "pr", "londrina": "pr", "maringa": "pr",
  "florianopolis": "sc", "chapeco": "sc", "criciuma": "sc", "joinville": "sc",
  "salvador": "ba", "feira de santana": "ba",
  "fortaleza": "ce", "recife": "pe", "natal": "rn", "joao pessoa": "pb",
  "maceio": "al", "aracaju": "se", "teresina": "pi", "sao luis": "ma",
  "manaus": "am", "belem": "pa", "macapa": "ap", "boa vista": "rr",
  "porto velho": "ro", "rio branco": "ac", "palmas": "to",
  "cuiaba": "mt", "campo grande": "ms", "goiania": "go", "brasilia": "df",
  "vitoria": "es", "vila velha": "es",
};

// Ranking de confiabilidade das fontes — usado para decidir, quando duas
// notícias são sobre o mesmo assunto, qual delas manter. Quanto menor o
// número, mais confiável. Site oficial do clube sempre vence (rank 0),
// atribuído separadamente por domínio, não por nome de fonte.
const SOURCE_RANK: Array<{ match: RegExp; rank: number }> = [
  { match: /ge\.?globo|globoesporte/i, rank: 1 },
  { match: /espn/i, rank: 2 },
  { match: /uol/i, rank: 3 },
  { match: /lance/i, rank: 4 },
  { match: /cnn ?brasil/i, rank: 5 },
  { match: /gazeta ?esportiva/i, rank: 6 },
  { match: /o ?globo/i, rank: 7 },
  { match: /terra/i, rank: 8 },
  { match: /marca|^as$|as\.com|mundo ?deportivo/i, rank: 9 },
  { match: /bbc/i, rank: 10 },
  { match: /goal/i, rank: 11 },
];

function rankForSource(source: string): number {
  const found = SOURCE_RANK.find((s) => s.match.test(source));
  return found ? found.rank : 50;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

// Bing entrega o link real dentro de ?url=... por trás de um redirecionador
// (apiclick.aspx). Extrai a URL real pra sabermos o domínio verdadeiro da
// notícia (necessário pra comparar com o site oficial do clube).
function extractRealUrl(bingUrl: string): string {
  try {
    const u = new URL(bingUrl);
    const real = u.searchParams.get("url");
    return real ? decodeURIComponent(real) : bingUrl;
  } catch {
    return bingUrl;
  }
}

async function urlIsAlive(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const r = await fetch(url, { method: "HEAD", redirect: "follow", signal: controller.signal });
    clearTimeout(timeout);
    if (r.ok) return true;
    // Alguns sites bloqueiam HEAD — tenta GET como fallback.
    const g = await fetch(url, { method: "GET", redirect: "follow" });
    return g.ok;
  } catch {
    return false;
  }
}

// Resolve (e cacheia em clubes_cache.site_oficial) o domínio do site oficial
// do clube, perguntando a IA e verificando se o domínio de fato responde
// antes de confiar nele — nunca aceita um domínio "alucinado" sem checar.
async function resolveOfficialSite(admin: any, clubName: string): Promise<string | null> {
  try {
    const { data: row } = await admin
      .from("clubes_cache")
      .select("id, site_oficial")
      .ilike("nome", clubName)
      .maybeSingle();

    if (row?.site_oficial) return row.site_oficial;
    if (!LOVABLE_KEY) return null;

    const prompt = `Qual é o domínio do site OFICIAL do clube de futebol "${clubName}"? Responda APENAS com o domínio puro, sem "https://" e sem "www." (exemplo: "flamengo.com.br"). Se você não tiver certeza absoluta, responda exatamente "unknown".`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const answer = String(json?.choices?.[0]?.message?.content || "").trim().toLowerCase();
    const domain = answer.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*/, "");

    if (!domain || domain === "unknown" || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return null;
    if (!(await urlIsAlive(`https://${domain}`))) return null;

    if (row?.id) {
      await admin.from("clubes_cache").update({ site_oficial: domain }).eq("id", row.id);
    }
    return domain;
  } catch (e) {
    console.warn("[club-news] resolveOfficialSite falhou:", e);
    return null;
  }
}

// ───────────────────────── NOTÍCIAS LOCAIS (clubes menores) ─────────────────────────
type RssItem = { title: string; link: string; pubDate: string; source: string; description: string; imageUrl: string | null; guid: string };

/** Lê os <item> de um RSS do Bing Notícias (qualquer idioma). */
function parseRssItems(xml: string): RssItem[] {
  const out: RssItem[] = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const block = m[1];
    const get = (tag: string) => {
      const x = block.match(
        new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`),
      );
      return x ? (x[1] || x[2] || "").trim() : "";
    };
    const { cleanTitle, source: parsed } = extractSource(decodeHtmlEntities(get("title")));
    const bingSource = (block.match(/<News:Source>([\s\S]*?)<\/News:Source>/) || [])[1];
    out.push({
      title: cleanTitle,
      link: get("link"),
      pubDate: get("pubDate") || get("dc:date") || get("updated"),
      source: (bingSource || parsed || "Notícias").trim(),
      description: decodeHtmlEntities(get("description")).replace(/<[^>]+>/g, " "),
      imageUrl: extractImage(block),
      guid: get("guid"),
    });
  }
  return out;
}

const bingNewsUrl = (q: { q: string; cc: string; lang: string }) =>
  `https://www.bing.com/news/search?q=${encodeURIComponent(q.q)}&format=rss&cc=${encodeURIComponent(q.cc)}&setlang=${encodeURIComponent(q.lang)}&qft=sortbydate%3d%221%22`;

async function loadProfile(admin: any, clubKey: string): Promise<LocalProfile | null> {
  try {
    const { data } = await admin.from("club_news_profile").select("profile").eq("club_key", clubKey).maybeSingle();
    return data?.profile ? sanitizeProfile(data.profile) : null;
  } catch {
    return null;
  }
}

/** Pergunta à IA como a imprensa local escreve o clube (uma vez; fica guardado). Qualquer falha → null (a busca segue sem isso). */
async function aiProfile(admin: any, clubKey: string, clubName: string, cidade: string | null, pais: string | null): Promise<LocalProfile | null> {
  if (!LOVABLE_KEY) return null;
  try {
    const prompt = `Você ajuda um site de futebol a achar notícias da imprensa LOCAL de um clube.
Clube: "${clubName}". Cidade: "${(cidade || "").slice(0, 80)}". País: "${(pais || "").slice(0, 60)}".
Responda SOMENTE com um JSON, sem nenhum texto fora dele, neste formato:
{"cc":"código ISO de 2 letras do país, em minúsculas","lang":"código de idioma usado pela imprensa do país, como ja-JP, ko-KR, es-AR, pt-BR, tr-TR","club_names":["nome do clube como a imprensa local escreve, na ESCRITA LOCAL; até 3"],"city_names":["nome da cidade na escrita local; até 2"],"football_words":["a palavra futebol na língua local; até 2"]}
Se não tiver certeza de algum campo, use lista vazia ou omita. Nunca invente links.`;
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: [{ role: "user", content: prompt }], temperature: 0 }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const text = String(json?.choices?.[0]?.message?.content || "");
    const braces = text.match(/\{[\s\S]*\}/);
    if (!braces) return null;
    const profile = sanitizeProfile(JSON.parse(braces[0]));
    await admin.from("club_news_profile").upsert({ club_key: clubKey, club_name: clubName, profile });
    return profile;
  } catch (e) {
    console.warn("[club-news] perfil local por IA falhou:", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const clubName: string = body?.clubName;
    const cidade: string | null = body?.cidade ?? null;
    const pais: string | null = body?.pais ?? null;
    const estado: string | null = body?.estado ?? null;

    if (!clubName || typeof clubName !== "string" || clubName.length > 100) {
      return new Response(JSON.stringify({ error: "clubName inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = SUPABASE_URL && SERVICE_ROLE ? createClient(SUPABASE_URL, SERVICE_ROLE) : null;

    // Só clubes que o site conhece (cadastro de clubes) usam cache e perfil da IA no banco: protege contra nomes aleatórios.
    const apiIdNum = Number(body?.apiId);
    const clubKey = `${normalize(clubName)}|${Number.isInteger(apiIdNum) && apiIdNum > 0 ? apiIdNum : ""}`;
    let known = false;
    if (admin) {
      try {
        const { data: kc } = await admin.from("clubes_cache").select("id").ilike("nome", clubName.replace(/[%_\\]/g, "\\$&")).limit(1);
        known = !!kc?.length;
        if (known) {
          const { data: hit } = await admin.from("club_news_cache").select("payload, expires_at").eq("club_key", clubKey).maybeSingle();
          if (hit?.payload && new Date(hit.expires_at).getTime() > Date.now()) {
            return new Response(JSON.stringify(hit.payload), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
        }
      } catch (e) {
        console.warn("[club-news] cache indisponível:", e);
      }
    }
    const officialDomain = admin ? await resolveOfficialSite(admin, clubName) : null;

    const countryContext = pais && normalize(pais) !== "brazil" && normalize(pais) !== "brasil"
      ? pais
      : "Brasil";

    const BROWSER_UA =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

    async function fetchRss(url: string): Promise<string | null> {
      for (let attempt = 0; attempt < 2; attempt++) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4500);
        try {
          const r = await fetch(url, {
            headers: {
              "User-Agent": BROWSER_UA,
              "Accept": "application/rss+xml, application/xml, text/xml, */*",
              "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
            },
            signal: controller.signal,
          });
          if (r.ok) return await r.text();
          console.warn(`[club-news] RSS ${r.status} attempt ${attempt + 1} → ${url}`);
          if (r.status !== 503 && r.status !== 429) return null;
        } catch (e) {
          console.warn(`[club-news] RSS fetch error attempt ${attempt + 1}:`, e);
        } finally {
          clearTimeout(timeout);
        }
        await new Promise((res) => setTimeout(res, 400 * (attempt + 1)));
      }
      return null;
    }

    // 🌎 CONSTRUÇÃO DINÂMICA E UNIVERSAL DA QUERY (qualquer clube do mundo):
    //   Padrão base:  "{Nome}" Futebol Clube notícias oficiais
    //   + Exclusões automáticas contra homônimos geográficos/utilitários
    //     (cidade, tempo, trânsito, prefeitura, turismo, hotel…)
    //   + Contexto do clube (país / cidade / estado) para desambiguar
    //     "Real Madrid" (Espanha) vs "Real" local, "São Paulo FC" vs a cidade,
    //     "Nacional" (Uruguai) vs "Nacional-MG", etc.
    //   + Priorização de domínios esportivos confiáveis via `site:` OR-chain
    //     (ge.globo.com, uol.com.br/esporte, espn.com.br, goal.com…)
    // Nenhum hardcoding por time — tudo derivado do metadado do clube.

    const EXCLUSIONS = [
      "-cidade", "-tempo", "-transito", "-trânsito", "-prefeitura",
      "-turismo", "-hotel", "-imobiliaria", "-imobiliária", "-clima",
    ].join(" ");

    const TRUSTED_SITES = [
      "ge.globo.com", "uol.com.br", "espn.com.br", "goal.com",
      "lance.com.br", "cnnbrasil.com.br", "gazetaesportiva.com",
      "oglobo.globo.com", "terra.com.br/esportes", "marca.com",
      "as.com", "mundodeportivo.com", "bbc.com/sport",
    ];
    const trustedFilter = TRUSTED_SITES.map((d) => `site:${d}`).join(" OR ");

    // Contexto geo/país normalizado — usado como discriminador na query.
    const geoCtxParts = [cidade, estado, countryContext].filter(Boolean) as string[];
    const geoCtx = geoCtxParts.join(" ");

    const quotedClub = `"${clubName}"`;
    const shortName = typeof body?.nomeCurto === "string" && body.nomeCurto.trim()
      ? `"${body.nomeCurto.trim()}"`
      : null;

    const queryVariants: string[] = [];
    const addVariant = (q: string) => {
      const clean = q.replace(/\s+/g, " ").trim();
      if (clean && !queryVariants.some((v) => normalize(v) === normalize(clean))) {
        queryVariants.push(clean);
      }
    };

    // 0) Site OFICIAL do clube, quando resolvido — tentado primeiro, com
    // prioridade máxima, antes até dos agregadores de notícia confiáveis.
    if (officialDomain) {
      addVariant(`${quotedClub} site:${officialDomain} ${EXCLUSIONS}`);
    }
    // 1) Consulta editorial rica: clube + futebol clube + fontes confiáveis + geo + exclusões
    addVariant(`${quotedClub} futebol clube notícias oficiais ${geoCtx} (${trustedFilter}) ${EXCLUSIONS}`);
    // 2) Sem site-filter, mantendo contexto e exclusões (Bing costuma cortar queries muito longas)
    addVariant(`${quotedClub} futebol clube notícias ${geoCtx} ${EXCLUSIONS}`);
    // 3) Fallback amplo: clube + futebol + país
    addVariant(`${quotedClub} futebol ${countryContext}`);
    // 4) Nome curto (apelido) se existir
    if (shortName) addVariant(`${shortName} futebol clube ${countryContext} ${EXCLUSIONS}`);

    const xmlDocs: string[] = [];
    for (const q of queryVariants) {
      const query = encodeURIComponent(q);
      const bingUrl = `https://www.bing.com/news/search?q=${query}&format=rss&cc=br&setlang=pt-BR&qft=interval%3d%227%22`;

      const bingXml = await fetchRss(bingUrl);
      const itemCount = bingXml ? (bingXml.match(/<item>/g) || []).length : 0;
      // Só conta pro "orçamento" de 3 docs quando a resposta realmente tem
      // notícia — uma busca (ex.: restrita ao site oficial) que responde
      // certinho mas vem vazia não pode "gastar" uma tentativa e impedir
      // que a próxima variante (mais ampla, com mais chance de achar algo)
      // seja tentada.
      if (bingXml && itemCount > 0) xmlDocs.push(bingXml);

      if (xmlDocs.length >= 3) break;
    }

    // Google News costuma retornar 503 no Edge Runtime; fica como último
    // recurso, para não travar o dashboard quando o Bing já trouxe notícias.
    if (xmlDocs.length === 0) {
      for (const q of queryVariants.slice(0, 2)) {
        const query = encodeURIComponent(q);
        const googleUrl = `https://news.google.com/rss/search?q=${query}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
        const googleXml = await fetchRss(googleUrl);
        if (googleXml) xmlDocs.push(googleXml);
        if (xmlDocs.length > 0) break;
      }
    }

    if (xmlDocs.length === 0) {
      console.error("[club-news] Nenhuma fonte RSS dos portais grandes respondeu (segue para a busca local)");
    }

    const items: any[] = [];
    const seenTitles = new Map<string, number>();

    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    // DISCRIMINADORES GEOGRÁFICOS (sem mascote — mascote não aparece em notícia):
    // cidade, estado por extenso, e a UF (sigla) derivada da cidade.
    // `cidade` pode vir como "Cidade, Estado" (formato do clubes_cache) — separa
    // em partes, senão a comparação exige o texto inteiro "Goiânia, Goiás"
    // aparecendo junto na notícia, o que praticamente nunca acontece.
    const cidadeParts = cidade
      ? cidade.split(",").map((p) => normalize(p.trim())).filter(Boolean)
      : [];
    const primaryCity = cidadeParts[0] || null;
    const discriminators: string[] = [...cidadeParts];
    if (estado) discriminators.push(normalize(estado));
    const uf = primaryCity ? UF_BY_CITY[primaryCity] : null;
    if (uf) discriminators.push(uf); // ex.: "mg", "sp", "go"
    const ambiguous = clubHasAmbiguousRoot(clubName);
    const needsGeoDiscriminator = clubNeedsGeoDiscriminator(clubName);

    // CONTEXTO DE FUTEBOL PROFISSIONAL — toda notícia precisa conter pelo
    // menos um destes termos no título ou descrição, eliminando manchetes
    // genéricas e conteúdos não esportivos.
    const FOOTBALL_CTX = [
      "futebol", "campeonato", "brasileir", "serie a", "serie b", "serie c",
      "serie d", "copa", "libertadores", "sul-americana", "sulamericana",
      "estadual", "tecnico", "treinador", "jogador", "atacante", "zagueiro",
      "goleiro", "meia", "lateral", "elenco", "rodada", "partida", "jogo",
      "gol ", "contrato", "transferencia", "torcida", "presidente",
      "estadio", "sub-20", "sub-17", "profissional", "clube",
    ];

    // BLACKLIST — termos que indicam futebol amador, várzea, escolinha etc.
    const AMATEUR_BLACKLIST = [
      "amador", "varzea", "pelada", "society", "escolinha",
      "amistoso beneficente", "racha", "comunidades",
    ];

    // FRESHNESS — janela rígida de 48 horas (requisito do produto).
    // Itens sem pubDate válida são descartados (não conseguimos garantir frescor).
    const FRESHNESS_MS = 48 * 60 * 60 * 1000;
    const now = Date.now();

    const debug = { total: 0, relev: 0, fresh: 0, ctx: 0, ambig: 0, accepted: 0 };

    for (const xml of xmlDocs) {
      itemRegex.lastIndex = 0;
      while ((match = itemRegex.exec(xml)) !== null && items.length < 12) {
        debug.total++;
        const block = match[1];

      const get = (tag: string) => {
        const m = block.match(
          new RegExp(
            `<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`,
          ),
        );
        return m ? (m[1] || m[2] || "").trim() : "";
      };

      const rawTitle = decodeHtmlEntities(get("title"));
      const { cleanTitle, source: parsedSource } = extractSource(rawTitle);
      const bingSource = (block.match(/<News:Source>([\s\S]*?)<\/News:Source>/) || [])[1];
      const source = (bingSource || parsedSource || "Notícias").trim();

      if (!isStrictlyRelevant(cleanTitle, clubName)) continue;
      debug.relev++;

      const pubDate = get("pubDate") || get("dc:date") || get("a10:updated") || get("updated");
      const pubMs = pubDate ? new Date(pubDate).getTime() : NaN;
      // 48h rígido: sem data válida OU fora da janela → descarta.
      if (isNaN(pubMs)) continue;
      if (now - pubMs > FRESHNESS_MS) continue;
      debug.fresh++;

      const description = decodeHtmlEntities(get("description")).replace(/<[^>]+>/g, " ");
      const haystack = normalize(`${cleanTitle} ${description}`);

      // Bloqueio explícito de futebol amador / várzea.
      if (AMATEUR_BLACKLIST.some((b) => haystack.includes(b))) continue;

      // ANTI-HOMÔNIMO GENÉRICO: exige pelo menos um termo de futebol
      // profissional em título+descrição. Sem isso, notícia de bairro,
      // cidade ou empresa com o mesmo nome do clube (ex.: bairro "Vila
      // Nova") passava batido só por ter o nome no título.
      if (!FOOTBALL_CTX.some((kw) => haystack.includes(kw))) continue;
      debug.ctx++;

      // ANTI-HOMÔNIMO: bloqueia conflito explícito de UF (ex.: Botafogo-PB para
      // Botafogo-RJ). Só exige cidade/UF em nomes de uma palavra realmente
      // ambíguos; caso contrário, o nome completo + contexto futebolístico basta.
      if (ambiguous) {
        const titleN = normalize(cleanTitle);
        const hasOwn = discriminators.length > 0 &&
          discriminators.some((d) => d && (haystack.includes(d) || titleN.includes(d)));
        const knownUF = discriminators.find((d) => d.length === 2);
        if (knownUF) {
          const ufMatches = titleN.match(/\b([a-z]{2})\b/g) || [];
          const conflictsUF = ufMatches.some((u) =>
            /^(mg|sp|rj|rs|pr|sc|ba|ce|pe|rn|pb|al|se|pi|ma|am|pa|ap|rr|ro|ac|to|mt|ms|go|df|es)$/.test(u) &&
            u !== knownUF
          );
          if (conflictsUF && !hasOwn) continue;
        }
        if (needsGeoDiscriminator && discriminators.length > 0 && !hasOwn) continue;
      }
      debug.ambig++;

      const titleNorm = normalize(cleanTitle);

      const link = get("link");
      const realLink = extractRealUrl(link);
      const linkDomain = getDomain(realLink);
      const isOfficial = Boolean(officialDomain && linkDomain === officialDomain);
      const sourceRank = isOfficial ? 0 : rankForSource(source);

      const existingIdx = seenTitles.get(titleNorm);
      if (existingIdx !== undefined) {
        // Mesmo assunto já visto de outra fonte — só substitui se a nova
        // fonte for mais confiável (rank menor) que a que já está na lista.
        if (sourceRank < items[existingIdx].sourceRank) {
          items[existingIdx] = {
            title: decodeHtmlEntities(cleanTitle),
            link: decodeHtmlEntities(link),
            pubDate,
            source: decodeHtmlEntities(source),
            imageUrl: extractImage(block),
            guid: get("guid") || `${titleNorm}-${existingIdx}`,
            isOfficial,
            sourceRank,
          };
        }
        continue;
      }
      seenTitles.set(titleNorm, items.length);

      const imageUrl = extractImage(block);

      items.push({
        title: decodeHtmlEntities(cleanTitle),
        link: decodeHtmlEntities(link),
        pubDate,
        source: decodeHtmlEntities(source),
        imageUrl,
        guid: get("guid") || `${titleNorm}-${items.length}`,
        isOfficial,
        sourceRank,
      });
      debug.accepted++;
      }
    }

    console.log(`[club-news] ${clubName} →`, JSON.stringify(debug));

    // ── NOTÍCIAS LOCAIS: clube com pouca notícia nos portais grandes (clube pequeno / em baixa) ────────────────────
    // A imprensa da cidade (jornal, rádio, site local), na língua do país, fala dele. Busca pelo nome + cidade + mercado do
    // país e, quando preciso, pelo nome na escrita local (a IA descobre uma vez e fica guardado).
    const localSearch = async (profile: LocalProfile | null): Promise<any[]> => {
      const queries = buildLocalQueries({ clubName, shortName: body?.nomeCurto, cidade, country: pais, profile });
      const docs = await Promise.all(queries.map((q) => fetchRss(bingNewsUrl(q))));
      const found: any[] = [];
      for (const xml of docs) {
        if (!xml) continue;
        for (const it of parseRssItems(xml)) {
          if (!it.title || !it.pubDate || isNaN(new Date(it.pubDate).getTime())) continue;
          if (!isLocalRelevant({ title: it.title, description: it.description }, { clubName, shortName: body?.nomeCurto, cidade, profile })) continue;
          const isOfficial = Boolean(officialDomain && getDomain(extractRealUrl(it.link)) === officialDomain);
          found.push({
            title: decodeHtmlEntities(it.title),
            link: decodeHtmlEntities(it.link),
            pubDate: it.pubDate,
            source: decodeHtmlEntities(it.source),
            imageUrl: it.imageUrl,
            guid: it.guid || `local-${found.length}`,
            isOfficial,
            sourceRank: isOfficial ? 0 : 60,
            local: true,
          });
        }
      }
      return found;
    };

    let pool: any[] = items; // dos portais grandes: já são das últimas 48 h
    let localUsed = false;
    if (items.length < 5) {
      localUsed = true;
      const mk = marketFor(pais);
      let profile: LocalProfile | null = admin && known ? await loadProfile(admin, clubKey) : null;
      // país de outro alfabeto: sem o nome na escrita local a busca quase nunca acha — pergunta à IA já na primeira vez
      if (!profile && !mk.latin && admin && known) profile = await aiProfile(admin, clubKey, clubName, cidade, pais);
      pool = mergeNews(pool, await localSearch(profile));
      if (!profile && admin && known && selectByWindow(pool, Date.now(), 3).items.length < 3) {
        profile = await aiProfile(admin, clubKey, clubName, cidade, pais);
        if (profile && (profile.club_names.length > 0 || profile.cc)) pool = mergeNews(pool, await localSearch(profile));
      }
    }
    // 48 h; se houver pouca notícia, 7 dias; ainda pouca, 30 dias. A tela mostra "há N dias".
    const sel = selectByWindow(pool, Date.now(), 3);
    const result = { data: sel.items.slice(0, 12), windowDays: sel.windowDays, local: localUsed };

    if (admin && known) {
      try {
        const ttlMin = result.data.length === 0 ? 10 : localUsed ? 60 : 10;
        await admin.from("club_news_cache").upsert({
          club_key: clubKey,
          payload: result,
          expires_at: new Date(Date.now() + ttlMin * 60_000).toISOString(),
          updated_at: new Date().toISOString(),
        });
        // limpeza de rotina: linhas vencidas há mais de 3 dias (em ~2% das chamadas)
        if (Math.random() < 0.02) await admin.from("club_news_cache").delete().lt("expires_at", new Date(Date.now() - 3 * 86_400_000).toISOString());
      } catch (e) {
        console.warn("[club-news] não consegui guardar o cache:", e);
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("club-news error:", e);
    return new Response(JSON.stringify([]), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
