/**
 * Caminho: supabase/functions/completarSerieA/index.ts
 *//

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { engineDiscover } from "../import-clubs/importSerieA.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  try {
    const { nome } = await req.json();

    if (!nome) {
      return new Response(JSON.stringify({ error: "Nome é obrigatório" }), { status: 400 });
    }

    // 1. PROCURA NO BANCO
    const { data: existente } = await supabase
      .from("clubes_cache")
      .select("*")
      .ilike("nome", `%${nome}%`)
      .maybeSingle();

    if (existente) {
      return new Response(JSON.stringify(existente), { status: 200 });
    }

    // 2. BUSCA NA API FOOTBALL
    const apiRes = await fetch(`https://v3.football.api-sports.io/teams?search=${encodeURIComponent(nome)}`, {
      headers: {
        "x-apisports-key": Deno.env.get("API_FOOTBALL_KEY")!
      }
    });

    const apiData = await apiRes.json();
    const team = apiData.response?.[0]?.team;

    if (!team) {
      return new Response(JSON.stringify({ error: "Clube não encontrado" }), { status: 404 });
    }

    // 3. ENRIQUECE (SEU SCRAPER)
    const extra = await engineDiscover(team.name);

    // 4. MONTA DADOS
    const novoClube = {
      nome: team.name,
      api_id: team.id,
      logo: team.logo,

      mascote: extra?.mascote || null,
      cor_primaria: extra?.cor_primaria || null,
      cor_secundaria: extra?.cor_secundaria || null,
      cor_terciaria: extra?.cor_terciaria || null,
      has_feminino: extra?.has_feminino ?? false
    };

    // 5. SALVA
    const { data: salvo } = await supabase
      .from("clubes_cache")
      .insert(novoClube)
      .select()
      .single();

    return new Response(JSON.stringify(salvo), { status: 200 });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});