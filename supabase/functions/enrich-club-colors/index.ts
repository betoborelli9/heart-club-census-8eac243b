/**
 * ARQUIVO: supabase/functions/enrich-club-colors/index.ts
 * [CAMINHO]: supabase/functions/enrich-club-colors/index.ts
 * STATUS: ADICIONADO PASSE LIVRE (CORS) E CHAVE INJETADA
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // [CRÍTICO]: Responde ao navegador que a função aceita chamadas de fora
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = "054ae6ad4bc0ae8e8c89986326194b61";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { club_name } = await req.json();

    // Busca na API-Football
    const res = await fetch(`https://v3.football.api-sports.io/teams?search=${encodeURIComponent(club_name)}`, {
      headers: { "x-apisports-key": apiKey },
    });

    const json = await res.json();
    const team = json.response?.[0];

    if (!team)
      return new Response(JSON.stringify({ success: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    // Injeta no banco
    await supabase.from("clubes_cache").upsert(
      {
        nome: team.team.name,
        escudo_url: team.team.logo,
        api_id: team.team.id,
        cor_primaria: "#ff6200",
        cor_secundaria: "#1a1a1a",
      },
      { onConflict: "nome" },
    );

    return new Response(JSON.stringify({ success: true, club: team.team.name, data: [team.team] }), {
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
 * Sincronização Localhost/Lovable via API-Football.
 * Próximo passo: Deploy para o Supabase.
 */
