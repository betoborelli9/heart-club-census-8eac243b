/**
 * [CAMINHO]: supabase/functions/club-season/index.ts
 * [MÓDULO]: JOGOS DO CLUBE NA TEMPORADA — todos os jogos do time num campeonato, desde a 1ª rodada até a última
 * (encerrados, ao vivo e futuros), com resumo (J/V/E/D, gols, pontos, aproveitamento, forma).
 * Lê a temporada do cache do banco (1 chamada à API por campeonato a cada 15 min/6 h para TODOS os torcedores) e
 * sobrepõe o placar ao vivo de league_fixtures. Só atende campeonatos que o site já consultou de verdade
 * (competition_standings_cache), para ninguém gastar a cota da API pedindo campeonatos aleatórios.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getFullSeason, summarizeTeam, isDoneStatus, isLiveStatus, type FullGame } from "../_shared/season-full.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const API_KEY = Deno.env.get("API_FOOTBALL_KEY") || Deno.env.get("FOOTBALL_API_KEY") || "";
const API_BASE = "https://v3.football.api-sports.io";
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

async function af(path: string) {
  const res = await fetch(`${API_BASE}${path}`, { headers: { "x-apisports-key": API_KEY } });
  if (!res.ok) throw new Error(`api-football ${res.status}`);
  return await res.json();
}

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!API_KEY) return json({ error: "chave da API ausente" }, 500);
    const body = await req.json().catch(() => ({}));
    const teamId = Number(body?.teamId);
    const leagueId = Number(body?.leagueId);
    const season = Number(body?.season);
    if (![teamId, leagueId, season].every((n) => Number.isInteger(n) && n > 0) || season < 2000 || season > 2100) {
      return json({ error: "parâmetros inválidos" }, 400);
    }

    // Só campeonatos que o site já consultou de verdade
    const { data: known } = await supabase
      .from("competition_standings_cache")
      .select("league_id")
      .eq("league_id", leagueId)
      .eq("season", season)
      .maybeSingle();
    if (!known) return json({ error: "campeonato não encontrado" }, 404);

    // Há jogo ao vivo/recém-encerrado nesta liga? (cache curto) + placar ao vivo do nosso banco
    const { data: lf } = await supabase
      .from("league_fixtures")
      .select("fixture_id, status, goals_home, goals_away, elapsed, extra, updated_at, kickoff")
      .eq("league_id", leagueId)
      .gte("kickoff", new Date(Date.now() - 10 * 3600 * 1000).toISOString());
    const recent = (lf || []) as any[];
    const hot = recent.some((r) => isLiveStatus(r.status) || isDoneStatus(r.status));

    const season_ = await getFullSeason({ supabase, af }, leagueId, season, hot);
    if (!season_) return json({ error: "temporada indisponível agora" }, 503);

    const live = new Map<number, any>(recent.map((r) => [Number(r.fixture_id), r]));
    const games: (FullGame & { el?: number | null; ex?: number | null; upd?: string })[] = season_.games.map((g) => {
      const o = live.get(g.id);
      return o
        ? { ...g, st: o.status, gh: o.goals_home, ga: o.goals_away, el: o.elapsed, ex: o.extra, upd: o.updated_at }
        : g;
    });

    const mine = games.filter((g) => g.h === teamId || g.a === teamId);
    if (!mine.length) return json({ error: "time não participa deste campeonato" }, 404);
    const first = mine[0];
    const team = first.h === teamId ? { id: teamId, name: first.hn, logo: first.hl } : { id: teamId, name: first.an, logo: first.al };

    return json({
      team,
      league: { id: leagueId, season, name: season_.meta.league_name, logo: season_.meta.league_logo, country: season_.meta.country },
      summary: summarizeTeam(games, teamId),
      games: mine,
      totalGames: mine.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("club-season error:", e);
    return json({ error: "internal" }, 500);
  }
});
