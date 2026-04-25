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
  const tokens = getClubTokens(clubName);

  if (tokens.length === 0) return false;

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clubName } = await req.json();

    if (!clubName || typeof clubName !== "string" || clubName.length > 100) {
      return new Response(JSON.stringify({ error: "clubName inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const query = encodeURIComponent(`"${clubName}" futebol`);
    const rssUrl =
      `https://news.google.com/rss/search?q=${query}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;

    const rssResponse = await fetch(rssUrl, {
      headers: { "User-Agent": "HeartClub/1.0" },
    });

    if (!rssResponse.ok) {
      console.error("Google News RSS error:", rssResponse.status);
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const xml = await rssResponse.text();
    const items: any[] = [];
    const seenTitles = new Set<string>();

    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null && items.length < 12) {
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
      const { cleanTitle, source } = extractSource(rawTitle);
      if (!isStrictlyRelevant(cleanTitle, clubName)) continue;

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
        title: cleanTitle,
        link,
        pubDate: get("pubDate"),
        source,
        imageUrl,
        guid: get("guid") || `${titleNorm}-${items.length}`,
      });
    }

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
