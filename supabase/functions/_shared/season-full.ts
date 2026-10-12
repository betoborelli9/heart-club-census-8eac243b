/**
 * [CAMINHO]: supabase/functions/_shared/season-full.ts
 * [MÓDULO]: Temporada completa de um campeonato (todos os jogos), com cache no banco e proteção da cota da API.
 * Usado pela página do clube (club-season) e pelo motor de probabilidades (league-prognosis).
 */
export type FullGame = {
  id: number;
  date: string;
  st: string; // status curto da API (NS, 1H, FT...)
  r: string | null; // rodada/fase como a API manda ("Regular Season - 33")
  h: number;
  hn: string;
  hl: string | null;
  a: number;
  an: string;
  al: string | null;
  gh: number | null;
  ga: number | null;
  v?: string | null; // estádio
};

export type SeasonMeta = { league_name?: string; league_logo?: string; country?: string; flag?: string };

const LIVE = new Set(["1H", "2H", "HT", "ET", "BT", "P", "LIVE"]);
const DONE = new Set(["FT", "AET", "PEN"]);

export const isLiveStatus = (s: string) => LIVE.has(s);
export const isDoneStatus = (s: string) => DONE.has(s);

export function compactGame(f: any): FullGame | null {
  const id = f?.fixture?.id;
  if (!id || !f?.teams?.home?.id || !f?.teams?.away?.id) return null;
  return {
    id,
    date: f.fixture.date,
    st: f.fixture.status?.short || "NS",
    r: f.league?.round ?? null,
    h: f.teams.home.id,
    hn: f.teams.home.name,
    hl: f.teams.home.logo ?? null,
    a: f.teams.away.id,
    an: f.teams.away.name,
    al: f.teams.away.logo ?? null,
    gh: f.goals?.home ?? null,
    ga: f.goals?.away ?? null,
    v: f.fixture.venue?.name ?? null,
  };
}

type Deps = {
  supabase: any;
  /** chamada à API-Football (já com a chave); lança erro se falhar */
  af: (path: string) => Promise<any>;
};

const FRESH_FETCH_LIMIT_PER_HOUR = 40; // trava contra alguém pedindo campeonatos aleatórios e gastando a cota

/**
 * Devolve todos os jogos da temporada. `hot` = há jogo ao vivo/recém-encerrado na liga (cache de 15 min; senão 6 h).
 * Se a API falhar ou o limite de buscas por hora estourar, devolve o último cache bom (ou null se nunca houve).
 */
export async function getFullSeason(
  { supabase, af }: Deps,
  leagueId: number,
  season: number,
  hot: boolean,
): Promise<{ games: FullGame[]; meta: SeasonMeta; fresh: boolean } | null> {
  const ttl = hot ? 15 * 60 * 1000 : 6 * 60 * 60 * 1000;
  const { data: cached } = await supabase
    .from("league_season_full")
    .select("games, meta, updated_at")
    .eq("league_id", leagueId)
    .eq("season", season)
    .maybeSingle();

  const asResult = (fresh: boolean) =>
    cached ? { games: (cached.games || []) as FullGame[], meta: (cached.meta || {}) as SeasonMeta, fresh } : null;

  if (cached && Date.now() - new Date(cached.updated_at).getTime() < ttl) return asResult(false);

  // Limite de buscas novas por hora (protege os 7.500/dia de todo o site)
  const { count } = await supabase
    .from("league_season_full")
    .select("league_id", { count: "exact", head: true })
    .gte("updated_at", new Date(Date.now() - 3600 * 1000).toISOString());
  if ((count ?? 0) >= FRESH_FETCH_LIMIT_PER_HOUR) return asResult(false);

  try {
    const j = await af(`/fixtures?league=${leagueId}&season=${season}`);
    const resp = (j?.response || []) as any[];
    const games = resp.map(compactGame).filter(Boolean) as FullGame[];
    if (!games.length && cached) return asResult(false); // resposta vazia momentânea: mantém o cache
    const first = resp[0]?.league || {};
    const meta: SeasonMeta = { league_name: first.name, league_logo: first.logo, country: first.country, flag: first.flag };
    games.sort((x, y) => new Date(x.date).getTime() - new Date(y.date).getTime());
    await supabase.from("league_season_full").upsert({ league_id: leagueId, season, games, meta, updated_at: new Date().toISOString() });
    return { games, meta, fresh: true };
  } catch (e) {
    console.warn("[getFullSeason] falhou, usando cache anterior:", e);
    return asResult(false);
  }
}

/** Soma de pontos/gols de um time a partir dos jogos encerrados. */
export function summarizeTeam(games: FullGame[], teamId: number) {
  let w = 0,
    d = 0,
    l = 0,
    gf = 0,
    ga = 0;
  const form: ("V" | "E" | "D")[] = [];
  const mine = games.filter((g) => (g.h === teamId || g.a === teamId) && DONE.has(g.st) && g.gh != null && g.ga != null);
  for (const g of mine) {
    const home = g.h === teamId;
    const f = home ? (g.gh as number) : (g.ga as number);
    const c = home ? (g.ga as number) : (g.gh as number);
    gf += f;
    ga += c;
    if (f > c) {
      w++;
      form.push("V");
    } else if (f === c) {
      d++;
      form.push("E");
    } else {
      l++;
      form.push("D");
    }
  }
  const played = w + d + l;
  const points = w * 3 + d;
  return {
    played,
    win: w,
    draw: d,
    lose: l,
    goalsFor: gf,
    goalsAgainst: ga,
    goalsDiff: gf - ga,
    points,
    pct: played ? Math.round((points / (played * 3)) * 100) : 0,
    form: form.slice(-5),
  };
}
