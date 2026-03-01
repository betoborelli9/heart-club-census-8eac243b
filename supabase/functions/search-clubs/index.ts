import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory rate limiter (per IP, resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 15; // requests per window
const RATE_WINDOW_MS = 60_000; // 1 minute

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

// Input validation: allow letters (unicode), digits, spaces, hyphens, dots
const VALID_QUERY_RE = /^[\p{L}\p{N}\s\-\.]+$/u;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limiting by IP
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isRateLimited(clientIp)) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const query = typeof body.query === "string" ? body.query.trim() : "";

    // Input validation
    if (!query || query.length < 2) {
      return new Response(JSON.stringify([]), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (query.length > 100) {
      return new Response(JSON.stringify({ error: "Search query too long" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!VALID_QUERY_RE.test(query)) {
      return new Response(JSON.stringify({ error: "Invalid search query" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Check local cache first
    const { data: cached } = await supabase
      .from("clubes_cache")
      .select("*")
      .ilike("nome", `%${query}%`)
      .limit(20);

    const cachedResults = (cached || []).map((c: any) => ({
      id: c.id,
      api_id: c.api_id,
      name: c.nome,
      shortName: c.nome_curto || c.nome,
      city: c.cidade,
      country: c.pais,
      countryCode: c.pais_codigo,
      logo: c.escudo_url,
    }));

    // 2. ALWAYS call API-Football to get comprehensive results (incl. Brazil lower divisions)
    const apiKey = Deno.env.get("FOOTBALL_API_KEY");
    if (!apiKey) {
      // No API key — return cache only
      return new Response(JSON.stringify(cachedResults), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      const apiRes = await fetch(
        `https://v3.football.api-sports.io/teams?search=${encodeURIComponent(query)}`,
        {
          headers: {
            "x-rapidapi-key": apiKey,
            "x-rapidapi-host": "v3.football.api-sports.io",
          },
        }
      );

      if (!apiRes.ok) {
        console.error("API-Football error:", apiRes.status, await apiRes.text());
        return new Response(JSON.stringify(cachedResults), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const apiData = await apiRes.json();
      const teams = apiData?.response || [];

      const apiResults = teams.slice(0, 20).map((item: any) => ({
        id: null,
        api_id: item.team.id,
        name: item.team.name,
        shortName: item.team.code || item.team.name,
        city: item.venue?.city || null,
        country: item.team.country,
        countryCode: null,
        logo: item.team.logo,
      }));

      // 3. Cache ALL new API results immediately for future queries
      const upsertPromises = apiResults
        .filter((r: any) => r.api_id)
        .map((r: any) =>
          supabase.from("clubes_cache").upsert(
            {
              api_id: r.api_id,
              nome: r.name,
              nome_curto: r.shortName,
              cidade: r.city,
              pais: r.country,
              escudo_url: r.logo,
            },
            { onConflict: "api_id" }
          )
        );
      await Promise.all(upsertPromises);

      // 4. Merge: API results first, then cached entries not already in API response
      const apiIds = new Set(apiResults.map((r: any) => r.api_id).filter(Boolean));
      const extraCached = cachedResults.filter((c: any) => !apiIds.has(c.api_id));
      const merged = [...apiResults, ...extraCached].slice(0, 25);

      return new Response(JSON.stringify(merged), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (apiErr) {
      console.error("API-Football fetch failed:", apiErr);
      // Fallback to cache on network error
      return new Response(JSON.stringify(cachedResults), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    console.error("search-clubs error:", err);
    return new Response(JSON.stringify({ error: "Search temporarily unavailable" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
