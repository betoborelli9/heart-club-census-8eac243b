/**
 * [CAMINHO]: supabase/functions/search-clubs/index.ts
 * [STATUS]: PRODUÇÃO - CHAVE DIRETA API-SPORTS
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { query } = await req.json();
    const cleanSearch = query
      ?.trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    if (!cleanSearch)
      return new Response(JSON.stringify([]), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // BUSCA DIRETA NA API FOOTBALL (Header corrigido para seu plano de $20)
    const apiKey = Deno.env.get("API_FOOTBALL_KEY");
    const res = await fetch(`https://v3.football.api-sports.io/teams?search=${encodeURIComponent(cleanSearch)}`, {
      headers: { "x-apisports-key": apiKey! },
    });

    const apiData = await res.json();
    const teams = apiData.response || [];

    // Mapeia TODOS os resultados (Atlético MG, PR, GO, etc.)
    const results = teams.map((item: any) => ({
      api_id: item.team.id,
      name: item.team.name,
      city: item.venue?.city || "Brasil",
      country: item.team.country,
      logo: item.team.logo,
      source: "api",
    }));

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
