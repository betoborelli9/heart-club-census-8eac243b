/**
 * [CAMINHO]: supabase/functions/_shared/prognosis.ts
 * [MÓDULO]: PROBABILIDADES DE CAMPEONATO — força dos times (ataque/defesa por Poisson, com mando de campo) e simulação
 * de Monte Carlo dos jogos que faltam. LÓGICA PURA (sem rede/banco), com sorteador de semente fixa para ser testada.
 *
 *  • Força: ajuste iterativo estilo Maher: gols esperados = média do campeonato × ataque do time × defesa do rival × mando.
 *    Encolhimento (k) puxa times com poucos jogos para a média — evita certezas falsas no início do campeonato.
 *  • Simulação: cada jogo restante sorteia gols (Poisson); jogo em andamento parte do placar atual e sorteia só o tempo
 *    que falta. A tabela final usa o critério de desempate VALIDADO contra a ordem oficial (senão, ordem oficial).
 *  • Saídas: chance de cada posição final, pontos finais esperados (e faixa), pontos de corte por posição e
 *    probabilidade de vitória/empate/derrota de cada jogo que falta.
 */

export type GameIn = { id: number; h: number; a: number; gh: number | null; ga: number | null; st: string; el?: number | null };

export const DONE_ST = new Set(["FT", "AET", "PEN", "AWD", "WO"]);
export const LIVE_ST = new Set(["1H", "2H", "HT", "ET", "BT", "P", "LIVE"]);
const OPEN_ST = new Set(["NS", "TBD", "PST", "SUSP", "INT", ...LIVE_ST]);

export const isFinishedGame = (g: GameIn) => DONE_ST.has(g.st) && g.gh != null && g.ga != null;
export const isRemainingGame = (g: GameIn) => !isFinishedGame(g) && OPEN_ST.has(g.st);

