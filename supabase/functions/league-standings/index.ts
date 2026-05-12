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
  return res.json();
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
    if (Array.isArray(lj.leagues)) return lj.leagues;
  }
  const j = await af(`/leagues?team=${teamId}&current=true`);
  const leagues = (j?.response || [])
    .filter((x: any) => x?.seasons?.[0]?.current)
    .map((x: any) => ({
      id: x.league.id,
      name: x.league.name,
      logo: x.league.logo,
      type: x.league.type,
      country: x.country?.name,
      season: x.seasons[0].year,
    }));
  await supabase.from("team_leagues_mapping").upsert({
    team_id: teamId,
    team_name: teamName,
    leagues_json: { leagues, team_logo: teamLogo },
    updated_at: new Date().toISOString(),
  });
  return leagues;
}

async function getStandings(leagueId: number, season: number) {
  const TTL_15M = 15 * 60 * 1000;
  const { data: cached } = await supabase
    .from("competition_standings_cache")
    .select("standings_json, updated_at")
    .eq("league_id", leagueId)
    .eq("season", season)
    .maybeSingle();
  if (cached && Date.now() - new Date(cached.updated_at as any).getTime() < TTL_15M) {
    return cached.standings_json as any;
  }
  const j = await af(`/standings?league=${leagueId}&season=${season}`);
  const groups = j?.response?.[0]?.league?.standings || [];
  const payload = { groups, league_name: j?.response?.[0]?.league?.name };
  await supabase.from("competition_standings_cache").upsert({
    league_id: leagueId,
    season,
    league_name: payload.league_name,
    standings_json: payload,
    updated_at: new Date().toISOString(),
  });
  return payload;
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

    // Standings em paralelo
    const standingsResults = await Promise.all(
      leagues.map(async (lg: any) => {
        try {
          const s = await getStandings(lg.id, lg.season);
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
          return { league: lg, standings: flatRows };
        } catch {
          return { league: lg, standings: [] };
        }
      }),
    );

    const fixtures = await getFixtures(team.id);

    // Competições onde o time aparece nas standings
    const competitions = standingsResults
      .filter((r) => r.standings.some((row: any) => row.teamId === team.id))
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
