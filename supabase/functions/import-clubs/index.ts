/**
 * Caminho: supabase/functions/import-clubs/index.ts
 * Função Supabase Edge - Importação de Clubes (API-Football)
 * Correção: agora importa dados reais da API + inicia campos limpos
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const API_KEY = Deno.env.get("API_FOOTBALL_KEY")!;

serve(async () => {
  try {
    const res = await fetch(
      "https://v3.football.api-sports.io/teams?league=71&season=2024",
      {
        headers: {
          "x-apisports-key": API_KEY,
        },
      }
    );

    const data = await res.json();
    const times = data.response;

    for (const t of times) {
      const team = t.team;

      await supabase.from("clubes_cache").upsert({
        api_id: team.id,
        nome: team.name,
        nome_curto: team.code || null,
        pais: team.country,

        // 👇 começa LIMPO (sem lixo)
        mascote: null,
        cor_primaria: null,
        cor_secundaria: null,
        cor_terciaria: null,
        has_feminino: null
      });
    }

    return new Response(
      JSON.stringify({ status: "Clubes importados com sucesso" }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );

  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500 }
    );
  }
});