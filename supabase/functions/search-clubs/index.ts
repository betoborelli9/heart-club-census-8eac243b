/**
 * ARQUIVO: supabase/functions/search-clubs/index.ts
 * [CAMINHO]: supabase/functions/search-clubs/index.ts
 * [MÓDULO]: BUSCA DE CLUBES (SERVER-SIDE)
 * [STATUS]: FIX - BYPASS CORS & PROTECTED KEY
 * AUTOR: Gemini (Especialista Sênior)
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. BUSCA NO CACHE LOCAL (PRIORIDADE)
    const { data: cached } = await supabase.from("clubes_cache").select("*").ilike("nome", `%${query}%`).limit(10);

    if (cached && cached.length > 0) {
      return new Response(
        JSON.stringify(
          cached.map((c) => ({
            api_id: c.api_id,
            name: c.nome,
            city: c.cidade,
            country: c.pais,
            logo: c.escudo_url,
            source: "local",
          })),
        ),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. BUSCA NA API FOOTBALL (SE NÃO HOUVER NO CACHE)
    const apiKey = "3b4a0ec2c5f513b9aa1e43c4adbae7aa";
    const res = await fetch(`https://v3.football.api-sports.io/teams?search=${encodeURIComponent(query)}`, {
      headers: {
        "x-rapidapi-key": apiKey,
        "x-rapidapi-host": "v3.football.api-sports.io",
      },
    });

    const apiData = await res.json();
    const results = (apiData.response || []).map((item: any) => ({
      api_id: item.team.id,
      name: item.team.name,
      city: item.venue?.city || "",
      country: item.team.country,
      logo: item.team.logo,
      source: "api",
    }));

    // 3. UPSERT ASSÍNCRONO PARA POPULAR O CACHE
    if (results.length > 0) {
      const upsertData = results.map((r: any) => ({
        api_id: r.api_id,
        nome: r.name,
        cidade: r.city,
        pais: r.country,
        escudo_url: r.logo,
      }));
      await supabase.from("clubes_cache").upsert(upsertData, { onConflict: "api_id" });
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

/**
 * [RODAPÉ TÉCNICO]
 * Versão: 21.0 - Unificação de fluxo: Cache -> API.
 * Proteção total da API Key no servidor.
 */
