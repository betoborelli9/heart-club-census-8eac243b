/**
 * [EDGE FUNCTION] fixtures-live-poll
 *
 * Cron: a cada 1 minuto.
 *
 * GUARDA DE QUOTA — early-exit (custo ZERO API):
 *   1) Lê team_fixtures_cache.
 *   2) Calcula localmente quais fixtures podem estar AO VIVO agora
 *      (kickoff <= now <= kickoff + 150min). Se NENHUM, retorna sem chamar API.
 *
 * Para cada fixture potencialmente ao vivo:
 *   - 1 call em /fixtures?id={id} (status + placar)
 *   - se houve novo gol vs último estado em cache: 1 call /fixtures/events
 *
 * QUOTA pior caso: ~150 calls por jogo (status a cada minuto durante 150min)
 *   + ~3-10 calls de eventos por gol. Domingo de 5 jogos simultâneos = ~800 calls.
 *
 * Dispara push para: KICKOFF (status muda NS→1H), GOL (events delta),
 * FULLTIME (status muda para FT/AET/PEN).
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const API_KEY = Deno.env.get("FOOTBALL_API_KEY") || "";
const API_BASE = "https://v3.football.api-sports.io";
const FUNCTIONS_BASE = `${Deno.env.get("SUPABASE_URL")}/functions/v1`;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, SERVICE_KEY);

async function af(path: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "x-apisports-key": API_KEY },
  });
  if (!res.ok) throw new Error(`api-football ${res.status}`);
  return await res.json();
}

async function pushToFans(teamId: number, type: string, title: string, body: string, payload: any) {
  const { data: users } = await supabase
    .from("profiles").select("id").eq("time_do_coracao_id", teamId);
  if (!users?.length) return;
  await Promise.all(users.map((u: any) =>
    fetch(`${FUNCTIONS_BASE}/push-send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
      body: JSON.stringify({ user_id: u.id, type, title, body, payload }),
    }).catch((e) => console.error("push-send fail:", e))
  ));
}

const LIVE_STATUSES = new Set(["1H", "2H", "HT", "ET", "BT", "P", "LIVE"]);
const DONE_STATUSES = new Set(["FT", "AET", "PEN"]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (!API_KEY) throw new Error("missing FOOTBALL_API_KEY");

    const now = Date.now();
    const { data: rows } = await supabase
      .from("team_fixtures_cache").select("team_id, payload");

    // 1) Filtro local — janela viva: kickoff <= now <= kickoff+150min
    const candidates: Array<{ teamId: number; fx: any; liveState: any; row: any }> = [];
    for (const row of rows || []) {
      const next = (row.payload?.next || []) as any[];
      const live = (row.payload?.live_state || {}) as Record<string, any>;
      for (const fx of next) {
        const t = new Date(fx.date).getTime();
        if (t <= now && now <= t + 150 * 60 * 1000) {
          // Skip se já marcado como finalizado
          if (live[fx.id]?.finished) continue;
          candidates.push({ teamId: row.team_id, fx, liveState: live[fx.id] || null, row });
        }
      }
    }

    if (candidates.length === 0) {
      return new Response(JSON.stringify({ scanned: 0, api_calls: 0, msg: "no live window" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Dedup por fixture_id (mesmo jogo pode aparecer em times diferentes)
    const uniqueFixtures = new Map<number, typeof candidates[0]>();
    for (const c of candidates) if (!uniqueFixtures.has(c.fx.id)) uniqueFixtures.set(c.fx.id, c);

    let apiCalls = 0;
    const updatedRows = new Map<number, any>();

    for (const [fixtureId, c] of uniqueFixtures) {
      apiCalls++;
      const j = await af(`/fixtures?id=${fixtureId}`);
      const f = j?.response?.[0];
      if (!f) continue;

      const status = f.fixture.status?.short;
      const goalsHome = f.goals?.home ?? 0;
      const goalsAway = f.goals?.away ?? 0;
      const prev = c.liveState || { status: "NS", goalsHome: 0, goalsAway: 0, finished: false };

      // KICKOFF
      if (prev.status === "NS" && LIVE_STATUSES.has(status)) {
        await pushToFans(c.teamId, "kickoff",
          "Bola rolando!",
          `${f.teams.home.name} ${goalsHome}x${goalsAway} ${f.teams.away.name}`,
          { fixture_id: fixtureId });
      }

      // GOL
      const newGoals = (goalsHome + goalsAway) > (prev.goalsHome + prev.goalsAway);
      if (newGoals) {
        apiCalls++;
        const ev = await af(`/fixtures/events?fixture=${fixtureId}`);
        const goalEvents = (ev?.response || []).filter((e: any) => e.type === "Goal");
        const last = goalEvents[goalEvents.length - 1];
        const author = last?.player?.name || "Gol";
        const teamName = last?.team?.name || "";
        await pushToFans(c.teamId, "goal",
          `⚽ GOL! ${teamName}`,
          `${author} — ${f.teams.home.name} ${goalsHome}x${goalsAway} ${f.teams.away.name}`,
          { fixture_id: fixtureId, author, team: teamName });
      }

      // FULLTIME
      const finished = DONE_STATUSES.has(status);
      if (finished && !prev.finished) {
        await pushToFans(c.teamId, "fulltime",
          "Fim de jogo",
          `${f.teams.home.name} ${goalsHome}x${goalsAway} ${f.teams.away.name}`,
          { fixture_id: fixtureId });
      }

      // Atualiza cache do row dono
      const row = c.row;
      const liveState = (row.payload?.live_state || {});
      liveState[fixtureId] = { status, goalsHome, goalsAway, finished, updated_at: new Date().toISOString() };
      row.payload.live_state = liveState;
      updatedRows.set(row.team_id, row);
    }

    for (const row of updatedRows.values()) {
      await supabase.from("team_fixtures_cache").upsert({
        team_id: row.team_id,
        payload: row.payload,
        updated_at: new Date().toISOString(),
      });
    }

    return new Response(
      JSON.stringify({ scanned: uniqueFixtures.size, api_calls: apiCalls }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("fixtures-live-poll error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
