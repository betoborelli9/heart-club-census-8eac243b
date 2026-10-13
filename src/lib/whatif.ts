/**
 * [CAMINHO]: src/lib/whatif.ts
 * [MÓDULO]: Simulador "E se...?" — o torcedor coloca placares nos jogos que faltam e vê a tabela e as chances mudarem.
 * Reaproveita o MESMO motor do servidor (supabase/functions/_shared/prognosis.ts): os jogos com placar do torcedor valem
 * como resultado final; os demais seguem o modelo (taxas de gol enviadas pelo servidor). Tudo roda no celular, sem gravar nada.
 */
import { mulberry32, orderIndexes, simulateGroup, type SimGame, type SimTeam, type TieRule } from "../../supabase/functions/_shared/prognosis";

export type WTeam = { id: number; position: number; points: number; played: number; win: number; gf: number; ga: number; sg?: number };
export type WGame = { id: number; h: number; a: number; lh: number; la: number; frac: number; g0h: number; g0a: number };
export type Pick = { h: number; a: number };

export type TableRow = { id: number; pos: number; points: number; played: number; gd: number; delta: number };
export type WhatIfResult = {
  /** Tabela com os placares do torcedor aplicados (sem sorteio): é a tabela "se fosse hoje". */
  table: TableRow[];
  /** dist[time][posição-1] — chance de cada posição FINAL, com os placares do torcedor + modelo no resto. */
  dist: Map<number, number[]>;
  expPoints: Map<number, number>;
  sims: number;
};

const rank = (rule: TieRule, rows: { points: number; win: number; gf: number; ga: number; pos0: number }[]) =>
  orderIndexes(
    rule,
    rows.map((r) => r.points),
    rows.map((r) => r.win),
    rows.map((r) => r.gf),
    rows.map((r) => r.ga),
    rows.map((r) => r.pos0),
  );

export function runWhatIf(teams: WTeam[], games: WGame[], picks: Record<number, Pick>, rule: TieRule, sims = 3000): WhatIfResult {
  const idx = new Map(teams.map((t, i) => [t.id, i]));
  const adj = teams.map((t) => ({ id: t.id, points: t.points, win: t.win, gf: t.gf, ga: t.ga, played: t.played, pos0: t.position }));

  const open: WGame[] = [];
  for (const g of games) {
    const p = picks[g.id];
    const hi = idx.get(g.h);
    const ai = idx.get(g.a);
    if (!p || hi == null || ai == null || !Number.isFinite(p.h) || !Number.isFinite(p.a)) {
      open.push(g);
      continue;
    }
    adj[hi].gf += p.h;
    adj[hi].ga += p.a;
    adj[ai].gf += p.a;
    adj[ai].ga += p.h;
    adj[hi].played += 1;
    adj[ai].played += 1;
    if (p.h > p.a) {
      adj[hi].points += 3;
      adj[hi].win += 1;
    } else if (p.h < p.a) {
      adj[ai].points += 3;
      adj[ai].win += 1;
    } else {
      adj[hi].points += 1;
      adj[ai].points += 1;
    }
  }

  // tabela "se fosse hoje" com os placares do torcedor
  const order = rank(rule, adj);
  const table: TableRow[] = order.map((ti, k) => ({
    id: adj[ti].id,
    pos: k + 1,
    points: adj[ti].points,
    played: adj[ti].played,
    gd: adj[ti].gf - adj[ti].ga,
    delta: adj[ti].pos0 - (k + 1),
  }));

  // posições finais prováveis: placares do torcedor + modelo no que sobra
  const simTeams: SimTeam[] = adj.map((t) => ({ id: t.id, pos0: t.pos0, points: t.points, win: t.win, gf: t.gf, ga: t.ga }));
  const simGames: SimGame[] = open.map((g) => ({ h: g.h, a: g.a, lh: g.lh, la: g.la, gh0: g.g0h, ga0: g.g0a, frac: g.frac }));
  const sigma = teams.map((t) => t.sg ?? 0);
  const res = simulateGroup(simTeams, simGames, rule, sims, mulberry32(7919 + teams.length), sigma);
  const dist = new Map<number, number[]>();
  const expPoints = new Map<number, number>();
  adj.forEach((t, i) => {
    dist.set(t.id, res.dist[i]);
    expPoints.set(t.id, res.expPoints[i]);
  });
  return { table, dist, expPoints, sims };
}

/** Número da rodada em "Regular Season - 33" (null se não houver). */
export const roundNumber = (r: string | null | undefined): number | null => {
  const m = /(\d+)\s*$/.exec(r || "");
  return m ? Number(m[1]) : null;
};
