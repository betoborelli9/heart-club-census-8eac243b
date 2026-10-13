/**
 * [CAMINHO]: supabase/functions/league-prognosis/index.ts
 * [MÓDULO]: PROBABILIDADES DO CAMPEONATO — chance de cada posição final, pontos finais esperados, pontos de corte por
 * posição e probabilidade de vitória/empate/derrota de cada jogo que falta. Funciona para qualquer campeonato de
 * pontos corridos do mundo que tenha tabela na API (as zonas — título, acesso, vagas, rebaixamento — vêm da própria
 * tabela oficial, linha a linha). Formatos sem tabela (copas) ou que não batem com os jogos devolvem "não suportado"
 * em vez de um número errado. Calculado no servidor e compartilhado: o celular só lê.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getFullSeason, type FullGame } from "../_shared/season-full.ts";
import { projectGroup, ruleFor, type SeasonGame, type StRow } from "../_shared/standings-projection.ts";
import {
  fitStrengths, lambdas, matchProbs, mulberry32, scheduleDifficulty, simsFor, simulateGroup, strengthSigma, validateRule,
  isFinishedGame, isRemainingGame, LIVE_ST, type GameIn, type SimGame, type SimTeam, type TieRule,
} from "../_shared/prognosis.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const API_KEY = Deno.env.get("API_FOOTBALL_KEY") || Deno.env.get("FOOTBALL_API_KEY") || "";
const API_BASE = "https://v3.football.api-sports.io";
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const K_SHRINK = 8; // validado no teste com jogos passados (900+ jogos de 4 campeonatos)
const SIGMA0 = 0.15; // incerteza de força dos times (teste em 5 temporadas completas: melhor Brier médio)
const MODEL_VERSION = "poisson-v1 k8 s0.15"; // gravado em cada foto diária para saber qual modelo fez cada previsão

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function af(path: string) {
  const res = await fetch(`${API_BASE}${path}`, { headers: { "x-apisports-key": API_KEY } });
  if (!res.ok) throw new Error(`api-football ${res.status}`);
  return await res.json();
}

type Row = { team: { id: number; name: string; logo: string }; rank: number; points: number; description?: string | null; all: any; goalsDiff: number };

function computeGroup(leagueId: number, rowsApi: Row[], gamesAll: (FullGame & { el?: number | null })[], teamName: Map<number, { name: string; logo: string | null }>) {
  const ids = rowsApi.map((r) => r.team.id);
  const idSet = new Set(ids);
  const inGroup = gamesAll.filter((g) => idSet.has(g.h) && idSet.has(g.a));
  const toIn = (g: FullGame & { el?: number | null }): GameIn => ({ id: g.id, h: g.h, a: g.a, gh: g.gh, ga: g.ga, st: g.st, el: g.el });
  const finished = inGroup.map(toIn).filter(isFinishedGame);
  const remaining = inGroup.map(toIn).filter(isRemainingGame);

  // 1) Os jogos precisam bater com a coluna "J" da tabela oficial (diferença de até 1 = a API ainda não contou o último jogo)
  const calc = new Map<number, number>(ids.map((i) => [i, 0]));
  for (const g of finished) {
    calc.set(g.h, (calc.get(g.h) || 0) + 1);
    calc.set(g.a, (calc.get(g.a) || 0) + 1);
  }
  for (const r of rowsApi) {
    const diff = Math.abs((calc.get(r.team.id) || 0) - (r.all?.played ?? 0));
    if (diff > 1) return { unsupported: "Formato do campeonato não suportado para probabilidades." };
  }
  if (finished.length + remaining.length === 0) return { unsupported: "Sem jogos para simular." };

  // 2) Estatísticas de partida: oficial + jogos encerrados que a API ainda não contou (sem contar nada 2x)
  const stRows: StRow[] = rowsApi.map((r) => ({
    teamId: r.team.id,
    position: r.rank,
    points: r.points ?? 0,
    played: r.all?.played ?? 0,
    win: r.all?.win ?? 0,
    draw: r.all?.draw ?? 0,
    lose: r.all?.lose ?? 0,
    goalsFor: r.all?.goals?.for ?? 0,
    goalsAgainst: r.all?.goals?.against ?? 0,
    goalsDiff: r.goalsDiff ?? 0,
  }));
  const seasonGames: SeasonGame[] = finished.map((g) => ({ id: g.id, date: inGroup.find((x) => x.id === g.id)!.date, st: g.st, h: g.h, a: g.a, gh: g.gh, ga: g.ga }));
  const base = projectGroup({ rows: stRows, leagueId, seasonGames, liveGames: [] });
  const baseRows = [...base.rows].sort((a, b) => a.position - b.position);

  const simTeams: SimTeam[] = baseRows.map((r) => ({ id: r.teamId, pos0: r.position, points: r.points, win: r.win, gf: r.goalsFor, ga: r.goalsAgainst }));
  const preferred: TieRule = ruleFor(leagueId) === "br" ? "br" : "gd";
  const rule = validateRule(preferred, simTeams);

  // 3) Força dos times e jogos que faltam
  const strengths = fitStrengths(finished, ids, K_SHRINK);
  const simGames: SimGame[] = [];
  const remainingOut: any[] = [];
  for (const g of remaining) {
    const { lh, la } = lambdas(strengths, g.h, g.a);
    const live = LIVE_ST.has(g.st);
    const minute = g.st === "HT" ? 45 : Math.max(0, Math.min(90, g.el ?? 0));
    const frac = live ? (g.st === "ET" || g.st === "BT" || g.st === "P" ? 0.04 : Math.max(0.02, (90 - minute) / 90)) : 1;
    const gh0 = live ? g.gh ?? 0 : 0;
    const ga0 = live ? g.ga ?? 0 : 0;
    simGames.push({ h: g.h, a: g.a, lh, la, gh0, ga0, frac });
    const p = matchProbs(lh * frac, la * frac, gh0, ga0);
    const full = inGroup.find((x) => x.id === g.id)!;
    remainingOut.push({
      sh: 0, sa: 0, // preenchidos depois (força dos dois times)
      id: g.id, date: full.date, h: g.h, a: g.a, hn: full.hn, an: full.an, hl: full.hl, al: full.al,
      pH: Math.round(p.pH * 1000) / 1000, pD: Math.round(p.pD * 1000) / 1000, pA: Math.round(p.pA * 1000) / 1000,
      live: live ? { gh: g.gh ?? 0, ga: g.ga ?? 0, el: g.el ?? null, st: g.st } : null,
    });
  }

  {
    const rt = (i: number) => (strengths.att.get(i) ?? 1) / (strengths.def.get(i) ?? 1);
    const order = [...ids].sort((a, b) => rt(a) - rt(b));
    const idx = new Map<number, number>(order.map((id, k) => [id, order.length > 1 ? Math.round((k / (order.length - 1)) * 100) : 50]));
    for (const g of remainingOut) {
      g.sh = idx.get(g.h) ?? 50;
      g.sa = idx.get(g.a) ?? 50;
    }
  }
  const sims = simsFor(ids.length, simGames.length);
  const sigma = strengthSigma(baseRows.map((r) => r.played), SIGMA0, 10);
  const sim = simulateGroup(simTeams, simGames, rule === "official" ? "official" : rule, sims, mulberry32(leagueId * 1009 + finished.length), sigma);
  const diff = scheduleDifficulty(strengths, ids, remaining);
  // Força de cada time (ataque ÷ defesa), em índice 0–100 dentro do grupo: quanto maior, mais forte
  const rating = (i: number) => (strengths.att.get(i) ?? 1) / (strengths.def.get(i) ?? 1);
  const ranked = [...ids].sort((a, b) => rating(a) - rating(b));
  const strengthIdx = new Map<number, number>(ranked.map((id, k) => [id, ranked.length > 1 ? Math.round((k / (ranked.length - 1)) * 100) : 50]));
  // Campanha em casa e fora (fatos do campeonato até agora)
  const ppg = (id: number, home: boolean) => {
    const mine = finished.filter((g) => (home ? g.h === id : g.a === id));
    if (!mine.length) return { v: null as number | null, n: 0 };
    const pts = mine.reduce((a, g) => {
      const f = (home ? g.gh : g.ga) as number;
      const c = (home ? g.ga : g.gh) as number;
      return a + (f > c ? 3 : f === c ? 1 : 0);
    }, 0);
    return { v: Math.round((pts / mine.length) * 100) / 100, n: mine.length };
  };

  // 4) Zonas: a própria tabela oficial diz o que cada posição vale (descrição por linha)
  const zoneMap = new Map<string, number[]>();
  for (const r of rowsApi) {
    const d = (r.description || "").trim();
    if (d) zoneMap.set(d, [...(zoneMap.get(d) || []), r.rank]);
  }
  const zones = [...zoneMap.entries()].map(([label, positions]) => ({ label, positions: positions.sort((a, b) => a - b) }));

  const teams = baseRows.map((r, i) => {
    const meta = teamName.get(r.teamId);
    const api = rowsApi.find((x) => x.team.id === r.teamId)!;
    const zoneProb: Record<string, number> = {};
    for (const z of zones) zoneProb[z.label] = Math.round(z.positions.reduce((a, p) => a + (sim.dist[i][p - 1] ?? 0), 0) * 1000) / 1000;
    return {
      id: r.teamId,
      name: meta?.name ?? api.team.name,
      logo: meta?.logo ?? api.team.logo,
      position: r.position,
      points: r.points,
      played: r.played,
      remaining: remaining.filter((g) => g.h === r.teamId || g.a === r.teamId).length,
      dist: sim.dist[i],
      expPoints: sim.expPoints[i],
      p10: sim.ptsP10[i],
      p90: sim.ptsP90[i],
      title: sim.dist[i][0] ?? 0,
      zoneProb,
      difficulty: diff.get(r.teamId) ?? 50,
      strength: strengthIdx.get(r.teamId) ?? 50,
      homePpg: ppg(r.teamId, true).v,
      awayPpg: ppg(r.teamId, false).v,
      homeLeft: remaining.filter((g) => g.h === r.teamId).length,
      awayLeft: remaining.filter((g) => g.a === r.teamId).length,
    };
  });

  return {
    teams,
    zones,
    cutMedian: sim.cutMedian,
    remaining: remainingOut,
    meta: { sims, finishedGames: finished.length, remainingGames: remaining.length, rule, minPlayed: Math.min(...stRows.map((r) => r.played)), tieRuleChecked: true },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!API_KEY) return json({ error: "chave da API ausente" }, 500);
    const body = await req.json().catch(() => ({}));
    const leagueId = Number(body?.leagueId);
    const season = Number(body?.season);
    if (![leagueId, season].every((n) => Number.isInteger(n) && n > 0) || season < 2000 || season > 2100) return json({ error: "parâmetros inválidos" }, 400);

    const { data: st } = await supabase.from("competition_standings_cache").select("standings_json, updated_at").eq("league_id", leagueId).eq("season", season).maybeSingle();
    if (!st) return json({ error: "campeonato não encontrado" }, 404);
    let groups: Row[][] = (st.standings_json as any)?.groups || [];
    // Tabela oficial velha (ninguém abriu este campeonato há mais de 20 min): renova (1 chamada) antes de calcular
    if (groups.length && Date.now() - new Date((st as any).updated_at).getTime() > 20 * 60 * 1000) {
      try {
        const j = await af(`/standings?league=${leagueId}&season=${season}`);
        const fresh = j?.response?.[0]?.league?.standings || [];
        if (fresh.length) {
          groups = fresh;
          await supabase.from("competition_standings_cache").upsert({
            league_id: leagueId, season, league_name: j.response[0].league.name,
            standings_json: { groups: fresh, league_name: j.response[0].league.name }, updated_at: new Date().toISOString(),
          });
        }
      } catch (e) {
        console.warn("[league-prognosis] não consegui renovar a tabela oficial, usando a guardada:", e);
      }
    }
    if (!groups.length || groups.every((g) => g.length < 4)) return json({ supported: false, reason: "Este campeonato não tem tabela de pontos corridos." });

    const { data: lf } = await supabase
      .from("league_fixtures")
      .select("fixture_id, status, goals_home, goals_away, elapsed, updated_at, kickoff")
      .eq("league_id", leagueId)
      .gte("kickoff", new Date(Date.now() - 10 * 3600 * 1000).toISOString());
    const recent = (lf || []) as any[];
    const hasLive = recent.some((r) => LIVE_ST.has(r.status));
    const hot = hasLive || recent.some((r) => ["FT", "AET", "PEN"].includes(r.status));

    const full = await getFullSeason({ supabase, af }, leagueId, season, hot);
    if (!full) return json({ error: "temporada indisponível agora" }, 503);
    const liveMap = new Map<number, any>(recent.map((r) => [Number(r.fixture_id), r]));
    const games = full.games.map((g) => {
      const o = liveMap.get(g.id);
      return o ? { ...g, st: o.status, gh: o.goals_home, ga: o.goals_away, el: o.elapsed } : g;
    });

    // Cache: mesma contagem de jogos encerrados + mesmo placar ao vivo = mesmo resultado
    const finishedCount = games.filter((g) => ["FT", "AET", "PEN", "AWD", "WO"].includes(g.st) && g.gh != null && g.ga != null).length;
    const liveSig = games.filter((g) => LIVE_ST.has(g.st)).map((g) => `${g.id}:${g.gh}-${g.ga}`).sort().join(",");
    const stSig = groups.flat().reduce((a, r: any) => a + (r.points || 0) * 31 + (r.all?.played || 0), 0);
    const signature = `v2|${finishedCount}|${liveSig}|${stSig}`;
    const { data: cached } = await supabase.from("league_prognosis").select("payload, signature, computed_at").eq("league_id", leagueId).eq("season", season).maybeSingle();
    if (cached) {
      const age = Date.now() - new Date(cached.computed_at).getTime();
      if (cached.signature === signature && age < 6 * 3600 * 1000) return json(cached.payload);
      if (hasLive && age < 60 * 1000) return json(cached.payload); // jogo rolando: no máximo 1 cálculo por minuto
    }

    const names = new Map<number, { name: string; logo: string | null }>();
    for (const g of games) {
      names.set(g.h, { name: g.hn, logo: g.hl });
      names.set(g.a, { name: g.an, logo: g.al });
    }

    const out = groups.map((rows, gi) => ({ group: groups.length > 1 ? `Grupo ${gi + 1}` : null, ...computeGroup(leagueId, rows, games as any, names) }));
    const supported = out.some((g: any) => !g.unsupported);
    const payload = {
      supported,
      reason: supported ? null : (out[0] as any).unsupported,
      league: { id: leagueId, season, name: full.meta.league_name, logo: full.meta.league_logo, country: full.meta.country },
      groups: out,
      computedAt: new Date().toISOString(),
    };
    await supabase.from("league_prognosis").upsert({ league_id: leagueId, season, payload, signature, computed_at: new Date().toISOString() });

    // Foto do dia (só a primeira do dia, em UTC): serve para medir a precisão quando o campeonato terminar
    if (supported) {
      try {
        const day = new Date().toISOString().slice(0, 10);
        const { count } = await supabase.from("prognosis_history").select("team_id", { count: "exact", head: true }).eq("league_id", leagueId).eq("season", season).eq("day", day);
        if (!count) {
          const rows: any[] = [];
          for (const g of out as any[]) {
            if (g.unsupported) continue;
            for (const tm of g.teams) {
              rows.push({
                league_id: leagueId, season, day, group_label: g.group || "", team_id: tm.id, team_name: tm.name, position: tm.position, points: tm.points,
                played: tm.played, remaining: tm.remaining, exp_points: tm.expPoints, p10: tm.p10, p90: tm.p90, title: tm.title, zone_prob: tm.zoneProb,
                dist: tm.dist, zones: g.zones, model_version: MODEL_VERSION,
              });
            }
          }
          if (rows.length) await supabase.from("prognosis_history").upsert(rows, { onConflict: "league_id,season,day,group_label,team_id" });
        }
      } catch (e) {
        console.warn("[league-prognosis] não consegui guardar a foto do dia:", e);
      }
    }
    return json(payload);
  } catch (e) {
    console.error("league-prognosis error:", e);
    return json({ error: "internal" }, 500);
  }
});
