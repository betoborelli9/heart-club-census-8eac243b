import { describe, expect, it } from "vitest";
import {
  fitStrengths, lambdas, matchProbs, mulberry32, orderIndexes, scheduleDifficulty, simulateGroup, simsFor, validateRule,
  isFinishedGame, isRemainingGame, type GameIn, type SimGame, type SimTeam,
} from "../../supabase/functions/_shared/prognosis";

const g = (id: number, h: number, a: number, gh: number | null, ga: number | null, st = "FT"): GameIn => ({ id, h, a, gh, ga, st });

/** Campeonato de 4 times (ida e volta) onde o time 1 é muito forte e o 4 é muito fraco. */
function league() {
  const ids = [1, 2, 3, 4];
  const games: GameIn[] = [];
  let id = 1;
  const power: Record<number, number> = { 1: 3, 2: 2, 3: 1, 4: 0 };
  for (const h of ids)
    for (const a of ids) {
      if (h === a) continue;
      const diff = power[h] - power[a];
      games.push(g(id++, h, a, Math.max(0, 1 + (diff > 0 ? diff : 0)), Math.max(0, 1 + (diff < 0 ? -diff : 0)) - (diff > 0 ? 1 : 0)));
    }
  return { ids, games };
}

describe("Probabilidades — modelo de gols", () => {
  it("probabilidades de vitória/empate/derrota somam 100% e respeitam a força", () => {
    const p = matchProbs(2.0, 0.8);
    expect(p.pH + p.pD + p.pA).toBeCloseTo(1, 6);
    expect(p.pH).toBeGreaterThan(p.pA);
    const eq = matchProbs(1.3, 1.3);
    expect(eq.pH).toBeCloseTo(eq.pA, 6);
  });

  it("placar atual entra na conta: quem está ganhando por 2 gols no fim quase sempre vence", () => {
    const p = matchProbs(0.05, 0.05, 2, 0); // sobra pouco jogo
    expect(p.pH).toBeGreaterThan(0.99);
  });

  it("o time mais forte tem ataque maior e defesa melhor (menor) que o mais fraco", () => {
    const { ids, games } = league();
    const s = fitStrengths(games, ids);
    expect(s.att.get(1)!).toBeGreaterThan(s.att.get(4)!);
    expect(s.def.get(1)!).toBeLessThan(s.def.get(4)!);
    expect(lambdas(s, 1, 4).lh).toBeGreaterThan(lambdas(s, 4, 1).lh);
    expect(s.gamma).toBeGreaterThan(1); // mandante marca mais
  });

  it("poucos jogos: o encolhimento mantém tudo perto da média (sem certezas falsas)", () => {
    const s = fitStrengths([g(1, 1, 2, 5, 0)], [1, 2, 3, 4]);
    expect(s.att.get(1)!).toBeLessThan(2);
    expect(Math.abs((s.att.get(3) ?? 0) - 1)).toBeLessThan(0.3); // quem nem jogou fica na média
  });
});

