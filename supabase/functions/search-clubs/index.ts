import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    if (!query || query.length < 2) {
      return new Response(JSON.stringify([]), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Check cache first
    const { data: cached } = await supabase
      .from("clubes_cache")
      .select("*")
      .ilike("nome", `%${query}%`)
      .limit(10);

    if (cached && cached.length >= 3) {
      const results = cached.map((c: any) => ({
        id: c.id,
        api_id: c.api_id,
        name: c.nome,
        shortName: c.nome_curto || c.nome,
        city: c.cidade,
        country: c.pais,
        countryCode: c.pais_codigo,
        logo: c.escudo_url,
      }));
      return new Response(JSON.stringify(results), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Fetch from API-Football
    const apiKey = Deno.env.get("FOOTBALL_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "FOOTBALL_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiRes = await fetch(
      `https://v3.football.api-sports.io/teams?search=${encodeURIComponent(query)}`,
      {
        headers: {
          "x-apisports-key": apiKey,
        },
      }
    );

    const apiData = await apiRes.json();
    const teams = apiData?.response || [];

    const results = teams.slice(0, 15).map((item: any) => ({
      id: null, // will be set after cache
      api_id: item.team.id,
      name: item.team.name,
      shortName: item.team.code || item.team.name,
      city: item.venue?.city || null,
      country: item.team.country,
      countryCode: null,
      logo: item.team.logo,
    }));

    // 3. Cache results (upsert by api_id)
    for (const r of results) {
      await supabase.from("clubes_cache").upsert(
        {
          api_id: r.api_id,
          nome: r.name,
          nome_curto: r.shortName,
          cidade: r.city,
          pais: r.country,
          escudo_url: r.logo,
        },
        { onConflict: "api_id" }
      );
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
