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
  "atletico", "america", "nacional", "sport", "real", "vitoria", "guarani",
  "portuguesa", "operario", "uniao", "central", "botafogo", "fluminense",
  "ferroviario", "ferroviaria", "industrial", "comercial", "olimpia",
  "independente", "metropol", "juventude", "santos", "river", "boca",
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

  // Nome de uma palavra ambígua (América, Nacional, Atlético, Real...) precisa
  // de cidade/UF/estado para não cair em homônimo. Nome composto exato (Vila
  // Nova, Corinthians, Palmeiras) não pode ser bloqueado só por não citar cidade.
  return tokens.length === 1 || ambiguousTokens.length === tokens.length;
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

    // 🛡️ FALLBACK MULTI-FONTE + MULTI-CONSULTA:
    // A consulta com cidade/estado evita homônimos, mas às vezes derruba todas
    // as notícias recentes. Por isso buscamos também uma consulta mais ampla e
    // deixamos o filtro local validar relevância, 48h e conflitos de UF.
    const queryVariants: string[][] = [];
    const addVariant = (parts: string[]) => {
      const key = parts.map(normalize).join("|");
      if (!queryVariants.some((v) => v.map(normalize).join("|") === key)) {
        queryVariants.push(parts);
      }
    };

    const quotedClub = `"${clubName}"`;
    addVariant([quotedClub, "futebol", countryContext]);
    addVariant([quotedClub, "clube", "futebol"]);
    addVariant([quotedClub, "futebol", cidade, estado, countryContext].filter(Boolean) as string[]);
    if (body?.nomeCurto && typeof body.nomeCurto === "string") {
      addVariant([`"${body.nomeCurto}"`, "futebol", countryContext]);
    }

    const xmlDocs: string[] = [];
    for (const parts of queryVariants) {
      const query = encodeURIComponent(parts.join(" "));
      const bingUrl = `https://www.bing.com/news/search?q=${query}&format=rss&cc=br&setlang=pt-BR&qft=interval%3d%227%22`;

      const bingXml = await fetchRss(bingUrl);
      if (bingXml) xmlDocs.push(bingXml);

      if (xmlDocs.length >= 3) break;
    }

    // Google News costuma retornar 503 no Edge Runtime; fica como último
    // recurso, para não travar o dashboard quando o Bing já trouxe notícias.
    if (xmlDocs.length === 0) {
      for (const parts of queryVariants.slice(0, 2)) {
        const query = encodeURIComponent(parts.join(" "));
        const googleUrl = `https://news.google.com/rss/search?q=${query}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
        const googleXml = await fetchRss(googleUrl);
        if (googleXml) xmlDocs.push(googleXml);
        if (xmlDocs.length > 0) break;
      }
    }

    if (xmlDocs.length === 0) {
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
      "amistoso beneficente", "racha",
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
      if (seenTitles.has(titleNorm)) continue;
      seenTitles.add(titleNorm);

      const link = get("link");
      const imageUrl = extractImage(block);

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
