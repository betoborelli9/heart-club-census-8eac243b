/**
 * [EDGE FUNCTION]: league-standings
 * Engine global de competições via API-Football.
 * - /leagues?team=X&current=true (24h cache em team_leagues_mapping)
 * - /standings (10min cache em competition_standings_cache)
 * - /fixtures next (5min cache em team_fixtures_cache)
 * - AO VIVO: jogos ao vivo/recém-encerrados vêm do NOSSO banco (league_fixtures); a tabela é projetada em
 *   _shared/standings-projection.ts (sem contar jogo 2x, desempate validado). Nenhuma chamada à API por torcedor.
 * Mantém shape legado { league, standings, me, fixtures } para ObjectivesPanel/Z4Infographic.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { projectStandings, LIVE_NOW, FINISHED, type StRow, type SeasonGame, type LiveGame } from "../_shared/standings-projection.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const API_KEY = Deno.env.get("FOOTBALL_API_KEY") || "";
const API_BASE = "https://v3.football.api-sports.io";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const norm = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

async function af(path: string): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "x-apisports-key": API_KEY },
  });
  if (!res.ok) throw new Error(`api-football ${res.status}`);
  const j = await res.json();
  if (j?.errors && (Array.isArray(j.errors) ? j.errors.length : Object.keys(j.errors).length)) {
    console.warn(`[af] ${path} errors:`, JSON.stringify(j.errors));
  }
  return j;
}


// Nomes que o torcedor digita e que existem como OUTRO clube na API (ex.: há um "Atletico Mineiro" pequeno, id 117, diferente do Atletico-MG, id 1062)
const CLUB_ALIAS: Record<string, number> = {
  "atletico mineiro": 1062,
  "clube atletico mineiro": 1062,
  "athletico paranaense": 134,
};

async function resolveTeam(clubName: string): Promise<{ id: number; name: string; logo: string } | null> {
  const aliasId = CLUB_ALIAS[norm(clubName)];
  if (aliasId) {
    const byId = await resolveTeamById(aliasId).catch(() => null);
    if (byId) return byId;
  }
  // 1) cache por nome em team_leagues_mapping
  const { data: cached } = await supabase
    .from("team_leagues_mapping")
    .select("team_id, team_name, leagues_json")
    .ilike("team_name", clubName)
    .limit(1)
    .maybeSingle();
  if (cached?.team_id) {
    const logo = (cached.leagues_json as any)?.team_logo || "";
    return { id: cached.team_id, name: cached.team_name || clubName, logo };
  }
  // 2) busca na API: nome completo e, se não achar, versões mais curtas (o torcedor às vezes digita "Goiânia Esporte Clube")
  for (const q of searchVariants(clubName)) {
    const j = await af(`/teams?search=${encodeURIComponent(q)}`).catch(() => null);
    const all = ((j?.response || []) as any[]).map((x) => x?.team).filter(Boolean);
    // prefere o clube de nome IGUAL (sem acento/maiúscula) e que não seja seleção; senão o primeiro
    const exact = all.find((tm) => norm(tm.name) === norm(q) && !tm.national);
    // nas versões encurtadas só vale nome IGUAL (nunca arriscar trocar por outro clube)
    const r = q === clubName ? exact || all.find((tm) => !tm.national) || all[0] : exact;
    if (r) return { id: r.id, name: r.name, logo: r.logo };
  }
  return null;
}

/** Nome completo primeiro; depois sem as palavras genéricas (Esporte Clube, Club de Fútbol, FC…). */
function searchVariants(name: string): string[] {
  const out: string[] = [];
  const add = (v: string) => {
    const t = v.replace(/\s+/g, " ").trim();
    if (t.length >= 3 && !out.some((o) => norm(o) === norm(t))) out.push(t);
  };
  add(name);
  const generic = /\b(esporte clube|esporte|sport club|athletic club|atletico clube|atl[eé]tico clube|clube de regatas|clube|club de futbol|club de f[uú]tbol|futebol clube|football club|f\.?c\.?|e\.?c\.?|a\.?c\.?|s\.?c\.?)\b/gi;
  add(name.replace(generic, " "));
  return out;
}

