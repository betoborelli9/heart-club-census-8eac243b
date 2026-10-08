/**
 * [CAMINHO]: supabase/functions/fixtures-day-sync/index.ts
 * [MÓDULO]: CALENDÁRIO DO MUNDO — 1 chamada por dia de calendário (ontem, hoje e amanhã, em UTC) à API-Football
 * (/fixtures?date=) e guarda TODOS os jogos em league_fixtures. Roda poucas vezes por dia (cron); sem parâmetros.
 * Apaga jogos com mais de 3 dias. Não mexe em nenhuma outra tabela.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { toRow, type LeagueFixtureRow } from "../_shared/league-fixtures.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const API_KEY = Deno.env.get("API_FOOTBALL_KEY") || Deno.env.get("FOOTBALL_API_KEY") || "";
const API_BASE = "https://v3.football.api-sports.io";

const day = (offset: number) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (!API_KEY) return json({ error: "chave da API de jogos ausente" }, 500);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let total = 0;
  let calls = 0;
  const erros: string[] = [];

  for (const offset of [-1, 0, 1]) {
    const date = day(offset);
    try {
      calls++;
      const res = await fetch(`${API_BASE}/fixtures?date=${date}`, { headers: { "x-apisports-key": API_KEY } });
      if (!res.ok) throw new Error(`api ${res.status}`);
      const data = await res.json();
      const rows = ((data?.response || []) as any[]).map(toRow).filter(Boolean) as LeagueFixtureRow[];
      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await supabase.from("league_fixtures").upsert(rows.slice(i, i + 500), { onConflict: "fixture_id" });
        if (error) throw new Error(error.message);
      }
      total += rows.length;
    } catch (e) {
      erros.push(`${date}: ${String(e)}`);
    }
  }

  await supabase.from("league_fixtures").delete().lt("kickoff", new Date(Date.now() - 3 * 86400000).toISOString());

  return json({ ok: erros.length === 0, jogos_gravados: total, chamadas_api: calls, erros });
});