describe("Probabilidades — simulação do campeonato", () => {
  const teams: SimTeam[] = [
    { id: 1, pos0: 1, points: 6, win: 2, gf: 4, ga: 1 },
    { id: 2, pos0: 2, points: 3, win: 1, gf: 2, ga: 2 },
    { id: 3, pos0: 3, points: 3, win: 1, gf: 1, ga: 3 },
    { id: 4, pos0: 4, points: 0, win: 0, gf: 0, ga: 3 },
  ];

  it("cada time tem 100% de chance de ficar em ALGUMA posição, e cada posição soma 100% entre os times", () => {
    const games: SimGame[] = [
      { h: 1, a: 2, lh: 1.6, la: 1.0, gh0: 0, ga0: 0, frac: 1 },
      { h: 3, a: 4, lh: 1.4, la: 1.1, gh0: 0, ga0: 0, frac: 1 },
      { h: 4, a: 1, lh: 0.9, la: 1.7, gh0: 0, ga0: 0, frac: 1 },
    ];
    const r = simulateGroup(teams, games, "gd", 4000, mulberry32(7));
    for (const row of r.dist) expect(row.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 2);
    for (let p = 0; p < 4; p++) expect(r.dist.reduce((a, row) => a + row[p], 0)).toBeCloseTo(1, 2);
  });

  it("sem jogos faltando a tabela final é exatamente a atual (100% / 0%)", () => {
    const r = simulateGroup(teams, [], "gd", 500, mulberry32(1));
    expect(r.dist[0][0]).toBe(1); // líder
    expect(r.dist[3][3]).toBe(1); // lanterna
    expect(r.expPoints).toEqual([6, 3, 3, 0]);
    expect(r.cutMedian[0]).toBe(6);
  });

  it("líder com folga tem mais chance de título que o 3º, e a mesma semente dá o mesmo resultado", () => {
    const games: SimGame[] = [
      { h: 1, a: 3, lh: 1.8, la: 0.8, gh0: 0, ga0: 0, frac: 1 },
      { h: 2, a: 4, lh: 1.5, la: 0.9, gh0: 0, ga0: 0, frac: 1 },
    ];
    const a = simulateGroup(teams, games, "gd", 6000, mulberry32(42));
    const b = simulateGroup(teams, games, "gd", 6000, mulberry32(42));
    expect(a.dist).toEqual(b.dist);
    expect(a.dist[0][0]).toBeGreaterThan(a.dist[2][0]);
    expect(a.ptsP10[0]).toBeLessThanOrEqual(a.expPoints[0]);
    expect(a.ptsP90[0]).toBeGreaterThanOrEqual(a.expPoints[0]);
  });

  it("jogo em andamento parte do placar atual (2 a 0 quase decidido) e só sorteia o que falta", () => {
    const live: SimGame[] = [{ h: 4, a: 1, lh: 1.0, la: 1.0, gh0: 2, ga0: 0, frac: 0.05 }]; // 4 ganhando de 1 por 2 a 0, 5% do jogo
    const r = simulateGroup(teams, live, "gd", 2000, mulberry32(3));
    // time 4 vai a 3 pontos e o líder fica nos 6: líder continua líder
    expect(r.expPoints[3]).toBeGreaterThan(2.9);
    expect(r.expPoints[0]).toBeLessThan(6.2);
  });
});

describe("Probabilidades — desempate", () => {
  it("regra de vitórias (Brasil) vale quando reproduz a ordem oficial; senão cai para a ordem oficial", () => {
    const ok: SimTeam[] = [
      { id: 1, pos0: 1, points: 7, win: 2, gf: 3, ga: 3 },
      { id: 2, pos0: 2, points: 7, win: 1, gf: 9, ga: 2 },
    ];
    expect(validateRule("br", ok)).toBe("br"); // mais vitórias na frente, mesmo com pior saldo
    expect(validateRule("gd", ok)).toBe("official"); // saldo colocaria o time 2 na frente: não bate com a oficial
  });

  it("ordena por pontos, depois vitórias, depois saldo, depois gols", () => {
    const o = orderIndexes("br", [6, 6, 6, 6], [2, 2, 2, 1], [5, 5, 4, 9], [3, 3, 3, 0], [1, 2, 3, 4]);
    expect(o).toEqual([0, 1, 2, 3]);
    const o2 = orderIndexes("br", [6, 6], [2, 2], [4, 5], [4, 3], [1, 2]);
    expect(o2).toEqual([1, 0]); // saldo +2 supera 0
  });
});

describe("Probabilidades — apoio", () => {
  it("jogo encerrado x jogo que falta", () => {
    expect(isFinishedGame(g(1, 1, 2, 1, 0, "FT"))).toBe(true);
    expect(isFinishedGame(g(1, 1, 2, null, null, "FT"))).toBe(false);
    expect(isRemainingGame(g(1, 1, 2, null, null, "NS"))).toBe(true);
    expect(isRemainingGame(g(1, 1, 2, 0, 0, "1H"))).toBe(true);
    expect(isRemainingGame(g(1, 1, 2, null, null, "CANC"))).toBe(false);
  });

  it("dificuldade do calendário: quem enfrenta os mais fortes tem índice maior", () => {
    const { ids, games } = league();
    const s = fitStrengths(games, ids);
    const d = scheduleDifficulty(s, ids, [
      { h: 2, a: 1 }, // 2 pega o forte
      { h: 3, a: 4 }, // 3 pega o fraco
    ]);
    expect(d.get(2)!).toBeGreaterThan(d.get(3)!);
  });

  it("orçamento de simulações: poucos jogos = muitas simulações; campeonato inteiro = menos, mas nunca abaixo do mínimo", () => {
    expect(simsFor(20, 40)).toBeGreaterThanOrEqual(8000);
    expect(simsFor(38, 700)).toBeGreaterThanOrEqual(1500);
    expect(simsFor(38, 700)).toBeLessThan(simsFor(20, 40));
  });
});
