/**
 * ARQUIVO: supabase/functions/search-clubs/index.ts
 * [CAMINHO]: supabase/functions/search-clubs/index.ts
 * [MÓDULO]: BUSCA DE CLUBES (SERVER-SIDE)
 * [STATUS]: FIX - LOGO & PERSISTENCE
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
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // 1. BUSCA NO CACHE LOCAL
    const { data: cached } = await supabase.from("clubes_cache").select("*").ilike("nome", `%${query}%`).limit(15);

    if (cached && cached.length > 0) {
      return new Response(
        JSON.stringify(
          cached.map((c) => ({
            api_id: c.api_id,
            name: c.nome,
            shortName: c.nome_curto || c.nome,
            city: c.cidade,
            country: c.pais,
            logo: c.escudo_url,
            source: "local",
          })),
        ),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. BUSCA NA API FOOTBALL
    const apiKey = "3b4a0ec2c5f513b9aa1e43c4adbae7aa";
    const res = await fetch(`https://v3.football.api-sports.io/teams?search=${encodeURIComponent(query)}`, {
      headers: { "x-rapidapi-key": apiKey, "x-rapidapi-host": "v3.football.api-sports.io" },
    });

    const apiData = await res.json();
    const results = (apiData.response || []).map((item: any) => ({
      api_id: item.team.id,
      name: item.team.name,
      shortName: item.team.code || item.team.name.substring(0, 3).toUpperCase(),
      city: item.venue?.city || "",
      country: item.team.country,
      logo: item.team.logo,
      source: "api",
    }));

    // 3. UPSERT NO BANCO (CORRIGIDO)
    if (results.length > 0) {
      const upsertData = results.map((r: any) => ({
        api_id: r.api_id,
        nome: r.name,
        nome_curto: r.shortName,
        cidade: r.city,
        pais: r.country,
        escudo_url: r.logo,
        atualizado_em: new Date().toISOString(),
      }));

      const { error: upsertError } = await supabase.from("clubes_cache").upsert(upsertData, { onConflict: "api_id" });

      if (upsertError) console.error("[UPSERT ERROR]:", upsertError);
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
 * Versão: 23.0 - Inclusão de nome_curto e log de erro no upsert.
 */
