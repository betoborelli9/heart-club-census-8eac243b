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

/** Try to fetch og:image from the article page */
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
    if (!res.ok) { await res.text(); return null; }
    const html = await res.text();
    // og:image
    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (ogMatch && ogMatch[1].startsWith("http")) return ogMatch[1];
    // twitter:image
    const twMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
    if (twMatch && twMatch[1].startsWith("http")) return twMatch[1];
    return null;
  } catch {
    return null;
  }
}

/** Build name variants for strict filtering */
function buildNameTokens(clubName: string): string[] {
  const lower = clubName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const tokens: string[] = [lower];
  // Also add with accents
  tokens.push(clubName.toLowerCase());
  // Split multi-word names and add individual significant words (>=4 chars)
  const words = lower.split(/\s+/).filter(w => w.length >= 4 && !["futebol","clube","club","esporte","sport","city","united","fc"].includes(w));
  // Add pairs of consecutive words for better matching
  for (let i = 0; i < words.length; i++) {
    tokens.push(words[i]);
    if (i + 1 < words.length) tokens.push(`${words[i]} ${words[i+1]}`);
  }
  return [...new Set(tokens)];
}

function titleMatchesClub(title: string, nameTokens: string[]): boolean {
  const normalizedTitle = title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  // The full club name or a 2-word token must appear
  return nameTokens.some(token => {
    if (token.includes(" ") || token.length >= 5) {
      return normalizedTitle.includes(token);
    }
    return false;
  });
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

    // Use exact club name in quotes for precision
    const query = encodeURIComponent(`"${clubName}" futebol`);
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
    const nameTokens = buildNameTokens(clubName);

    const rawItems: any[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null && rawItems.length < 20) {
      const block = match[1];
      const get = (tag: string) => {
        const m = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
        return m ? (m[1] || m[2] || "").trim() : "";
      };

      const rawTitle = get("title");
      const { cleanTitle, source } = extractSource(rawTitle);

      // STRICT FILTER: title must contain the club name
      if (!titleMatchesClub(cleanTitle, nameTokens)) continue;

      const rssImage = extractImage(block);

      rawItems.push({
        title: cleanTitle,
        link: get("link"),
        pubDate: get("pubDate"),
        source,
        imageUrl: rssImage,
        guid: get("guid") || `${rawItems.length}`,
      });
    }

    // Limit to 12 final items
    const items = rawItems.slice(0, 12);

    // Try to fetch og:image for items missing images (up to 6 in parallel)
    const needImage = items.filter(it => !it.imageUrl).slice(0, 6);
    if (needImage.length > 0) {
      const ogResults = await Promise.allSettled(
        needImage.map(it => fetchOgImage(it.link))
      );
      ogResults.forEach((result, idx) => {
        if (result.status === "fulfilled" && result.value) {
          needImage[idx].imageUrl = result.value;
        }
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
