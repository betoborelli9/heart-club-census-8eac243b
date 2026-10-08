/**
 * [CAMINHO]: supabase/functions/_shared/league-fixtures.ts
 * [MÓDULO]: Converte um jogo da API-Football na linha da tabela league_fixtures (usado pelo calendário e pelo ao vivo).
 */
export type LeagueFixtureRow = {
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

export function toRow(f: any): LeagueFixtureRow | null {
  const id = f?.fixture?.id;
  const date = f?.fixture?.date;
  const leagueId = f?.league?.id;
  if (!id || !date || !leagueId) return null;
  return {
    fixture_id: id,
    league_id: leagueId,
    league_name: f.league?.name ?? null,
    league_logo: f.league?.logo ?? null,
    country: f.league?.country ?? null,
    season: f.league?.season ?? null,
    round: f.league?.round ?? null,
    kickoff: date,
    status: f.fixture?.status?.short || "NS",
    elapsed: f.fixture?.status?.elapsed ?? null,
    home_id: f.teams?.home?.id ?? null,
    home_name: f.teams?.home?.name ?? null,
    home_logo: f.teams?.home?.logo ?? null,
    away_id: f.teams?.away?.id ?? null,
    away_name: f.teams?.away?.name ?? null,
    away_logo: f.teams?.away?.logo ?? null,
    goals_home: f.goals?.home ?? null,
    goals_away: f.goals?.away ?? null,
    updated_at: new Date().toISOString(),
  };
}