/** Resolve pelo NÚMERO do clube (id da API): nunca confunde clubes de nome igual (há vários "Al Hilal"). */
async function resolveTeamById(teamId: number): Promise<{ id: number; name: string; logo: string } | null> {
  const { data: cached } = await supabase.from("team_leagues_mapping").select("team_id, team_name, leagues_json").eq("team_id", teamId).limit(1).maybeSingle();
  if (cached?.team_id) return { id: cached.team_id, name: cached.team_name || "", logo: (cached.leagues_json as any)?.team_logo || "" };
  // só aceita números de clubes que o site conhece (cadastro de clubes ou calendário do mundo): protege a cota da API
  const [{ data: cc }, { data: lf }] = await Promise.all([
    supabase.from("clubes_cache").select("id").eq("api_id", String(teamId)).limit(1),
    supabase.from("league_fixtures").select("fixture_id").or(`home_id.eq.${teamId},away_id.eq.${teamId}`).limit(1),
  ]);
  if (!(cc?.length || lf?.length)) return null;
  const j = await af(`/teams?id=${teamId}`);
  const r = j?.response?.[0]?.team;
  return r ? { id: r.id, name: r.name, logo: r.logo } : null;
}

async function getCurrentLeagues(teamId: number, teamName: string, teamLogo: string) {
  const TTL_24H = 24 * 60 * 60 * 1000;
  const { data: cached } = await supabase
    .from("team_leagues_mapping")
    .select("leagues_json, updated_at")
    .eq("team_id", teamId)
    .maybeSingle();
  if (cached && Date.now() - new Date(cached.updated_at as any).getTime() < TTL_24H) {
    const lj: any = cached.leagues_json || {};
    // Só usa cache se tiver pelo menos uma liga — cache vazio é tratado como miss
    if (Array.isArray(lj.leagues) && lj.leagues.length > 0) return lj.leagues;
  }
  const j = await af(`/leagues?team=${teamId}&current=true`);
  const raw = j?.response || [];
  console.log(`[leagues] team=${teamId} raw=${raw.length}`);
  let leagues = raw.map((x: any) => ({
    id: x.league.id,
    name: x.league.name,
    logo: x.league.logo,
    type: x.league.type,
    country: x.country?.name,
    season: x.seasons?.[0]?.year,
  })).filter((l: any) => l.id && l.season);
  // Fallback: se current=true não trouxer nada, busca todas e pega a temporada mais recente por liga
  if (leagues.length === 0) {
    const j2 = await af(`/leagues?team=${teamId}`);
    const all = j2?.response || [];
    console.log(`[leagues] fallback all=${all.length}`);
    leagues = all.map((x: any) => {
      const seasons = x.seasons || [];
      const latest = seasons.reduce((a: any, b: any) => (a?.year > b?.year ? a : b), seasons[0]);
      return {
        id: x.league.id,
        name: x.league.name,
        logo: x.league.logo,
        type: x.league.type,
        country: x.country?.name,
        season: latest?.year,
      };
    }).filter((l: any) => l.id && l.season);
  }
  // Fetch fresco (current=true + fallback todas as temporadas) ainda assim
  // veio vazio, mas já tínhamos uma lista de ligas boa guardada (mesmo que
  // com o cache de 24h expirado) — provável instabilidade/limite momentâneo
  // da API-Football, não que o time parou de disputar tudo. Mantém a lista
  // antiga em vez de apagar as competições do torcedor.
  const cachedLeagues: any[] = Array.isArray((cached?.leagues_json as any)?.leagues)
    ? (cached!.leagues_json as any).leagues
    : [];
  if (leagues.length === 0 && cachedLeagues.length > 0) {
    console.warn(`[getCurrentLeagues] fetch veio vazio para team=${teamId}, usando cache anterior`);
    return cachedLeagues;
  }

  await supabase.from("team_leagues_mapping").upsert({
    team_id: teamId,
    team_name: teamName,
    leagues_json: { leagues, team_logo: teamLogo },
    updated_at: new Date().toISOString(),
  });
  return leagues;
}


