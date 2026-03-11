import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractSource(title: string): { cleanTitle: string; source: string } {
  const match = title.match(/^(.*)\s-\s([^-]+)$/);
  if (match) return { cleanTitle: match[1].trim(), source: match[2].trim() };
  return { cleanTitle: title, source: "Google News" };
}

function extractImage(block: string): string | null {
  // Try enclosure
  const enclosure = block.match(/<enclosure[^>]+url="([^"]+)"/);
  if (enclosure) return enclosure[1];

  // Try media:content
  const media = block.match(/<media:content[^>]+url="([^"]+)"/);
  if (media) return media[1];

  // Try media:thumbnail
  const thumb = block.match(/<media:thumbnail[^>]+url="([^"]+)"/);
  if (thumb) return thumb[1];

  // Try img inside description
  const descImg = block.match(/<description[^>]*>([\s\S]*?)<\/description>/);
  if (descImg) {
    const imgMatch = (descImg[1] || "").match(/src="([^"]+)"/);
    if (imgMatch) return imgMatch[1];
  }

  return null;
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

    const query = encodeURIComponent(`${clubName} futebol`);
    const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;

    const rssResponse = await fetch(rssUrl, {
      headers: { "User-Agent": "HeartClub/1.0" },
    });

    if (!rssResponse.ok) {
      const body = await rssResponse.text();
      console.error("Google News RSS error:", rssResponse.status, body);
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const xml = await rssResponse.text();

    const items: any[] = [];
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
      const imageUrl = extractImage(block);

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
