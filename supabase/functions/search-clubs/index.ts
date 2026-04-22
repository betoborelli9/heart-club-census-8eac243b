/**
 * [CAMINHO]: supabase/functions/search-clubs/index.ts
 * [MÓDULO]: BUSCA MULTI-RESULTADOS (API FOOTBALL PAGO)
 * [STATUS]: CORREÇÃO DE HEADERS + MAPEAMENTO REAL
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
    const searchTerm = query?.trim();
    if (!searchTerm)
      return new Response(JSON.stringify([]), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // 1. LIMPEZA DE ACENTOS (API-Sports exige isso para buscas como "Atlético")
    const cleanSearchName = searchTerm.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // 2. BUSCA NA API FOOTBALL (USANDO O HEADER CORRETO PARA PLANO DIRETO)
    const apiKey = Deno.env.get("API_FOOTBALL_KEY") || "3b4a0ec2c5f513b9aa1e43c4adbae7aa";

    const res = await fetch(`https://v3.football.api-sports.io/teams?search=${encodeURIComponent(cleanSearchName)}`, {
      headers: {
        "x-apisports-key": apiKey, // Corrigido: API-Sports não usa rapidapi-key no plano direto
      },
    });

    const apiData = await res.json();

    if (!apiData.response || apiData.response.length === 0) {
      return new Response(JSON.stringify([]), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 3. MAPEAMENTO PARA OS "TANTOS ATLÉTICOS"
    const results = apiData.response.map((item: any) => ({
      api_id: item.team.id.toString(),
      name: item.team.name,
      shortName: item.team.code || item.team.name.substring(0, 3).toUpperCase(),
      city: item.venue?.city || "Brasil",
      country: item.team.country,
      logo: item.team.logo, // A URL do escudo oficial
      source: "api",
    }));

    // Retorna a lista completa (os vários Atléticos) para o Front-end mostrar
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
