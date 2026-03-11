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

    // Parse XML items manually (no external deps)
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

      items.push({
        title: cleanTitle,
        link: get("link"),
        pubDate: get("pubDate"),
        source,
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
