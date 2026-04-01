/**
 * [CAMINHO/ARQUIVO]: supabase/functions/search-clubs/index.ts
 * [MÓDULO]: BUSCA DE CLUBES (CACHE + API FOOTBALL)
 * [STATUS]: UNIFICADO - CACHE LOCAL + API FALLBACK
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const query = typeof body.query === "string" ? body.query.trim() : "";

    if (!query || query.length < 2) {
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    // 1. Busca no cache local (Supabase)
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

    // 2. Consulta direta na API-Football (chave fixa)
    const apiKey = "3b4a0ec2c5f513b9aa1e43c4adbae7aa"; // chave fixa
    let apiData: any = null;

    try {
      const res = await fetch(
        `https://v3.football.api-sports.io/teams?search=${encodeURIComponent(query)}`,
        { headers: { "x-apisports-key": apiKey } }
      );

      if (res.ok) {
        apiData = await res.json();
      }
    } catch (apiErr) {
      console.error("API-Football fetch failed:", apiErr);
    }

    const teams = apiData?.response || [];

    // 3. Se não houver resultados da API, retorna apenas o cache
    if (!teams.length) {
      return new Response(JSON.stringify(cachedResults), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Mapeia resultados da API
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

    // 5. Grava novos resultados no Supabase
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

    // 6. Junta resultados da API com cache
    const apiIds = new Set(apiResults.map((r: any) => r.api_id).filter(Boolean));
    const extraCached = cachedResults.filter((c: any) => !apiIds.has(c.api_id));
    const merged = [...apiResults, ...extraCached].slice(0, 25);

    return new Response(JSON.stringify(merged), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("search-clubs error:", err);
    return new Response(
      JSON.stringify({ error: "Search temporarily unavailable" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

/**
 * [RODAPÉ TÉCNICO]
 * Fluxo: busca primeiro no Supabase, depois na API-Football.
 * Se a API não retornar nada, devolve apenas o cache.
 * Novos resultados da API são gravados no Supabase para uso futuro.
 */
