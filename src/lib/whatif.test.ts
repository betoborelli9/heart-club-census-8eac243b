import { describe, expect, it } from "vitest";
import { roundNumber, runWhatIf, type WGame, type WTeam } from "./whatif";

const team = (id: number, position: number, points: number, win: number, gf: number, ga: number): WTeam => ({ id, position, points, played: 6, win, gf, ga, sg: 0 });
const teams: WTeam[] = [team(1, 1, 10, 3, 9, 4), team(2, 2, 9, 3, 8, 5), team(3, 3, 7, 2, 6, 6), team(4, 4, 2, 0, 2, 12)];
const game = (id: number, h: number, a: number, lh = 1.4, la = 1.1): WGame => ({ id, h, a, lh, la, frac: 1, g0h: 0, g0a: 0 });
const games = [game(1, 2, 1), game(2, 3, 4), game(3, 1, 3), game(4, 4, 2)];

describe("simulador E se...? (motor)", () => {
  it("sem palpites: a tabela é a oficial e as chances de cada posição somam 100%", () => {
    const r = runWhatIf(teams, games, {}, "gd", 2000);
    expect(r.table.map((x) => x.id)).toEqual([1, 2, 3, 4]);
    expect(r.table.every((x) => x.delta === 0)).toBe(true);
    for (const id of [1, 2, 3, 4]) expect(r.dist.get(id)!.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 2);
  });

  it("um placar do torcedor muda a tabela na hora: o 2º vence o líder e passa à frente, com a seta de subida/descida", () => {
    const r = runWhatIf(teams, games, { 1: { h: 3, a: 0 } }, "gd", 2000); // 2 (casa) 3 x 0 1
    expect(r.table.map((x) => x.id)).toEqual([2, 1, 3, 4]);
    expect(r.table[0]).toMatchObject({ id: 2, points: 12, delta: 1 });
    expect(r.table[1]).toMatchObject({ id: 1, points: 10, delta: -1 });
  });

  it("empate divide os pontos e vitória fora de casa vale 3 para o visitante", () => {
    const r = runWhatIf(teams, games, { 2: { h: 1, a: 1 }, 4: { h: 0, a: 2 } }, "gd", 1000);
    const pts = new Map(r.table.map((x) => [x.id, x.points]));
    expect(pts.get(3)).toBe(8); // 7 + 1 (empate com o 4)
    expect(pts.get(4)).toBe(3); // 2 + 1 (empate)
    expect(pts.get(2)).toBe(12); // 9 + 3 (venceu fora do 4, jogo 4: 4 x 2)
    expect(pts.get(1)).toBe(10);
  });

  it("todos os jogos preenchidos: a posição final fica 100% certa (sem sorteio)", () => {
    const picks = { 1: { h: 0, a: 1 }, 2: { h: 1, a: 0 }, 3: { h: 2, a: 0 }, 4: { h: 0, a: 3 } };
    const r = runWhatIf(teams, games, picks, "gd", 500);
    r.table.forEach((row, i) => expect(r.dist.get(row.id)![i]).toBe(1));
  });

  it("número da rodada", () => {
    expect(roundNumber("Regular Season - 33")).toBe(33);
    expect(roundNumber(null)).toBeNull();
    expect(roundNumber("Final")).toBeNull();
  });
});
