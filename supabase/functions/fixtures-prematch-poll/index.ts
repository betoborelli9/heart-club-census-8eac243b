/**
 * [EDGE FUNCTION] fixtures-prematch-poll
 *
 * Cron: a cada 5 minutos.
 *
 * Lê team_fixtures_cache, filtra fixtures que começam nos PRÓXIMOS 60 minutos
 * e que ainda NÃO têm lineup_ready. Para esses fixtures, chama
 * /fixtures/lineups?fixture={id}. Quando vier, marca lineup_ready=true no payload
 * e dispara push "alert_lineup" via push-send.
 *
 * QUOTA: 1 call por fixture pendente por execução. Tipicamente 0–2 fixtures
 * simultâneos. Pior caso (10 fixtures pendentes, 12 execuções na janela de 1h):
 * já vira lineup_ready na 1ª chamada que retorna lineup, então ~1-3 calls/fixture.
 *
 * NÃO chama nada se nenhum fixture estiver na janela. Custo = 0 a maior parte do dia.
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

async function sendPushToTeamFans(teamId: number, type: string, title: string, body: string, payload: any) {
  // Encontra usuários que torcem por este time e têm o alerta ativo
  const { data: users } = await supabase
    .from("profiles")
    .select("id")
    .eq("time_do_coracao_id", teamId);

  if (!users?.length) return;

  for (const u of users) {
    await fetch(`${FUNCTIONS_BASE}/push-send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ user_id: u.id, type, title, body, payload }),
    }).catch((e) => console.error("push-send fail:", e));
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (!API_KEY) throw new Error("missing FOOTBALL_API_KEY");

    const now = Date.now();
    const horizon = now + 60 * 60 * 1000; // 60 min

    const { data: rows } = await supabase
      .from("team_fixtures_cache")
      .select("team_id, payload, updated_at");

    let apiCalls = 0;
    for (const row of rows || []) {
      const next = (row.payload?.next || []) as any[];
      const lineupsCache = (row.payload?.lineups || {}) as Record<string, any>;
      let changed = false;

      for (const fx of next) {
        const t = new Date(fx.date).getTime();
        if (t < now || t > horizon) continue;
        if (lineupsCache[fx.id]?.ready) continue;

        // Busca lineup
        apiCalls++;
        const j = await af(`/fixtures/lineups?fixture=${fx.id}`);
        const lineups = j?.response || [];

        if (lineups.length >= 2) {
          lineupsCache[fx.id] = { ready: true, data: lineups, fetched_at: new Date().toISOString() };
          changed = true;

          // Dispara push para fãs do time-do-coração
          await sendPushToTeamFans(
            row.team_id,
            "lineup",
            "Escalação confirmada!",
            `${fx.home.name} x ${fx.away.name} — escalações divulgadas.`,
            { fixture_id: fx.id },
          );
        } else {
          lineupsCache[fx.id] = { ready: false, last_check: new Date().toISOString() };
          changed = true;
        }
      }

      if (changed) {
        await supabase.from("team_fixtures_cache").upsert({
          team_id: row.team_id,
          payload: { ...row.payload, lineups: lineupsCache },
          updated_at: new Date().toISOString(),
        });
      }
    }

    return new Response(
      JSON.stringify({ teams_scanned: rows?.length || 0, api_calls: apiCalls }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("fixtures-prematch-poll error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
