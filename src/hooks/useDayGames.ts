/**
 * [CAMINHO]: src/hooks/useDayGames.ts
 * [MÓDULO]: Dados da aba "Jogos", sempre do CLUBE EM EXIBIÇÃO (coração do torcedor ou o que ele consultou):
 *  • useClubCompetitions(clube) → os campeonatos em que o clube está jogando (league-standings, já guardado em cache)
 *  • useCompetitionGames(ligas)  → os jogos desses campeonatos numa janela de dias, lidos do nosso banco
 *    (league_fixtures — o servidor busca o mundo todo; nenhum torcedor consulta a API de jogos).
 * Nada de campeonato ou time que não tenha relação com o clube.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

export type Competition = { leagueId: number; leagueName: string; leagueLogo: string | null; country: string | null; season: number };
export type ClubTeam = { id: number; name: string; logo: string | null };

export const LIVE_STATUSES = new Set(["1H", "2H", "ET", "LIVE", "HT", "BT", "P"]);

const COLS =
  "fixture_id, league_id, league_name, league_logo, country, season, round, kickoff, status, elapsed, extra, home_id, home_name, home_logo, away_id, away_name, away_logo, goals_home, goals_away, updated_at";

const COMP_CACHE = new Map<string, { at: number; team: ClubTeam | null; competitions: Competition[] }>();
const COMP_TTL = 5 * 60 * 1000;
/** Só para testes: limpa o cache em memória dos campeonatos por clube. */
export const clearCompetitionsCache = () => COMP_CACHE.clear();

export function useClubCompetitions(clubName: string | null) {
  const [team, setTeam] = useState<ClubTeam | null>(null);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(!!clubName);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!clubName) {
      setTeam(null);
      setCompetitions([]);
      setLoading(false);
      setFailed(false);
      return;
    }
    const hit = COMP_CACHE.get(clubName);
    if (hit && Date.now() - hit.at < COMP_TTL) {
      setTeam(hit.team);
      setCompetitions(hit.competitions);
      setLoading(false);
      setFailed(false);
      return;
    }
    setLoading(true);
    setFailed(false);
    (async () => {
      const { data, error } = await supabase.functions.invoke("league-standings", { body: { clubName } });
      if (!alive) return;
      if (error || !data) {
        setFailed(true);
        setLoading(false);
        return;
      }
      const t: ClubTeam | null = (data as any).team ? { id: (data as any).team.id, name: (data as any).team.name, logo: (data as any).team.logo ?? null } : null;
      const comps: Competition[] = (((data as any).competitions || []) as any[]).map((c) => ({
        leagueId: c.leagueId,
        leagueName: c.leagueName,
        leagueLogo: c.leagueLogo ?? null,
        country: c.country ?? null,
        season: c.season,
      }));
      COMP_CACHE.set(clubName, { at: Date.now(), team: t, competitions: comps });
      setTeam(t);
      setCompetitions(comps);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [clubName]);

  return { team, competitions, loading, failed };
}

/** Janela de jogos dos campeonatos do clube: de 4 dias atrás a 9 dias à frente (a troca de dia é só filtro, instantânea). */
export function useCompetitionGames(leagueIds: number[]) {
  const [games, setGames] = useState<DayGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const seq = useRef(0);
  const key = [...leagueIds].sort((a, b) => a - b).join(",");

  const load = useCallback(
    async (silent = false) => {
      const my = ++seq.current;
      if (!key) {
        setGames([]);
        setLoading(false);
        return;
      }
      if (!silent) setLoading(true);
      try {
        const from = new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString();
        const to = new Date(Date.now() + 9 * 24 * 3600 * 1000).toISOString();
        const { data, error } = await (supabase as any)
          .from("league_fixtures")
          .select(COLS)
          .in("league_id", key.split(",").map(Number))
          .gte("kickoff", from)
          .lt("kickoff", to)
          .order("kickoff", { ascending: true })
          .limit(2000);
        if (my !== seq.current) return;
        if (error) throw error;
        setGames((data || []) as DayGame[]);
        setFailed(false);
      } catch {
        if (my === seq.current) setFailed(true);
      } finally {
        if (my === seq.current) setLoading(false);
      }
    },
    [key],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  return { games, loading, failed, reload: () => load(true), reloadLoud: () => load(false) };
}
