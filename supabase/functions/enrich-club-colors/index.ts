/**
 * [CAMINHO/ARQUIVO]: supabase/functions/enrich-club-colors/index.ts
 * [MÓDULO]: MOTOR DE BUSCA E AUTO-POPULAÇÃO HEART CLUB
 * [STATUS]: UNIFICADO COM CHAVE INJETADA E BUSCA ATIVA
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // Responde ao pre-flight do CORS
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // [PROTOCOLO MASTER]: Chave injetada para ignorar erros de Secret do Dashboard
    const apiKey = "054ae6ad4bc0ae8e8c89986326194b61";

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await req.json().catch(() => ({}));
    const club_name = body.club_name as string | undefined;

    if (!club_name) {
      return new Response(JSON.stringify({ error: "Nome do clube é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. BUSCA ATIVA NA API-FOOTBALL (O motor que encontra qualquer time)
    const searchRes = await fetch(`https://v3.football.api-sports.io/teams?search=${encodeURIComponent(club_name)}`, {
      headers: { "x-apisports-key": apiKey },
    });

    const searchData = await searchRes.json();
    const teamData = searchData.response?.[0];

    if (!teamData) {
      return new Response(JSON.stringify({ error: `Clube ${club_name} não encontrado na API` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { team, venue } = teamData;

    // 2. DEFINIÇÃO DE CORES (Laranja Heart Club padrão para novos clubes)
    const primary = "#ff6200";
    const secondary = "#1a1a1a";

    // 3. GRAVAÇÃO NO BANCO (UPSERT: Cria se não existir, atualiza se existir)
    const { data, error } = await supabase
      .from("clubes_cache")
      .upsert(
        {
          nome: team.name,
          nome_curto: team.code || team.name.substring(0, 3).toUpperCase(),
          cidade: venue?.city || "Internacional",
          pais: team.country,
          escudo_url: team.logo,
          api_id: team.id,
          cor_primaria: primary,
          cor_secundaria: secondary,
        },
        { onConflict: "nome" },
      )
      .select();

    if (error) throw error;

    // 4. SINCRONIZAÇÃO COM A TABELA DE CORES (Para o banner diagonal)
    await supabase.from("club_colors").upsert(
      {
        club_name: team.name,
        primary_color: primary,
        secondary_color: secondary,
        api_id: team.id,
        is_locked: false,
      },
      { onConflict: "club_name" },
    );

    return new Response(JSON.stringify({ success: true, club: team.name, data }), {
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
 * ARQUIVO: supabase/functions/enrich-club-colors/index.ts
 * STATUS: Motor Master Unificado. Chave Injetada. Pronto para o dia 30.
 */
