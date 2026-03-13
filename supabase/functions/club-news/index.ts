import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function extractSource(title: string): { cleanTitle: string; source: string } {
  const match = title.match(/^(.*)\s-\s([^-]+)$/);
  if (match) return { cleanTitle: match[1].trim(), source: match[2].trim() };
  return { cleanTitle: title, source: "Google News" };
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
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, {
      headers: { "User-Agent": "HeartClub/1.0" },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = await res.text();
    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
      || html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
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

    // Use quoted search for specificity
    const query = encodeURIComponent(`"${clubName}" futebol`);
    const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;

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

    // Strict filtering: club name tokens
    const nameTokens = normalize(clubName).split(/\s+/).filter(t => t.length > 2);

    const items: any[] = [];
    const seenTitles = new Set<string>();
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null && items.length < 12) {
      const block = match[1];
      const get = (tag: string) => {
        const m = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
        return m ? (m[1] || m[2] || "").trim() : "";
      };

      const rawTitle = get("title");
      const { cleanTitle, source } = extractSource(rawTitle);

      // Strict relevance check
      const titleNorm = normalize(cleanTitle);
      const isRelevant = nameTokens.some(token => titleNorm.includes(token));
      if (!isRelevant) continue;

      // Dedup by title
      if (seenTitles.has(titleNorm)) continue;
      seenTitles.add(titleNorm);

      let imageUrl = extractImage(block);

      // If no image from RSS, try og:image
      if (!imageUrl) {
        const link = get("link");
        if (link) {
          imageUrl = await fetchOgImage(link);
        }
      }

      items.push({
        title: cleanTitle,
        link: get("link"),
        pubDate: get("pubDate"),
        source,
        imageUrl,
        guid: get("guid") || `${items.length}`,
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