async function getStandings(leagueId: number, season: number, bypassCache = false) {
  const TTL_2M = 10 * 60 * 1000; // (nome antigo) tabela oficial: 10 min; o ao vivo é somado por cima, do nosso banco
  const { data: cached } = await supabase
    .from("competition_standings_cache")
    .select("standings_json, updated_at")
    .eq("league_id", leagueId)
    .eq("season", season)
    .maybeSingle();
  if (!bypassCache && cached && Date.now() - new Date(cached.updated_at as any).getTime() < TTL_2M) {
    return cached.standings_json as any;
  }
  try {
    const j = await af(`/standings?league=${leagueId}&season=${season}`);
    const groups = j?.response?.[0]?.league?.standings || [];
    // API-Football às vezes devolve resposta vazia momentaneamente (rate
    // limit, instabilidade durante jogo ao vivo) — preserva o cache anterior
    // em vez de sobrescrever/servir um resultado vazio.
    if (groups.length === 0 && cached?.standings_json) {
      return cached.standings_json as any;
    }
    const payload = { groups, league_name: j?.response?.[0]?.league?.name };
    await supabase.from("competition_standings_cache").upsert({
      league_id: leagueId,
      season,
      league_name: payload.league_name,
      standings_json: payload,
      updated_at: new Date().toISOString(),
    });
    return payload;
  } catch (e) {
    // Falha na busca fresca (ex.: rate limit da API durante jogo ao vivo em
    // outra partida da competição) — cai para o último cache bom conhecido
    // em vez de deixar a tabela desaparecer para o torcedor.
    if (cached?.standings_json) {
      console.warn(`[getStandings] fetch falhou para league=${leagueId} season=${season}, usando cache anterior:`, e);
      return cached.standings_json as any;
    }
    throw e;
  }
}

const LIVE_LIST = ["1H", "2H", "HT", "ET", "BT", "P", "LIVE"];

/** Jogos ao vivo do time, lidos do nosso banco (alimentado uma vez para o mundo todo). */
async function liveFromDb(teamId: number): Promise<any[]> {
  const { data } = await supabase
    .from("league_fixtures")
    .select("*")
    .or(`home_id.eq.${teamId},away_id.eq.${teamId}`)
    .in("status", LIVE_LIST)
    .gte("updated_at", new Date(Date.now() - 15 * 60 * 1000).toISOString());
  return ((data || []) as any[]).map((f) => ({
    id: f.fixture_id,
    date: f.kickoff,
    status: f.status,
    elapsed: f.elapsed,
    venue: undefined,
    league: { id: f.league_id, name: f.league_name, logo: f.league_logo, round: f.round },
    home: { id: f.home_id, name: f.home_name, logo: f.home_logo },
    away: { id: f.away_id, name: f.away_name, logo: f.away_logo },
    goals: { home: f.goals_home, away: f.goals_away },
    broadcasters: [],
  }));
}

/** Jogos encerrados da temporada (compactos). 15 min de cache com jogo recente na liga, 6 h sem. */
async function getSeasonGames(leagueId: number, season: number, hot: boolean): Promise<SeasonGame[]> {
  const ttl = hot ? 15 * 60 * 1000 : 6 * 60 * 60 * 1000;
  const { data: cached } = await supabase
    .from("league_season_cache")
    .select("games, updated_at")
    .eq("league_id", leagueId)
    .eq("season", season)
    .maybeSingle();
  if (cached && Date.now() - new Date((cached as any).updated_at).getTime() < ttl) return ((cached as any).games || []) as SeasonGame[];
  try {
    const j = await af(`/fixtures?league=${leagueId}&season=${season}`);
    const games: SeasonGame[] = ((j?.response || []) as any[])
      .filter((f) => FINISHED.has(f?.fixture?.status?.short))
      .map((f) => ({
        id: f.fixture.id,
        date: f.fixture.date,
        st: f.fixture.status.short,
        h: f.teams?.home?.id,
        a: f.teams?.away?.id,
        gh: f.goals?.home ?? null,
        ga: f.goals?.away ?? null,
      }));
    await supabase.from("league_season_cache").upsert({ league_id: leagueId, season, games, updated_at: new Date().toISOString() });
    return games;
  } catch (e) {
    console.warn("[getSeasonGames] falhou, usando cache anterior:", e);
    return ((cached as any)?.games || []) as SeasonGame[];
  }
}

