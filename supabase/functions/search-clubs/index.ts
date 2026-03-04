import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const query = typeof body.query === "string" ? body.query.trim() : "";

    if (!query || query.length < 2) {
      return new Response(JSON.stringify([]), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (query.length > 100) {
      return new Response(JSON.stringify({ error: "Search query too long" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Check local cache
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

    // 2. Call API-Football
    const apiKey = Deno.env.get("FOOTBALL_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify(cachedResults), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      // Try RapidAPI endpoint first (most common for paid users)
      const rapidApiHost = "api-football-v1.p.rapidapi.com";
      const url = `https://${rapidApiHost}/v3/teams?search=${encodeURIComponent(query)}`;
      
      console.log("Calling API-Football via RapidAPI:", url);
      
      let apiRes = await fetch(url, {
        headers: {
          "x-rapidapi-key": apiKey,
          "x-rapidapi-host": rapidApiHost,
        },
      });

      // Fallback to direct API-Sports endpoint if RapidAPI fails
      if (!apiRes.ok) {
        console.log("RapidAPI failed, trying direct endpoint. Status:", apiRes.status);
        const directUrl = `https://v3.football.api-sports.io/teams?search=${encodeURIComponent(query)}`;
        apiRes = await fetch(directUrl, {
          headers: {
            "x-apisports-key": apiKey,
          },
        });
      }

      if (!apiRes.ok) {
        const errText = await apiRes.text();
        console.error("API-Football error (both endpoints):", apiRes.status, errText);
        return new Response(JSON.stringify(cachedResults), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const apiData = await apiRes.json();
      console.log("API-Football response count:", apiData?.results ?? 0);
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

      // 3. Cache new results
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

      // 4. Merge results
      const apiIds = new Set(apiResults.map((r: any) => r.api_id).filter(Boolean));
      const extraCached = cachedResults.filter((c: any) => !apiIds.has(c.api_id));
      const merged = [...apiResults, ...extraCached].slice(0, 25);

      return new Response(JSON.stringify(merged), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (apiErr) {
      console.error("API-Football fetch failed:", apiErr);
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
