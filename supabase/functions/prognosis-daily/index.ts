/**
 * [CAMINHO]: supabase/functions/prognosis-daily/index.ts
 * [MÓDULO]: FOTO DIÁRIA DAS PREVISÕES — chama league-prognosis para os campeonatos consultados nos últimos 7 dias
 * (cada chamada guarda a previsão do dia em prognosis_history). Roda 1x/dia pelo cron; sem parâmetros.
 * Serve para medir, quando os campeonatos terminarem, o quanto o Heart Club acertou.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const MAX_LEAGUES = 60;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(url, key);

  const { data } = await supabase
    .from("competition_standings_cache")
    .select("league_id, season, league_name, updated_at")
    .gte("updated_at", new Date(Date.now() - 7 * 86400000).toISOString())
    .neq("league_name", "backtest")
    .order("updated_at", { ascending: false })
    .limit(MAX_LEAGUES);

  let ok = 0;
  let unsupported = 0;
  let failed = 0;
  for (const row of (data || []) as any[]) {
    try {
      const res = await fetch(`${url}/functions/v1/league-prognosis`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, apikey: key },
        body: JSON.stringify({ leagueId: row.league_id, season: row.season }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || j?.error) failed++;
      else if (j?.supported) ok++;
      else unsupported++;
    } catch {
      failed++;
    }
  }
  return json({ ok: true, campeonatos: (data || []).length, com_previsao: ok, sem_tabela: unsupported, falhas: failed });
});
