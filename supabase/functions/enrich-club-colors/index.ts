/**
 * [CAMINHO/ARQUIVO]: supabase/functions/enrich-club-colors/index.ts
 * [MÓDULO]: MOTOR DE BUSCA ATIVA HEART CLUB
 * [STATUS]: CACHE + API FALLBACK + CHAVE FIXA
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

    // [CHAVE FIXA]: igual ao teste direto na API-Football
    const apiKey = "3b4a0ec2c5f513b9aa1e43c4adbae7aa";

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await req.json().catch(() => ({}));
    const club_name = body.club_name;

    if (!club_name) throw new Error("Nome do clube vazio");

    // 1. Primeiro tenta buscar no Supabase
    const { data: cachedClub, error: cacheError } = await supabase
      .from("clubes_cache")
      .select("*")
      .eq("nome", club_name)
      .maybeSingle();

    if (cacheError) throw cacheError;

    if (cachedClub) {
      return new Response(JSON.stringify({ success: true, club: cachedClub }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Se não existe, busca na API-Football
    const res = await fetch(`https://v3.football.api-sports.io/teams?search=${encodeURIComponent(club_name)}`, {
      headers: { "x-apisports-key": apiKey },
    });

    const json = await res.json();
    const teamData = json.response?.[0];

    // 3. Se a API não retornar nada, cria registro manual
    if (!teamData) {
      const { data, error } = await supabase
        .from("clubes_cache")
        .upsert(
          {
            nome: club_name,
            nome_curto: club_name.substring(0, 3).toUpperCase(),
            cidade: "Desconhecida",
            pais: "Brasil",
            escudo_url: "https://upload.wikimedia.org/wikipedia/en/4/4e/Ibis_Sport_Club.png", // exemplo escudo Íbis
            api_id: null,
            cor_primaria: "#ff0000",
            cor_secundaria: "#000000",
            cor_terciaria: "#ffffff",
          },
          { onConflict: "nome" },
        )
        .select();

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, club: club_name }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Se a API retornou dados, grava no Supabase
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
          estadio: teamData.venue?.name || null,
          capacidade: teamData.venue?.capacity || null,
          endereco: teamData.venue?.address || null,
          cor_primaria: "#ff6200",   // placeholders
          cor_secundaria: "#1a1a1a",
          cor_terciaria: "#ffffff",
        },
        { onConflict: "nome" },
      )
      .select();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, club: teamData.team }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * [RODAPÉ TÉCNICO]
 * Consulta primeiro o Supabase, se não encontrar busca na API-Football.
 * Se a API não retornar nada, cria registro manual no Supabase.
 */
