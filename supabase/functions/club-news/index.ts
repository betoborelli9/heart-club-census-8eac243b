import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
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
  "atletico", "america", "nacional", "sport", "internacional", "gremio",
  "juventude", "santos", "river", "boca", "vitoria", "guarani", "portuguesa",
  "operario", "uniao", "central", "remo", "paysandu", "botafogo", "fluminense",
  "palmeiras", "corinthians", "ferroviario", "ferroviaria", "industrial",
  "vila", "real", "uniao", "comercial", "olimpia", "independente", "metropol",
];

function clubHasAmbiguousRoot(clubName: string): boolean {
  const tokens = normalize(clubName).split(/\s+/);
  return tokens.some((t) => AMBIGUOUS_ROOTS.includes(t));
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

    // QUERY ENRIQUECIDA: nome + cidade + país (quando disponíveis)
    // Google News pondera tokens extras como contexto, eliminando ruído de
    // clubes homônimos em outras cidades/países.
    const queryParts = [`"${clubName}"`, "futebol"];
    if (cidade) queryParts.push(cidade);
    if (estado) queryParts.push(estado);
    if (pais && normalize(pais) !== "brazil" && normalize(pais) !== "brasil") {
      queryParts.push(pais);
    } else {
      queryParts.push("Brasil");
    }
    const query = encodeURIComponent(queryParts.join(" "));
    const rssUrl =
      `https://news.google.com/rss/search?q=${query}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;

    const BROWSER_UA =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

    async function fetchRss(url: string): Promise<string | null> {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const r = await fetch(url, {
            headers: {
              "User-Agent": BROWSER_UA,
              "Accept": "application/rss+xml, application/xml, text/xml, */*",
              "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
            },
          });
          if (r.ok) return await r.text();
          console.warn(`[club-news] RSS ${r.status} attempt ${attempt + 1} → ${url}`);
          if (r.status !== 503 && r.status !== 429) return null;
        } catch (e) {
          console.warn(`[club-news] RSS fetch error attempt ${attempt + 1}:`, e);
        }
        await new Promise((res) => setTimeout(res, 400 * (attempt + 1)));
      }
      return null;
    }

    // 🛡️ FALLBACK MULTI-FONTE: Google News bloqueia Deno Deploy via 503.
    // Tentamos Google primeiro; se falhar, caímos para Bing News RSS.
    const bingQuery = encodeURIComponent(queryParts.join(" "));
    const bingUrl = `https://www.bing.com/news/search?q=${bingQuery}&format=rss&cc=br&setlang=pt-BR`;

    let xml = await fetchRss(rssUrl);
    if (!xml) {
      console.warn("[club-news] Google News falhou, tentando Bing News…");
      xml = await fetchRss(bingUrl);
    }
    if (!xml) {
      console.error("[club-news] Nenhuma fonte RSS respondeu");
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const items: any[] = [];
    const seenTitles = new Set<string>();

    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    // DISCRIMINADORES GEOGRÁFICOS (sem mascote — mascote não aparece em notícia):
    // cidade, estado por extenso, e a UF (sigla) derivada da cidade.
    const discriminators: string[] = [];
    if (cidade) discriminators.push(normalize(cidade));
    if (estado) discriminators.push(normalize(estado));
    const uf = cidade ? UF_BY_CITY[normalize(cidade)] : null;
    if (uf) discriminators.push(uf); // ex.: "mg", "sp", "go"
    const ambiguous = clubHasAmbiguousRoot(clubName);

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
      "amistoso beneficente", "racha",
    ];

    // FRESHNESS — janela de 60 dias (Bing News RSS, fallback, costuma trazer
    // resultados mais antigos; preferimos mostrar algo a deixar o feed vazio).
    const FRESHNESS_MS = 60 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    const debug = { total: 0, relev: 0, fresh: 0, ctx: 0, ambig: 0, accepted: 0 };

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

      const rawTitle = get("title");
      const { cleanTitle, source: parsedSource } = extractSource(rawTitle);
      const bingSource = (block.match(/<News:Source>([\s\S]*?)<\/News:Source>/) || [])[1];
      const source = (bingSource || parsedSource || "Notícias").trim();

      if (!isStrictlyRelevant(cleanTitle, clubName)) continue;
      debug.relev++;

      const pubDate = get("pubDate");
      const pubMs = pubDate ? new Date(pubDate).getTime() : NaN;
      if (!isNaN(pubMs) && now - pubMs > FRESHNESS_MS) continue;
      debug.fresh++;

      const description = get("description").replace(/<[^>]+>/g, " ");
      const haystack = normalize(`${cleanTitle} ${description}`);

      // Bloqueio explícito de futebol amador / várzea.
      if (AMATEUR_BLACKLIST.some((b) => haystack.includes(b))) continue;
      debug.ctx++;

      // ANTI-HOMÔNIMO suave: se o clube tem raiz ambígua E o título contém
      // marcador de outro estado, descarta. Caso contrário, aceita.
      if (ambiguous && discriminators.length > 0) {
        const titleN = normalize(cleanTitle);
        const ufMatches = titleN.match(/\b([a-z]{2})\b/g) || [];
        const knownUF = discriminators.find((d) => d.length === 2);
        const hasOwn = discriminators.some((d) => d && haystack.includes(d));
        const conflictsUF = knownUF && ufMatches.some((u) =>
          /^(mg|sp|rj|rs|pr|sc|ba|ce|pe|rn|pb|al|se|pi|ma|am|pa|ap|rr|ro|ac|to|mt|ms|go|df|es)$/.test(u) &&
          u !== knownUF
        );
        if (conflictsUF && !hasOwn) continue;
      }
      debug.ambig++;

      const titleNorm = normalize(cleanTitle);
      if (seenTitles.has(titleNorm)) continue;
      seenTitles.add(titleNorm);

      const link = get("link");
      let imageUrl = extractImage(block);

      if (!imageUrl || isPortalLogoImage(imageUrl)) {
        const scraped = link ? await fetchOgImage(link) : null;
        imageUrl = scraped && !isPortalLogoImage(scraped) ? scraped : null;
      }

      items.push({
        title: decodeHtmlEntities(cleanTitle),
        link: decodeHtmlEntities(link),
        pubDate,
        source: decodeHtmlEntities(source),
        imageUrl,
        guid: get("guid") || `${titleNorm}-${items.length}`,
      });
      debug.accepted++;
    }

    console.log(`[club-news] ${clubName} →`, JSON.stringify(debug));

    return new Response(JSON.stringify(items), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("club-news error:", e);
    return new Response(JSON.stringify([]), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
