/**
 * [CAMINHO]: src/hooks/useDayGames.ts
 * [MÓDULO]: Jogos de um dia para a aba "Jogos": campeonatos principais + jogos dos times do torcedor, lidos do nosso
 * banco (league_fixtures — o servidor busca o mundo todo; nenhum torcedor consulta a API). A lista completa de
 * campeonatos do dia vem de public_day_leagues; um campeonato fora da lista principal carrega só quando é aberto.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TOP_LEAGUE_IDS } from "@/data/topLeagues";

export type DayGame = {
  fixture_id: number;
  league_id: number;
  league_name: string | null;
  league_logo: string | null;
  country: string | null;
  season: number | null;
  round: string | null;
  kickoff: string;
  status: string;
  elapsed: number | null;
  extra: number | null;
  home_id: number | null;
  home_name: string | null;
  home_logo: string | null;
  away_id: number | null;
  away_name: string | null;
  away_logo: string | null;
  goals_home: number | null;
  goals_away: number | null;
  updated_at: string;
};
export type DayLeague = { league_id: number; league_name: string | null; league_logo: string | null; country: string | null; jogos: number; ao_vivo: number };

export const LIVE_STATUSES = new Set(["1H", "2H", "ET", "LIVE", "HT", "BT", "P"]);

const COLS = "fixture_id, league_id, league_name, league_logo, country, season, round, kickoff, status, elapsed, extra, home_id, home_name, home_logo, away_id, away_name, away_logo, goals_home, goals_away, updated_at";

export function useDayGames(dayStart: Date, myTeamIds: number[]) {
  const [games, setGames] = useState<DayGame[]>([]);
  const [leagues, setLeagues] = useState<DayLeague[]>([]);
  const [extra, setExtra] = useState<Record<number, DayGame[]>>({});
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const seq = useRef(0);

  const from = dayStart.toISOString();
  const to = new Date(dayStart.getTime() + 24 * 3600 * 1000).toISOString();
  const mine = [...myTeamIds].sort((a, b) => a - b).join(",");

  const load = useCallback(
    async (silent = false) => {
      const my = ++seq.current;
      if (!silent) setLoading(true);
      try {
        const ors = [`league_id.in.(${TOP_LEAGUE_IDS.join(",")})`];
        if (mine) ors.push(`home_id.in.(${mine})`, `away_id.in.(${mine})`);
        const [g, l] = await Promise.all([
          (supabase as any).from("league_fixtures").select(COLS).gte("kickoff", from).lt("kickoff", to).or(ors.join(",")).order("kickoff", { ascending: true }).limit(1500),
          (supabase as any).rpc("public_day_leagues", { p_from: from, p_to: to }),
        ]);
        if (my !== seq.current) return;
        if (g.error) throw g.error;
        setGames((g.data || []) as DayGame[]);
        setLeagues(((l.data || []) as DayLeague[]) ?? []);
        setFailed(false);
      } catch {
        if (my === seq.current) setFailed(true);
      } finally {
        if (my === seq.current) setLoading(false);
      }
    },
    [from, to, mine],
  );

  useEffect(() => {
    setExtra({});
    void load(false);
  }, [load]);

  /** Abre um campeonato que não está na lista principal (carrega só os jogos dele no dia). */
  const openLeague = useCallback(
    async (leagueId: number) => {
      if (extra[leagueId]) return;
      const { data } = await (supabase as any).from("league_fixtures").select(COLS).eq("league_id", leagueId).gte("kickoff", from).lt("kickoff", to).order("kickoff", { ascending: true }).limit(200);
      setExtra((prev) => ({ ...prev, [leagueId]: (data || []) as DayGame[] }));
    },
    [extra, from, to],
  );

  return { games, leagues, extra, loading, failed, reload: () => load(true), reloadLoud: () => load(false), openLeague };
}
