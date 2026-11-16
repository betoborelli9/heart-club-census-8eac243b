/**
 * [CAMINHO]: supabase/functions/_shared/playoff.ts
 * [MÓDULO]: DISPUTA DE ACESSO EM MATA-MATA (play-off) — chance de cada clube subir. LÓGICA PURA (sem rede/banco).
 *
 * Formato (Brasileirão Série B 2026, regulamento CBF): 3º × 6º e 4º × 5º, em ida e volta; o time de MELHOR campanha
 * decide a segunda partida em casa; os dois vencedores sobem (não há final). Empate no agregado: avança o de melhor
 * campanha (sem pênaltis). Cada confronto é independente.
 *
 * Como medimos "quem tem mais chance": a mesma força de ataque/defesa de toda a temporada que o resto do Heart Club usa
 * (gols esperados de cada jogo, com mando de campo) — ou seja, qualidade do time pela campanha inteira — mais o jogo
 * decisivo em casa e a vantagem do empate para o melhor colocado. A conta é exata (soma de gols = Poisson), com a incerteza
 * da força dos times misturada, e se uma das partidas já aconteceu, o placar dela entra na conta.
 */
import { lambdas, mulberry32, type Strengths } from "./prognosis.ts";

export type PlayoffFormat = { fromSeason: number; pairs: [number, number][]; legs: 2 };

/** Campeonatos com play-off de acesso conhecido. Novos formatos entram aqui (só dados, nenhuma conta nova). */
export const PLAYOFF_FORMATS: Record<number, PlayoffFormat> = {
  72: { fromSeason: 2026, pairs: [[3, 6], [4, 5]], legs: 2 }, // Brasileirão Série B
};

export function playoffFormat(leagueId: number, season: number): PlayoffFormat | null {
  const f = PLAYOFF_FORMATS[leagueId];
  return f && season >= f.fromSeason ? f : null;
}

/** A fase do jogo NÃO é da fase de pontos corridos (play-off, semifinal…)? Esses jogos nunca entram na tabela. */
export function isPlayoffRound(round: string | null | undefined): boolean {
  const r = (round || "").trim();
  if (!r) return false;
  return !/^regular season/i.test(r);
}

const MAXG = 40;
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

/** P(S >= W) para S ~ Poisson(ls) e W ~ Poisson(lw), com `sOffset`/`wOffset` gols já marcados (empate favorece S). */
export function probSAtLeastW(ls: number, lw: number, sOffset = 0, wOffset = 0): number {
  const ps = pmf(Math.max(1e-9, ls));
  const pw = pmf(Math.max(1e-9, lw));
  // cauda de S: P(S >= k)
  const tailS = new Array(MAXG + 2).fill(0);
  for (let k = MAXG; k >= 0; k--) tailS[k] = tailS[k + 1] + ps[k];
  let p = 0;
  for (let w = 0; w <= MAXG; w++) {
    const need = wOffset + w - sOffset; // S precisa de, no mínimo, isto
    const t = need <= 0 ? 1 : need > MAXG ? 0 : tailS[need];
    p += pw[w] * t;
  }
  return Math.max(0, Math.min(1, p));
}

export type LegResult = { gh: number; ga: number } | null; // gols do mandante daquela partida e do visitante (null = ainda não jogada)

export type SeriesInput = {
  strengths: Strengths;
  better: number; // time de melhor campanha (decide em casa)
  worse: number;
  /** incerteza de força de cada time (desvio, como no resto do modelo); 0 = sem incerteza */
  sigmaBetter?: number;
  sigmaWorse?: number;
  /** ida (mandante = o de pior campanha) e volta (mandante = o de melhor campanha), se já jogadas */
  leg1?: LegResult;
  leg2?: LegResult;
  seed?: number;
  draws?: number;
};

export type SeriesOut = {
  pBetter: number; // chance de o de melhor campanha subir
  pWorse: number;
  leg1: { lh: number; la: number; pH: number; pD: number; pA: number }; // mandante = pior campanha
  leg2: { lh: number; la: number; pH: number; pD: number; pA: number }; // mandante = melhor campanha (decisiva)
};

function normal(rng: () => number): number {
  const u1 = Math.max(1e-12, rng());
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function legProbs(lh: number, la: number) {
  const ph = pmf(lh);
  const pa = pmf(la);
  let pH = 0, pD = 0, pA = 0;
  for (let i = 0; i <= MAXG; i++)
    for (let j = 0; j <= MAXG; j++) {
      const p = ph[i] * pa[j];
      if (i > j) pH += p;
      else if (i === j) pD += p;
      else pA += p;
    }
  const tot = pH + pD + pA || 1;
  return { pH: pH / tot, pD: pD / tot, pA: pA / tot };
}

/**
 * Chance de cada um subir numa série de ida e volta.
 * Ida: o de pior campanha é o mandante. Volta: o de melhor campanha é o mandante (jogo decisivo em casa).
 * Placar agregado; empate no agregado = sobe o de melhor campanha.
 */
export function twoLegSeries(inp: SeriesInput): SeriesOut {
  const { strengths, better: b, worse: w } = inp;
  // taxas de gol de cada partida (força da temporada inteira + mando de campo)
  const l1 = lambdas(strengths, w, b); // ida: pior em casa
  const l2 = lambdas(strengths, b, w); // volta: melhor em casa

  // gols já marcados pelo de melhor campanha (S) e pelo de pior (W), se as partidas já aconteceram
  const sGoals = (inp.leg1 ? inp.leg1.ga : 0) + (inp.leg2 ? inp.leg2.gh : 0);
  const wGoals = (inp.leg1 ? inp.leg1.gh : 0) + (inp.leg2 ? inp.leg2.ga : 0);
  const draws = inp.draws ?? 600;
  const sb = inp.sigmaBetter ?? 0;
  const sw = inp.sigmaWorse ?? 0;
  const noisy = sb > 0 || sw > 0;
  const rng = mulberry32(inp.seed ?? 7);

  let acc = 0;
  const n = noisy ? draws : 1;
  for (let i = 0; i < n; i++) {
    let faB = 1, fdB = 1, faW = 1, fdW = 1;
    if (noisy) {
      faB = Math.exp(sb * normal(rng) - (sb * sb) / 2);
      fdB = Math.exp(sb * normal(rng) - (sb * sb) / 2);
      faW = Math.exp(sw * normal(rng) - (sw * sw) / 2);
      fdW = Math.exp(sw * normal(rng) - (sw * sw) / 2);
    }
    // gols esperados do que FALTA jogar
    // ida (pior em casa): pior marca l1.lh, melhor marca l1.la
    const w1 = inp.leg1 ? 0 : l1.lh * faW * fdB;
    const b1 = inp.leg1 ? 0 : l1.la * faB * fdW;
    // volta (melhor em casa): melhor marca l2.lh, pior marca l2.la
    const b2 = inp.leg2 ? 0 : l2.lh * faB * fdW;
    const w2 = inp.leg2 ? 0 : l2.la * faW * fdB;
    acc += probSAtLeastW(b1 + b2, w1 + w2, sGoals, wGoals);
  }
  const pBetter = acc / n;

  return {
    pBetter,
    pWorse: 1 - pBetter,
    leg1: { lh: l1.lh, la: l1.la, ...legProbs(l1.lh, l1.la) },
    leg2: { lh: l2.lh, la: l2.la, ...legProbs(l2.lh, l2.la) },
  };
}
