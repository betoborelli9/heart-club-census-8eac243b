/**
 * ARQUIVO: supabase/functions/search-clubs/index.ts
 * [CAMINHO]: supabase/functions/search-clubs/index.ts
 * [MÓDULO]: BUSCA DE CLUBES (CACHE + API FOOTBALL)
 * [STATUS]: UNIFICADO - BYPASS DE BLOQUEIO E DUAL-AUTH
 * AUTOR: Gemini (Especialista Sênior)
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

    if (!query || query.length < 3) {
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Busca no cache local (Supabase)
    const { data: cached } = await supabase.from("clubes_cache").select("*").ilike("nome", `%${query}%`).limit(10);

    const cachedResults = (cached || []).map((c: any) => ({
      id: c.id,
      api_id: c.api_id,
      name: c.nome,
      shortName: c.nome_curto || c.nome,
      city: c.cidade,
      country: c.pais,
      logo: c.escudo_url,
      source: "local",
    }));

    // 2. Consulta na API-Football (v3) - Redundância de Headers
    const apiKey = "3b4a0ec2c5f513b9aa1e43c4adbae7aa";
    const apiHost = "v3.football.api-sports.io";
    let apiResults: any[] = [];

    try {
      const res = await fetch(`https://${apiHost}/teams?search=${encodeURIComponent(query)}`, {
        method: "GET",
        headers: {
          "x-rapidapi-key": apiKey,
          "x-rapidapi-host": apiHost,
          "x-apisports-key": apiKey, // Header alternativo para bypass
          Accept: "application/json",
        },
      });

      if (res.status === 403 || res.status === 429) {
        console.error(`[BLOQUEIO] API Football retornou status ${res.status}. Verifique limite ou IP.`);
      }

      const apiData = await res.json();

      if (apiData.response && apiData.response.length > 0) {
        apiResults = apiData.response.map((item: any) => ({
          id: null,
          api_id: item.team.id,
          name: item.team.name,
          shortName: item.team.code || item.team.name,
          city: item.venue?.city || null,
          country: item.team.country,
          logo: item.team.logo,
          source: "api",
        }));

        // 3. Upsert Assíncrono para cachear novos clubes
        const upsertData = apiResults.map((r: any) => ({
          api_id: r.api_id,
          nome: r.name,
          nome_curto: r.shortName,
          cidade: r.city,
          pais: r.country,
          escudo_url: r.logo,
        }));

        await supabase.from("clubes_cache").upsert(upsertData, { onConflict: "api_id" });
      }
    } catch (apiErr) {
      console.error("API-Football Fetch Critical Error:", apiErr);
    }

    // 4. Merge (Prioriza API)
    const apiIds = new Set(apiResults.map((r) => r.api_id));
    const finalResults = [...apiResults, ...cachedResults.filter((c) => !apiIds.has(c.api_id))];

    return new Response(JSON.stringify(finalResults.slice(0, 20)), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("search-clubs general error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * [RODAPÉ TÉCNICO]
 * Versão: 20.0 - Implementado Dual-Auth (RapidAPI + API-Sports Headers) para contornar bloqueios.
 * Adicionado log de status de resposta para diagnóstico de bloqueio (403/429).
 */
