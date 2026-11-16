import { describe, expect, it } from "vitest";
import { isPlayoffRound, playoffFormat, probSAtLeastW, twoLegSeries } from "../../supabase/functions/_shared/playoff";
import { mulberry32, type Strengths } from "../../supabase/functions/_shared/prognosis";

// Campeonato de 4 times: 1 = forte, 2 = médio, 3 = médio, 4 = fraco (força = ataque ÷ defesa)
const strengths = (over: Partial<Record<number, { att: number; def: number }>> = {}): Strengths => {
  const base: Record<number, { att: number; def: number }> = { 1: { att: 1.3, def: 0.8 }, 2: { att: 1.0, def: 1.0 }, 3: { att: 1.0, def: 1.0 }, 4: { att: 0.8, def: 1.25 } };
  const all = { ...base, ...over } as Record<number, { att: number; def: number }>;
  return {
    att: new Map(Object.entries(all).map(([k, v]) => [Number(k), v.att])),
    def: new Map(Object.entries(all).map(([k, v]) => [Number(k), v.def])),
    c: 1.2,
    gamma: 1.15,
    games: 100,
  };
};

describe("play-off de acesso: regra do campeonato", () => {
  it("só a Série B (72), a partir de 2026, tem o formato 3º×6º e 4º×5º em ida e volta", () => {
    expect(playoffFormat(72, 2026)).toMatchObject({ pairs: [[3, 6], [4, 5]], legs: 2 });
    expect(playoffFormat(72, 2025)).toBeNull();
    expect(playoffFormat(71, 2026)).toBeNull();
  });

  it("jogos de mata-mata nunca contam como fase de pontos corridos", () => {
    expect(isPlayoffRound("Regular Season - 38")).toBe(false);
    expect(isPlayoffRound("Promotion Play-offs - Semi-finals")).toBe(true);
    expect(isPlayoffRound("Play-offs")).toBe(true);
    expect(isPlayoffRound("Semi-finals")).toBe(true);
    expect(isPlayoffRound(null)).toBe(false);
    expect(isPlayoffRound("")).toBe(false);
  });
});

