/**
 * [CAMINHO]: supabase/functions/fixtures-live-scores/index.ts
 * [MÓDULO]: PLACAR AO VIVO DO MUNDO — a cada execução (cron de 1 min, só quando há jogo na janela) faz várias
 * rodadas curtas: 1 chamada /fixtures?live=all (todos os jogos ao vivo do planeta) e grava só o que mudou em
 * league_fixtures; o site recebe por Realtime. Jogos que acabaram (sumiram do "ao vivo") são fechados com
 * /fixtures?ids= (até 20 por chamada). Protege a cota diária da API (lê o saldo no cabeçalho de cada resposta).
 * Torcedor nunca chama a API: só lê a tabela.
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

const ROUND_SECONDS = 20; // intervalo entre rodadas dentro de uma execução
const RUN_SECONDS = 52; // cada execução dura menos de 1 minuto (o cron dispara a próxima)
const SLOW_BELOW = 1500; // saldo diário abaixo disso: 1 rodada por minuto
const STOP_BELOW = 300; // saldo diário abaixo disso: para (reserva para o resto do site)
const OPEN = ["NS", "TBD", "1H", "HT", "2H", "ET", "BT", "P", "LIVE", "INT"];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (!API_KEY) return json({ error: "chave da API de jogos ausente" }, 500);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: gotLock } = await supabase.rpc("hc_take_live_lock", { p_seconds: 45 });
  if (!gotLock) return json({ ok: true, skipped: "já existe uma execução em andamento" });

  const work = async () => {
    const started = Date.now();
    let remaining = Infinity;
    let calls = 0;
    let writes = 0;

    const af = async (path: string) => {
      calls++;
      const res = await fetch(`${API_BASE}${path}`, { headers: { "x-apisports-key": API_KEY } });
      const rem = Number(res.headers.get("x-ratelimit-requests-remaining"));
      if (Number.isFinite(rem)) remaining = rem;
      if (!res.ok) throw new Error(`api ${res.status}`);
      return await res.json();
    };

    const save = async (rows: LeagueFixtureRow[]) => {
      if (!rows.length) return;
      // Só grava o que mudou (placar/status) — o relógio dos minutos o site calcula sozinho.
      const ids = rows.map((r) => r.fixture_id);
      const { data: old } = await supabase.from("league_fixtures").select("fixture_id, status, goals_home, goals_away, elapsed, updated_at").in("fixture_id", ids);
      const prev = new Map<number, any>((old || []).map((o: any) => [Number(o.fixture_id), o]));
      const now = Date.now();
      const changed = rows.filter((r) => {
        const o = prev.get(r.fixture_id);
        if (!o) return true;
        if (o.status !== r.status || o.goals_home !== r.goals_home || o.goals_away !== r.goals_away) return true;
        // reancora o relógio de minutos pelo menos 1x por minuto
        return r.elapsed !== o.elapsed && now - new Date(o.updated_at).getTime() > 55_000;
      });
      for (let i = 0; i < changed.length; i += 300) {
        const { error } = await supabase.from("league_fixtures").upsert(changed.slice(i, i + 300), { onConflict: "fixture_id" });
        if (error) console.error("[live-scores] upsert", error.message);
      }
      writes += changed.length;
    };

    let round = 0;
    while (Date.now() - started < RUN_SECONDS * 1000) {
      if (remaining < STOP_BELOW) break;
      try {
        const live = await af("/fixtures?live=all");
        const rows = ((live?.response || []) as any[]).map(toRow).filter(Boolean) as LeagueFixtureRow[];
        await save(rows);

        // Fecha jogos que já deveriam ter começado/terminado e não aparecem mais como "ao vivo".
        if (round % 3 === 0) {
          const liveIds = new Set(rows.map((r) => r.fixture_id));
          const { data: open } = await supabase
            .from("league_fixtures")
            .select("fixture_id")
            .in("status", OPEN)
            .lte("kickoff", new Date(Date.now() - 4 * 60 * 1000).toISOString())
            .gte("kickoff", new Date(Date.now() - 6 * 3600 * 1000).toISOString())
            .limit(200);
          const missing = (open || []).map((o: any) => Number(o.fixture_id)).filter((id: number) => !liveIds.has(id));
          for (let i = 0; i < missing.length && remaining >= STOP_BELOW; i += 20) {
            const chunk = missing.slice(i, i + 20);
            const res = await af(`/fixtures?ids=${chunk.join("-")}`);
            await save(((res?.response || []) as any[]).map(toRow).filter(Boolean) as LeagueFixtureRow[]);
          }
        }
      } catch (e) {
        console.error("[live-scores] rodada falhou:", e);
      }
      round++;
      if (remaining < SLOW_BELOW) break; // pouca cota: 1 rodada por execução
      if (Date.now() - started + ROUND_SECONDS * 1000 >= RUN_SECONDS * 1000) break;
      await sleep(ROUND_SECONDS * 1000);
    }
    console.log(`[live-scores] rodadas=${round} chamadas=${calls} gravacoes=${writes} saldo=${remaining}`);
    return { rodadas: round, chamadas: calls, gravacoes: writes, saldo_api: Number.isFinite(remaining) ? remaining : null };
  };

  // Responde já (o cron não fica esperando) e termina o trabalho em segundo plano.
  const g: any = globalThis;
  if (g.EdgeRuntime?.waitUntil) {
    g.EdgeRuntime.waitUntil(work());
    return json({ ok: true, background: true });
  }
  return json({ ok: true, ...(await work()) });
});
