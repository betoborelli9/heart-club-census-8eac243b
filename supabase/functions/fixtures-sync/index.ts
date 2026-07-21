/**
 * [EDGE FUNCTION] fixtures-sync
 *
 * Cron: 1x/dia (06:00 BRT recomendado).
 *
 * Objetivo: para cada time-do-coracao distinto (profiles.time_do_coracao_id),
 * busca os próximos 7 dias de jogos na API-Football e salva em team_fixtures_cache.
 *
 * QUOTA: 1 chamada à API-Football por time DISTINTO por dia.
 * Ex.: 100 torcedores torcendo por 30 clubes distintos = 30 calls/dia.
 *
 * NÃO chama lineups, eventos ao vivo, nada. Só pré-carrega o calendário.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const API_KEY = Deno.env.get("FOOTBALL_API_KEY") || "";
const API_BASE = "https://v3.football.api-sports.io";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function af(path: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "x-apisports-key": API_KEY },
  });
  if (!res.ok) throw new Error(`api-football ${res.status}`);
  return await res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (!API_KEY) throw new Error("missing FOOTBALL_API_KEY");

    // Times distintos do coração
    const { data: rows } = await supabase
      .from("profiles")
      .select("time_do_coracao_id")
      .not("time_do_coracao_id", "is", null);

    const teamIds = Array.from(
      new Set((rows || []).map((r: any) => r.time_do_coracao_id).filter(Boolean)),
    );

    // GUARDA DE CACHE: 1 consulta por time por dia (20h hard limit).
    // Lê quem já foi sincronizado nas últimas 20h e PULA esses times.
    const { data: existing } = await supabase
      .from("team_fixtures_cache")
      .select("team_id, updated_at")
      .in("team_id", teamIds);
    const cutoff = Date.now() - 20 * 60 * 60 * 1000;
    const fresh = new Set(
      (existing || [])
        .filter((r: any) => new Date(r.updated_at).getTime() > cutoff)
        .map((r: any) => r.team_id),
    );

    let ok = 0, fail = 0, skipped = 0;
    for (const teamId of teamIds) {
      if (fresh.has(teamId)) { skipped++; continue; }
      try {
        // Próximos 7 dias — 1 call por time, no máximo 1x a cada 20h
        const j = await af(`/fixtures?team=${teamId}&next=10`);
        const fixtures = (j?.response || []).map((f: any) => ({
          id: f.fixture.id,
          date: f.fixture.date,
          status: f.fixture.status?.short,
          venue: f.fixture.venue?.name,
          league: {
            id: f.league.id, name: f.league.name, logo: f.league.logo, round: f.league.round,
          },
          home: { id: f.teams.home.id, name: f.teams.home.name, logo: f.teams.home.logo },
          away: { id: f.teams.away.id, name: f.teams.away.name, logo: f.teams.away.logo },
          goals: f.goals,
        }));

        // A API-Football às vezes responde 200 com resposta vazia (ex.: limite
        // de requisições momentâneo) em vez de erro — se isso acontecer e já
        // havia jogos salvos, NÃO sobrescreve (e não marca como sincronizado
        // agora, pra tentar de novo antes das 20h) em vez de apagar o "próximo
        // jogo" de todo mundo até a próxima janela.
        if (fixtures.length === 0) {
          const { data: prevRow } = await supabase
            .from("team_fixtures_cache")
            .select("payload")
            .eq("team_id", teamId)
            .maybeSingle();
          const prevFixtures = (prevRow as any)?.payload?.next;
          if (Array.isArray(prevFixtures) && prevFixtures.length > 0) {
            console.warn(`team ${teamId}: fetch veio vazio, mantendo cache anterior`);
            skipped++;
            continue;
          }
        }

        await supabase.from("team_fixtures_cache").upsert({
          team_id: teamId,
          payload: { next: fixtures, live: [], synced_at: new Date().toISOString() },
          updated_at: new Date().toISOString(),
        });
        ok++;
      } catch (e) {
        console.error(`team ${teamId}:`, e);
        fail++;
      }
    }

    return new Response(
      JSON.stringify({ teams: teamIds.length, ok, fail, skipped_cached: skipped }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("fixtures-sync error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