describe("agregado de gols: empate favorece o melhor colocado", () => {
  it("times iguais: o melhor colocado tem a vantagem do empate (~65%)", () => {
    const p = probSAtLeastW(2, 2);
    expect(p).toBeGreaterThan(0.6);
    expect(p).toBeLessThan(0.72);
  });

  it("é uma probabilidade e some quando o adversário tem muito mais gols esperados", () => {
    expect(probSAtLeastW(0.5, 6)).toBeLessThan(0.02);
    expect(probSAtLeastW(6, 0.5)).toBeGreaterThan(0.98);
    for (const [a, b] of [[1, 1], [0.1, 3], [4, 4], [2.5, 1]]) {
      const p = probSAtLeastW(a, b);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });

  it("gols já marcados entram na conta (ida: 2 x 0 para S já deixa S bem na frente)", () => {
    expect(probSAtLeastW(1, 1, 2, 0)).toBeGreaterThan(probSAtLeastW(1, 1, 0, 0));
    expect(probSAtLeastW(1, 1, 0, 2)).toBeLessThan(probSAtLeastW(1, 1, 0, 0));
  });
});

describe("série de ida e volta (3º × 6º, 4º × 5º)", () => {
  it("as chances dos dois somam 100%", () => {
    const r = twoLegSeries({ strengths: strengths(), better: 2, worse: 3 });
    expect(r.pBetter + r.pWorse).toBeCloseTo(1, 10);
  });

  it("times de força igual: o melhor colocado leva vantagem (decide em casa e empate é dele)", () => {
    const r = twoLegSeries({ strengths: strengths(), better: 2, worse: 3 });
    expect(r.pBetter).toBeGreaterThan(0.55);
    expect(r.pBetter).toBeLessThan(0.7);
  });

  it("time muito mais forte avança mesmo sendo o pior colocado", () => {
    // o 'pior colocado' (1) é muito mais forte que o melhor colocado (4)
    const r = twoLegSeries({ strengths: strengths(), better: 4, worse: 1 });
    expect(r.pWorse).toBeGreaterThan(0.6);
  });

  it("jogo decisivo em casa conta: o melhor colocado joga a volta em casa (gols esperados maiores que fora)", () => {
    const r = twoLegSeries({ strengths: strengths(), better: 2, worse: 3 });
    expect(r.leg2.lh).toBeGreaterThan(r.leg2.la);
    expect(r.leg1.lh).toBeGreaterThan(r.leg1.la); // ida: o mandante é o pior colocado
    expect(r.leg1.pH + r.leg1.pD + r.leg1.pA).toBeCloseTo(1, 6);
    expect(r.leg2.pH + r.leg2.pD + r.leg2.pA).toBeCloseTo(1, 6);
  });

  it("concorda com uma simulação sorteada (Monte Carlo) das duas partidas", () => {
    const st = strengths();
    const r = twoLegSeries({ strengths: st, better: 2, worse: 3 });
    const rng = mulberry32(12345);
    const poisson = (l: number) => {
      let k = 0;
      let p = 1;
      const L = Math.exp(-l);
      do {
        k++;
        p *= rng();
      } while (p > L);
      return k - 1;
    };
    let better = 0;
    const N = 60000;
    for (let i = 0; i < N; i++) {
      const w1 = poisson(r.leg1.lh);
      const b1 = poisson(r.leg1.la);
      const b2 = poisson(r.leg2.lh);
      const w2 = poisson(r.leg2.la);
      if (b1 + b2 >= w1 + w2) better++; // empate: sobe o melhor colocado
    }
    expect(Math.abs(better / N - r.pBetter)).toBeLessThan(0.012);
  });

  it("depois da ida, o placar entra na conta: pior colocado venceu a ida por 2 x 0 → melhor colocado perde chance", () => {
    const antes = twoLegSeries({ strengths: strengths(), better: 2, worse: 3 });
    const depois = twoLegSeries({ strengths: strengths(), better: 2, worse: 3, leg1: { gh: 2, ga: 0 } }); // mandante da ida = pior
    expect(depois.pBetter).toBeLessThan(antes.pBetter - 0.2);
    const outra = twoLegSeries({ strengths: strengths(), better: 2, worse: 3, leg1: { gh: 0, ga: 2 } }); // melhor venceu fora por 2 x 0
    expect(outra.pBetter).toBeGreaterThan(antes.pBetter + 0.2);
  });

  it("as duas partidas encerradas: série decidida (100% ou 0%), com empate no agregado vencendo o melhor colocado", () => {
    // ida: pior (mandante) 1 x 1 melhor; volta: melhor (mandante) 0 x 0 → agregado 1 x 1, sobe o melhor colocado
    const empate = twoLegSeries({ strengths: strengths(), better: 2, worse: 3, leg1: { gh: 1, ga: 1 }, leg2: { gh: 0, ga: 0 } });
    expect(empate.pBetter).toBeGreaterThan(0.999);
    // ida: pior 3 x 0 melhor; volta: melhor 1 x 0 pior → agregado pior 3 x 1
    const pior = twoLegSeries({ strengths: strengths(), better: 2, worse: 3, leg1: { gh: 3, ga: 0 }, leg2: { gh: 1, ga: 0 } });
    expect(pior.pWorse).toBeGreaterThan(0.999);
  });

  it("incerteza na força dos times deixa o resultado menos extremo, nunca inverte o favorito", () => {
    const sem = twoLegSeries({ strengths: strengths(), better: 1, worse: 4 });
    const com = twoLegSeries({ strengths: strengths(), better: 1, worse: 4, sigmaBetter: 0.15, sigmaWorse: 0.15 });
    expect(sem.pBetter).toBeGreaterThan(0.5);
    expect(com.pBetter).toBeGreaterThan(0.5);
    expect(com.pBetter).toBeLessThanOrEqual(sem.pBetter + 1e-9);
  });

  it("resultado igual sempre (mesma semente)", () => {
    const a = twoLegSeries({ strengths: strengths(), better: 2, worse: 3, sigmaBetter: 0.1, sigmaWorse: 0.1, seed: 5 });
    const b = twoLegSeries({ strengths: strengths(), better: 2, worse: 3, sigmaBetter: 0.1, sigmaWorse: 0.1, seed: 5 });
    expect(a.pBetter).toBe(b.pBetter);
  });
});
