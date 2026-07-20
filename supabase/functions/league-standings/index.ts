/**
 * [EDGE FUNCTION]: league-standings
 * Engine global de competições via API-Football.
 * - /leagues?team=X&current=true (24h cache em team_leagues_mapping)
 * - /standings (15min cache em competition_standings_cache)
 * - /fixtures next + live (1min cache em team_fixtures_cache)
 * Mantém shape legado { league, standings, me, fixtures } para ObjectivesPanel/Z4Infographic.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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


async function resolveTeam(clubName: string): Promise<{ id: number; name: string; logo: string } | null> {
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
  // 2) busca na API
  const j = await af(`/teams?search=${encodeURIComponent(clubName)}`);
  const r = j?.response?.[0]?.team;
  if (!r) return null;
  return { id: r.id, name: r.name, logo: r.logo };
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
  const TTL_2M = 2 * 60 * 1000;
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

async function getFixtures(teamId: number) {
  const TTL_1M = 60 * 1000;
  const { data: cached } = await supabase
    .from("team_fixtures_cache")
    .select("payload, updated_at")
    .eq("team_id", teamId)
    .maybeSingle();
  if (cached && Date.now() - new Date(cached.updated_at as any).getTime() < TTL_1M) {
    return cached.payload as any;
  }
  const [next, live] = await Promise.all([
    af(`/fixtures?team=${teamId}&next=15`).catch(() => ({ response: [] })),
    af(`/fixtures?team=${teamId}&live=all`).catch(() => ({ response: [] })),
  ]);
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
    const { clubName } = await req.json();
    if (!clubName || typeof clubName !== "string" || clubName.length > 100) {
      return new Response(JSON.stringify({ error: "clubName inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const team = await resolveTeam(clubName);
    if (!team) {
      return new Response(
        JSON.stringify({ league: null, standings: [], me: null, fixtures: [], competitions: [], team: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const leagues = await getCurrentLeagues(team.id, team.name, team.logo);


    // Para classificação AO VIVO: buscar todas as partidas em curso de cada liga ativa
    // e aplicar deltas (pontos / J / V / E / D / SG) provisórios em cima do standings oficial.
    const liveByLeague = new Map<number, any[]>();
    await Promise.all(
      leagues.map(async (lg: any) => {
        try {
          const j = await af(`/fixtures?league=${lg.id}&season=${lg.season}&live=all`);
          const arr = (j?.response || []).filter((f: any) => f?.fixture?.status?.short && f.fixture.status.short !== "NS");
          if (arr.length) liveByLeague.set(lg.id, arr);
        } catch {
          // silencioso — segue com standings oficiais
        }
      }),
    );

    // Standings em paralelo (bypass cache quando há jogo ao vivo na liga)
    const standingsResults = await Promise.all(
      leagues.map(async (lg: any) => {
        try {
          const hasLive = liveByLeague.has(lg.id);
          const s = await getStandings(lg.id, lg.season, hasLive);
          // Achatar groups (pega o primeiro grupo do time, ou todos se for liga única)
          const flatRows: any[] = [];
          (s.groups || []).forEach((grp: any[], gi: number) => {
            grp.forEach((row: any) =>
              flatRows.push({
                group: s.groups.length > 1 ? `Grupo ${gi + 1}` : null,
                position: row.rank,
                name: row.team?.name,
                logo: row.team?.logo,
                teamId: row.team?.id,
                points: row.points,
                played: row.all?.played,
                win: row.all?.win,
                draw: row.all?.draw,
                lose: row.all?.lose,
                goalsDiff: row.goalsDiff,
                form: row.form,
              }),
            );
          });
          // Aplica deltas ao vivo
          const liveFx = liveByLeague.get(lg.id) || [];
          if (liveFx.length && flatRows.length) {
            const byId = new Map<number, any>();
            flatRows.forEach((r) => r.teamId && byId.set(r.teamId, r));
            for (const f of liveFx) {
              const hId = f.teams?.home?.id;
              const aId = f.teams?.away?.id;
              const hG = f.goals?.home ?? 0;
              const aG = f.goals?.away ?? 0;
              const rh = hId ? byId.get(hId) : null;
              const ra = aId ? byId.get(aId) : null;
              const apply = (row: any, gf: number, ga: number, result: "W" | "D" | "L") => {
                if (!row) return;
                row.played = (row.played ?? 0) + 1;
                row.goalsDiff = (row.goalsDiff ?? 0) + (gf - ga);
                if (result === "W") {
                  row.points = (row.points ?? 0) + 3;
                  row.win = (row.win ?? 0) + 1;
                } else if (result === "D") {
                  row.points = (row.points ?? 0) + 1;
                  row.draw = (row.draw ?? 0) + 1;
                } else {
                  row.lose = (row.lose ?? 0) + 1;
                }
                row.isLive = true;
              };
              const homeRes = hG > aG ? "W" : hG === aG ? "D" : "L";
              const awayRes = aG > hG ? "W" : aG === hG ? "D" : "L";
              apply(rh, hG, aG, homeRes);
              apply(ra, aG, hG, awayRes);
            }
            // Reordena e recalcula posição (provisória)
            flatRows.sort((a, b) =>
              (b.points ?? 0) - (a.points ?? 0) ||
              (b.goalsDiff ?? 0) - (a.goalsDiff ?? 0) ||
              (b.win ?? 0) - (a.win ?? 0),
            );
            flatRows.forEach((r, i) => (r.position = i + 1));
          }
          return { league: lg, standings: flatRows };
        } catch {
          return { league: lg, standings: [] };
        }
      }),
    );

    const fixtures = await getFixtures(team.id);


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