async function getFixtures(teamId: number) {
  const TTL_1M = 5 * 60 * 1000; // (nome antigo) próximos jogos: 5 min
  const { data: cached } = await supabase
    .from("team_fixtures_cache")
    .select("payload, updated_at")
    .eq("team_id", teamId)
    .maybeSingle();
  if (cached && Date.now() - new Date(cached.updated_at as any).getTime() < TTL_1M) {
    return cached.payload as any;
  }
  const next = await af(`/fixtures?team=${teamId}&next=15`).catch(() => ({ response: [] }));
  const live = { response: [] as any[] }; // ao vivo vem de liveFromDb() (nosso banco), não da API
  const mapFx = (f: any) => ({
    id: f.fixture.id,
    date: f.fixture.date,
    status: f.fixture.status?.short,
    elapsed: f.fixture.status?.elapsed,
    venue: f.fixture.venue?.name,
    league: { id: f.league.id, name: f.league.name, logo: f.league.logo, round: f.league.round },
    home: { id: f.teams.home.id, name: f.teams.home.name, logo: f.teams.home.logo },
    away: { id: f.teams.away.id, name: f.teams.away.name, logo: f.teams.away.logo },
    goals: f.goals,
    broadcasters: [], // API-Football não traz broadcasters no plano padrão
  });
  const payload = {
    next: (next?.response || []).map(mapFx),
    live: (live?.response || []).map(mapFx),
  };

  // Resposta fresca veio totalmente vazia (ex.: limite de requisições da
  // API-Football momentâneo) mas já tínhamos jogos guardados — mantém o
  // último estado bom conhecido em vez de apagar o próximo jogo/a tabela
  // inteira do torcedor (a ausência de jogos vira "nenhuma competição
  // ativa" mais adiante, derrubando a tabela de classificação também).
  const cachedPayload = cached?.payload as { next?: unknown[]; live?: unknown[] } | undefined;
  const hadGoodCache = !!(cachedPayload && (((cachedPayload.next as unknown[])?.length ?? 0) > 0 || ((cachedPayload.live as unknown[])?.length ?? 0) > 0));
  const freshIsEmpty = payload.next.length === 0 && payload.live.length === 0;
  if (freshIsEmpty && hadGoodCache) {
    console.warn(`[getFixtures] fetch veio vazio para team=${teamId}, usando cache anterior`);
    return cachedPayload;
  }

  await supabase.from("team_fixtures_cache").upsert({
    team_id: teamId,
    payload,
    updated_at: new Date().toISOString(),
  });
  return payload;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!API_KEY) throw new Error("missing FOOTBALL_API_KEY");
    const body = await req.json();
    const clubName = body?.clubName;
    const teamIdIn = Number(body?.teamId);
    const hasId = Number.isInteger(teamIdIn) && teamIdIn > 0;
    if (!hasId && (!clubName || typeof clubName !== "string" || clubName.length > 100)) {
      return new Response(JSON.stringify({ error: "clubName inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let team = hasId ? await resolveTeamById(teamIdIn) : null;
    if (!team && typeof clubName === "string" && clubName.length <= 100) team = await resolveTeam(clubName);
    if (!team) {
      return new Response(
        JSON.stringify({ league: null, standings: [], me: null, fixtures: [], competitions: [], team: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const leagues = await getCurrentLeagues(team.id, team.name, team.logo);


    // Jogos ao vivo e recém-encerrados vêm do NOSSO banco (league_fixtures): nenhuma chamada à API por torcedor.
    const leagueIds = leagues.map((l: any) => l.id);
    const { data: lfRows } = leagueIds.length
      ? await supabase
          .from("league_fixtures")
          .select("fixture_id, league_id, status, goals_home, goals_away, home_id, away_id, kickoff, updated_at")
          .in("league_id", leagueIds)
          .gte("kickoff", new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString())
      : { data: [] as any[] };
    const FRESH_LIVE_MS = 15 * 60 * 1000;
    const liveByLeague = new Map<number, LiveGame[]>();
    const recentFinished = new Map<number, SeasonGame[]>();
    const hotLeagues = new Set<number>();
    for (const r of (lfRows || []) as any[]) {
      if (LIVE_NOW.has(r.status) && Date.now() - new Date(r.updated_at).getTime() < FRESH_LIVE_MS) {
        hotLeagues.add(r.league_id);
        const arr = liveByLeague.get(r.league_id) || [];
        arr.push({ id: r.fixture_id, h: r.home_id, a: r.away_id, gh: r.goals_home, ga: r.goals_away });
        liveByLeague.set(r.league_id, arr);
      } else if (FINISHED.has(r.status)) {
        hotLeagues.add(r.league_id);
        const arr = recentFinished.get(r.league_id) || [];
        arr.push({ id: r.fixture_id, date: r.kickoff, st: r.status, h: r.home_id, a: r.away_id, gh: r.goals_home, ga: r.goals_away });
        recentFinished.set(r.league_id, arr);
      }
    }

    const standingsResults = await Promise.all(
      leagues.map(async (lg: any) => {
        try {
          const st = await getStandings(lg.id, lg.season, false);
          // Achatar groups (pega o primeiro grupo do time, ou todos se for liga única)
          const flatRows: any[] = [];
          (st.groups || []).forEach((grp: any[], gi: number) => {
            grp.forEach((row: any) =>
              flatRows.push({
                group: st.groups.length > 1 ? `Grupo ${gi + 1}` : null,
                position: row.rank,
                name: row.team?.name,
                logo: row.team?.logo,
                teamId: row.team?.id,
                points: row.points ?? 0,
                played: row.all?.played ?? 0,
                win: row.all?.win ?? 0,
                draw: row.all?.draw ?? 0,
                lose: row.all?.lose ?? 0,
                goalsFor: row.all?.goals?.for ?? 0,
                goalsAgainst: row.all?.goals?.against ?? 0,
                goalsDiff: row.goalsDiff ?? 0,
                form: row.form,
              }),
            );
          });
          let rows = flatRows;
          // Liga com jogo rolando ou recém-encerrado: projeta a tabela (sem contar jogo 2x; desempate validado).
          if (hotLeagues.has(lg.id) && flatRows.length) {
            const season = await getSeasonGames(lg.id, lg.season, true);
            const byId = new Map<number, SeasonGame>(season.map((g) => [g.id, g]));
            for (const g of recentFinished.get(lg.id) || []) byId.set(g.id, g); // o nosso banco é mais fresco
            rows = projectStandings(flatRows as StRow[], {
              leagueId: lg.id,
              seasonGames: [...byId.values()],
              liveGames: liveByLeague.get(lg.id) || [],
            }).rows;
          }
          return { league: lg, standings: rows };
        } catch {
          return { league: lg, standings: [] };
        }
      }),
    );

    // "Ao vivo" do time vem do nosso banco (nunca guardado no cache de 5 min)
    const fixtures = { ...(await getFixtures(team.id)), live: await liveFromDb(team.id) };


    // VERDADE DE CAMPO: competição só está ativa se o time tem jogo futuro ou ao vivo nela.
    // Sem fixture pendente => time eliminado / torneio encerrado => não exibe.
    const activeLeagueIds = new Set<number>([
      ...fixtures.next.map((f: any) => f.league.id),
      ...fixtures.live.map((f: any) => f.league.id),
    ]);

    const competitions = standingsResults
      .filter((r) => activeLeagueIds.has(r.league.id))
      .map((r) => {
        const me = r.standings.find((row: any) => row.teamId === team.id) || null;
        const nextOfThis = fixtures.next.find((f: any) => f.league.id === r.league.id) || null;
        const liveOfThis = fixtures.live.find((f: any) => f.league.id === r.league.id) || null;
        return {
          leagueId: r.league.id,
          leagueName: r.league.name,
          leagueLogo: r.league.logo,
          country: r.league.country,
          season: r.league.season,
          standings: r.standings,
          me,
          nextMatch: nextOfThis,
          liveMatch: liveOfThis,
        };
      });

    // Shape legado: usa a primeira competição como "principal"
    const primary = competitions[0];
    const legacyStandings = primary
      ? primary.standings.map((s: any) => ({
          position: s.position,
          name: s.name,
          logo: s.logo,
          points: s.points,
        }))
      : [];

    return new Response(
      JSON.stringify({
        team,
        competitions,
        nextMatch: fixtures.next[0] || null,
        liveMatch: fixtures.live[0] || null,
        // legado
        league: primary?.leagueName || null,
        standings: legacyStandings,
        me: primary?.me
          ? { position: primary.me.position, name: primary.me.name, logo: primary.me.logo, points: primary.me.points }
          : null,
        fixtures: fixtures.next.slice(0, 3).map((f: any) => {
          const isHome = f.home.id === team.id;
          const op = isHome ? f.away : f.home;
          const dt = new Date(f.date);
          return {
            date: dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", ""),
            time: dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
            opponent: op.name,
            competition: f.league.name,
            broadcasters: [],
            home: isHome,
          };
        }),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("league-standings error:", e);
    return new Response(JSON.stringify({ error: "internal" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
