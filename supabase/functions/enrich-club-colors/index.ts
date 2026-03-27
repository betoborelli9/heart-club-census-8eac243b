/**
 * [CAMINHO/ARQUIVO]: supabase/functions/enrich-club-colors/index.ts
 * [MÓDULO]: MOTOR DE BUSCA ATIVA HEART CLUB
 * [STATUS]: UNIFICADO - BUSCA, CRIA E ENRIQUECE
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // [CHAVE MESTRA]: Injetada para garantir que a API-Football responda
    const apiKey = "054ae6ad4bc0ae8e8c89986326194b61";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const club_name = body.club_name;

    if (!club_name) throw new Error("Nome do clube vazio");

    // 1. BUSCA NA API-FOOTBALL (O pulo do gato)
    const res = await fetch(`https://v3.football.api-sports.io/teams?search=${encodeURIComponent(club_name)}`, {
      headers: { "x-apisports-key": apiKey },
    });

    const json = await res.json();
    const teamData = json.response?.[0];

    if (!teamData) {
      return new Response(JSON.stringify({ error: "Clube não encontrado na API externa" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. GRAVAÇÃO ATIVA NO SUPABASE (Sincroniza os dois projetos)
    const { data, error } = await supabase
      .from("clubes_cache")
      .upsert(
        {
          nome: teamData.team.name,
          nome_curto: teamData.team.code || teamData.team.name.substring(0, 3).toUpperCase(),
          cidade: teamData.venue?.city || "Internacional",
          pais: teamData.team.country,
          escudo_url: teamData.team.logo,
          api_id: teamData.team.id,
          cor_primaria: "#ff6200",
          cor_secundaria: "#1a1a1a",
        },
        { onConflict: "nome" },
      )
      .select();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, club: teamData.team.name }), {
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
