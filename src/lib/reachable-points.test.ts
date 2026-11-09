import { describe, expect, it } from "vitest";
import { displayTablePoints, minReachableGain, nearestReachableTotal, reachableGains } from "./reachable-points";

describe("pontos que realmente dá para somar (cada jogo vale 0, 1 ou 3)", () => {
  it("1 jogo: só 0, 1 ou 3", () => {
    expect(reachableGains(1)).toEqual([0, 1, 3]);
  });

  it("2 jogos: 0, 1, 2, 3, 4 ou 6 (5 não existe)", () => {
    expect(reachableGains(2)).toEqual([0, 1, 2, 3, 4, 6]);
  });

  it("sem jogos: nada a somar", () => {
    expect(reachableGains(0)).toEqual([0]);
    expect(reachableGains(-3)).toEqual([0]);
  });

  it("caso do Juventude: 68 pts, 1 jogo, média 69,9 → 69 (nunca 70)", () => {
    expect(nearestReachableTotal(68, 69.9, 1)).toBe(69);
    for (const exp of [68, 68.4, 69, 69.9, 70, 70.4, 70.6, 71]) {
      expect([68, 69, 71]).toContain(nearestReachableTotal(68, exp, 1));
    }
  });

  it("com muitos jogos, qualquer total perto da média vale (arredonda normal)", () => {
    expect(nearestReachableTotal(30, 45.4, 20)).toBe(45);
    expect(nearestReachableTotal(30, 45.6, 20)).toBe(46);
  });

  it("nunca devolve menos que os pontos de hoje", () => {
    expect(nearestReachableTotal(50, 49, 3)).toBe(50);
  });

  it("quanto falta de verdade: precisa de 2 com 1 jogo → só vencendo (3)", () => {
    expect(minReachableGain(2, 1)).toBe(3);
    expect(minReachableGain(1, 1)).toBe(1);
    expect(minReachableGain(3, 1)).toBe(3);
    expect(minReachableGain(4, 1)).toBeNull(); // nem vencendo
    expect(minReachableGain(5, 2)).toBe(6);
    expect(minReachableGain(0, 2)).toBe(0);
  });

  it("tabela: pontos inteiros e possíveis, sem subir ao descer", () => {
    const shown = displayTablePoints([
      { points: 70, remaining: 1, exp: 71.5 },
      { points: 68, remaining: 1, exp: 69.9 },
      { points: 65, remaining: 1, exp: 67.2 },
      { points: 20, remaining: 1, exp: 20.3 },
    ]);
    expect(shown).toEqual([71, 69, 68, 20]);
    expect(shown.every((v, i) => i === 0 || v <= shown[i - 1])).toBe(true);
  });

  it("se o total possível fizesse a lista subir (65 acima de 66), usa o maior total possível que não passe o de cima", () => {
    // A: 62 pts, média 65,6 → possível 65; B: 65 pts, média 65,55 → possível mais perto 66 (inverteria) → fica 65
    const shown = displayTablePoints([
      { points: 62, remaining: 1, exp: 65.6 },
      { points: 65, remaining: 1, exp: 65.55 },
    ]);
    expect(shown).toEqual([65, 65]);
    expect(shown.every((v, i) => i === 0 || v <= shown[i - 1])).toBe(true);
  });

  it("todo número mostrado é um total que o clube realmente pode somar (nunca o 70 do Juventude nem o 72 do Novorizontino)", () => {
    const rows = [
      { points: 70, remaining: 1, exp: 71.5 },
      { points: 68, remaining: 1, exp: 69.9 },
      { points: 66, remaining: 1, exp: 67.2 },
      { points: 62, remaining: 1, exp: 63.6 },
      { points: 62, remaining: 1, exp: 63.2 },
      { points: 58, remaining: 1, exp: 59.9 },
      { points: 57, remaining: 1, exp: 59.7 }, // mais perto = 60, mas isso passaria o clube de cima (59)
      { points: 58, remaining: 1, exp: 59.0 },
    ];
    const shown = displayTablePoints(rows);
    shown.forEach((v, i) => expect(reachableGains(rows[i].remaining).map((g) => rows[i].points + g)).toContain(v));
    expect(shown.every((v, i) => i === 0 || v <= shown[i - 1])).toBe(true);
    expect(shown[0]).toBe(71);
    expect(shown[1]).toBe(69);
  });
});