/** Sorteador com semente (para testes repetíveis). */
export function mulberry32(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Strengths = { att: Map<number, number>; def: Map<number, number>; c: number; gamma: number; games: number };

/** Ajusta ataque/defesa de cada time com os jogos encerrados. k = gols "de dúvida" puxando para a média. */
export function fitStrengths(finished: GameIn[], teamIds: number[], k = 8, iters = 30): Strengths {
  const fin = finished.filter((g) => g.gh != null && g.ga != null);
  const att = new Map<number, number>(teamIds.map((i) => [i, 1]));
  const def = new Map<number, number>(teamIds.map((i) => [i, 1]));
  if (!fin.length) return { att, def, c: 1.25, gamma: 1.12, games: 0 };

  const sumH = fin.reduce((s, g) => s + (g.gh as number), 0);
  const sumA = fin.reduce((s, g) => s + (g.ga as number), 0);
  const avgH = Math.max(0.2, sumH / fin.length);
  const avgA = Math.max(0.2, sumA / fin.length);
  const c = Math.sqrt(avgH * avgA);
  const gamma = Math.sqrt(avgH / avgA);

  const gf = new Map<number, number>(teamIds.map((i) => [i, 0]));
  const ga = new Map<number, number>(teamIds.map((i) => [i, 0]));
  for (const g of fin) {
    gf.set(g.h, (gf.get(g.h) || 0) + (g.gh as number));
    ga.set(g.h, (ga.get(g.h) || 0) + (g.ga as number));
    gf.set(g.a, (gf.get(g.a) || 0) + (g.ga as number));
    ga.set(g.a, (ga.get(g.a) || 0) + (g.gh as number));
  }

  for (let it = 0; it < iters; it++) {
    const eAtt = new Map<number, number>(teamIds.map((i) => [i, 0]));
    const eDef = new Map<number, number>(teamIds.map((i) => [i, 0]));
    for (const g of fin) {
      // gols esperados do mandante com ataque=1 e do visitante com ataque=1
      eAtt.set(g.h, (eAtt.get(g.h) || 0) + c * gamma * (def.get(g.a) ?? 1));
      eAtt.set(g.a, (eAtt.get(g.a) || 0) + (c / gamma) * (def.get(g.h) ?? 1));
      // gols esperados sofridos com defesa=1
      eDef.set(g.h, (eDef.get(g.h) || 0) + (c / gamma) * (att.get(g.a) ?? 1));
      eDef.set(g.a, (eDef.get(g.a) || 0) + c * gamma * (att.get(g.h) ?? 1));
    }
    for (const i of teamIds) {
      att.set(i, ((gf.get(i) || 0) + k) / ((eAtt.get(i) || 0) + k));
      def.set(i, ((ga.get(i) || 0) + k) / ((eDef.get(i) || 0) + k));
    }
    const mA = [...att.values()].reduce((s, v) => s + v, 0) / teamIds.length;
    const mD = [...def.values()].reduce((s, v) => s + v, 0) / teamIds.length;
    for (const i of teamIds) {
      att.set(i, (att.get(i) as number) / mA);
      def.set(i, (def.get(i) as number) / mD);
    }
  }
  return { att, def, c, gamma, games: fin.length };
}

export function lambdas(s: Strengths, h: number, a: number) {
  return {
    lh: s.c * s.gamma * (s.att.get(h) ?? 1) * (s.def.get(a) ?? 1),
    la: (s.c / s.gamma) * (s.att.get(a) ?? 1) * (s.def.get(h) ?? 1),
  };
}

const MAXG = 14;
function pmf(lambda: number): number[] {
  const out = new Array(MAXG + 1);
  let p = Math.exp(-lambda);
  out[0] = p;
  for (let k = 1; k <= MAXG; k++) {
    p = (p * lambda) / k;
    out[k] = p;
  }
  return out;
}
function cdf(lambda: number): Float64Array {
  const p = pmf(lambda);
  const c = new Float64Array(MAXG + 1);
  let acc = 0;
  for (let k = 0; k <= MAXG; k++) {
    acc += p[k];
    c[k] = acc;
  }
  c[MAXG] = 1; // o resto da cauda cai no último valor
  return c;
}
function draw(c: Float64Array, u: number): number {
  for (let k = 0; k <= MAXG; k++) if (u < c[k]) return k;
  return MAXG;
}

/** Probabilidades de vitória do mandante, empate e vitória do visitante (a partir de um placar atual, se houver). */
export function matchProbs(lh: number, la: number, gh0 = 0, ga0 = 0): { pH: number; pD: number; pA: number } {
  const ph = pmf(lh);
  const pa = pmf(la);
  let pH = 0,
    pD = 0,
    pA = 0;
  for (let i = 0; i <= MAXG; i++)
    for (let j = 0; j <= MAXG; j++) {
      const p = ph[i] * pa[j];
      const d = gh0 + i - (ga0 + j);
      if (d > 0) pH += p;
      else if (d === 0) pD += p;
      else pA += p;
    }
  const tot = pH + pD + pA || 1;
  return { pH: pH / tot, pD: pD / tot, pA: pA / tot };
}

/** Gols de Poisson por inversão (usa o sorteio u já feito). */
function drawP(lambda: number, u: number): number {
  let p = Math.exp(-lambda);
  let F = p;
  let k = 0;
  while (u > F && k < 20) {
    k++;
    p *= lambda / k;
    F += p;
  }
  return k;
}

/** Normal padrão (Box–Muller) a partir do sorteador. */
function normal(rng: () => number): number {
  const u = Math.max(1e-12, rng());
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Incerteza sobre a força de cada time: quanto menos jogos ele tem, maior o desvio. Sem isso o modelo fica confiante
 * demais no começo do campeonato (6 rodadas não dizem quem é o melhor time).
 */
export function strengthSigma(playedByTeam: number[], sigma0 = 0.3, halfGames = 10): number[] {
  return playedByTeam.map((p) => sigma0 * Math.sqrt(halfGames / (halfGames + Math.max(0, p))));
}

export type SimTeam = { id: number; pos0: number; points: number; win: number; gf: number; ga: number };
export type SimGame = { h: number; a: number; lh: number; la: number; gh0: number; ga0: number; frac: number };
export type TieRule = "br" | "gd" | "official";

function rankKey(rule: TieRule, pts: number, win: number, gf: number, ga: number): number {
  if (rule === "official") return pts;
  const gd = gf - ga + 2000;
  if (rule === "br") return pts * 1e12 + win * 1e9 + gd * 1e5 + gf;
  return pts * 1e12 + gd * 1e7 + gf;
}

/** Ordem final (índices) para um conjunto de estatísticas — usada na simulação e na validação da regra. */
export function orderIndexes(rule: TieRule, pts: ArrayLike<number>, win: ArrayLike<number>, gf: ArrayLike<number>, ga: ArrayLike<number>, pos0: ArrayLike<number>): number[] {
  const n = pts.length;
  const key = new Array<number>(n);
  for (let i = 0; i < n; i++) key[i] = rankKey(rule, pts[i], win[i], gf[i], ga[i]);
  return Array.from({ length: n }, (_, i) => i).sort((x, y) => key[y] - key[x] || pos0[x] - pos0[y]);
}

/** A regra de desempate precisa reproduzir a ordem OFICIAL da tabela; senão vale "ordem oficial nos empates". */
export function validateRule(preferred: TieRule, teams: SimTeam[]): TieRule {
  if (preferred === "official") return "official";
  const official = teams.map((_, i) => i).sort((x, y) => teams[x].pos0 - teams[y].pos0);
  const got = orderIndexes(
    preferred,
    teams.map((t) => t.points),
    teams.map((t) => t.win),
    teams.map((t) => t.gf),
    teams.map((t) => t.ga),
    teams.map((t) => t.pos0),
  );
  return got.join(",") === official.join(",") ? preferred : "official";
}

export type SimResult = {
  n: number;
  sims: number;
  dist: number[][]; // dist[time][posição-1] = probabilidade
  expPoints: number[];
  ptsP10: number[];
  ptsP90: number[];
  cutMedian: number[]; // pontos medianos de quem termina em cada posição
};

export function simulateGroup(teams: SimTeam[], games: SimGame[], rule: TieRule, sims: number, rng: () => number, sigma?: number[]): SimResult {
  const n = teams.length;
  const idx = new Map<number, number>(teams.map((t, i) => [t.id, i]));
  const gi = games
    .filter((g) => idx.has(g.h) && idx.has(g.a))
    .map((g) => ({ h: idx.get(g.h) as number, a: idx.get(g.a) as number, lh: Math.max(1e-6, g.lh), la: Math.max(1e-6, g.la), frac: g.frac, gh0: g.gh0, ga0: g.ga0 }));
  const noisy = !!sigma && sigma.some((x) => x > 0);
  const fa = new Float64Array(n).fill(1);
  const fd = new Float64Array(n).fill(1);

  const pts0 = teams.map((t) => t.points);
  const win0 = teams.map((t) => t.win);
  const gf0 = teams.map((t) => t.gf);
  const ga0 = teams.map((t) => t.ga);
  const pos0 = teams.map((t) => t.pos0);

  const maxPts = Math.max(...pts0) + 3 * (gi.length + 1) + 1;
  const distCount = Array.from({ length: n }, () => new Int32Array(n));
  const teamHist = Array.from({ length: n }, () => new Int32Array(maxPts + 1));
  const posHist = Array.from({ length: n }, () => new Int32Array(maxPts + 1));
  const sumPts = new Float64Array(n);

  const pts = new Float64Array(n);
  const win = new Float64Array(n);
  const gf = new Float64Array(n);
  const ga = new Float64Array(n);

  for (let s = 0; s < sims; s++) {
    for (let i = 0; i < n; i++) {
      pts[i] = pts0[i];
      win[i] = win0[i];
      gf[i] = gf0[i];
      ga[i] = ga0[i];
    }
    if (noisy) {
      for (let i = 0; i < n; i++) {
        const sg = (sigma as number[])[i] || 0;
        fa[i] = Math.exp(sg * normal(rng) - (sg * sg) / 2);
        fd[i] = Math.exp(sg * normal(rng) - (sg * sg) / 2);
      }
    }
    for (const g of gi) {
      const x = g.gh0 + drawP(Math.max(1e-6, g.lh * fa[g.h] * fd[g.a] * g.frac), rng());
      const y = g.ga0 + drawP(Math.max(1e-6, g.la * fa[g.a] * fd[g.h] * g.frac), rng());
      gf[g.h] += x;
      ga[g.h] += y;
      gf[g.a] += y;
      ga[g.a] += x;
      if (x > y) {
        pts[g.h] += 3;
        win[g.h] += 1;
      } else if (x < y) {
        pts[g.a] += 3;
        win[g.a] += 1;
      } else {
        pts[g.h] += 1;
        pts[g.a] += 1;
      }
    }
    const order = orderIndexes(rule, pts, win, gf, ga, pos0);
    for (let p = 0; p < n; p++) {
      const t = order[p];
      distCount[t][p]++;
      posHist[p][pts[t]]++;
    }
    for (let i = 0; i < n; i++) {
      teamHist[i][pts[i]]++;
      sumPts[i] += pts[i];
    }
  }

  const pct = (hist: Int32Array, q: number) => {
    const target = sims * q;
    let acc = 0;
    for (let v = 0; v < hist.length; v++) {
      acc += hist[v];
      if (acc >= target) return v;
    }
    return hist.length - 1;
  };

  return {
    n,
    sims,
    dist: distCount.map((row) => Array.from(row, (c) => Math.round((c / sims) * 10000) / 10000)),
    expPoints: Array.from(sumPts, (v) => Math.round((v / sims) * 10) / 10),
    ptsP10: teamHist.map((h) => pct(h, 0.1)),
    ptsP90: teamHist.map((h) => pct(h, 0.9)),
    cutMedian: posHist.map((h) => pct(h, 0.5)),
  };
}

/** Quantas simulações cabem no orçamento de CPU da função (≈ 40 milhões de operações). */
export function simsFor(nTeams: number, nGames: number): number {
  const perSim = nGames * 40 + nTeams * Math.log2(Math.max(2, nTeams)) * 10 + nTeams * 30;
  return Math.max(1500, Math.min(20000, Math.floor(40_000_000 / perSim)));
}

/**
 * Dificuldade dos jogos que faltam: média da força dos rivais (ataque/defesa), pesando mando
 * (jogar fora pesa mais). Quanto maior, mais difícil. Normalizada como índice 0–100 entre os times do grupo.
 */
export function scheduleDifficulty(s: Strengths, teamIds: number[], remaining: { h: number; a: number }[]): Map<number, number> {
  const rating = (i: number) => (s.att.get(i) ?? 1) / (s.def.get(i) ?? 1);
  const raw = new Map<number, number>();
  for (const t of teamIds) {
    const mine = remaining.filter((g) => g.h === t || g.a === t);
    if (!mine.length) {
      raw.set(t, 0);
      continue;
    }
    const v = mine.reduce((acc, g) => {
      const opp = g.h === t ? g.a : g.h;
      return acc + rating(opp) * (g.h === t ? 0.9 : 1.1);
    }, 0);
    raw.set(t, v / mine.length);
  }
  const vals = [...raw.values()].filter((v) => v > 0);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const out = new Map<number, number>();
  for (const [t, v] of raw) out.set(t, v === 0 || hi === lo ? 50 : Math.round(((v - lo) / (hi - lo)) * 100));
  return out;
}
