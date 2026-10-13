import { describe, expect, it } from "vitest";
import { fmtExpPts, orderByExpected } from "./projected-order";

const t = (id: number, position: number, win: number, gf: number, ga: number) => ({ id, position, win, gf, ga });

describe("ordem da tabela provável", () => {
  it("ordena pelos pontos esperados (com 1 casa decimal)", () => {
    const teams = [t(1, 1, 18, 46, 31), t(2, 2, 17, 50, 19), t(3, 3, 17, 40, 22)];
    const exp: Record<number, number> = { 1: 67.8, 2: 68.3, 3: 68.0 };
    const out = orderByExpected(teams, "br", (x) => exp[x.id], () => 2);
    expect(out.map((x) => x.id)).toEqual([2, 3, 1]);
  });

  it("empate na casa decimal: no Brasil vale o número de vitórias antes do saldo de gols", () => {
    const teams = [t(1, 2, 17, 50, 19), t(2, 1, 18, 46, 31)]; // time 2: mais vitórias, saldo menor
    const out = orderByExpected(teams, "br", () => 68.0, () => 2);
    expect(out.map((x) => x.id)).toEqual([2, 1]);
  });

  it("regra por saldo de gols (sem vitórias como critério): vence o melhor saldo", () => {
    const teams = [t(1, 2, 17, 50, 19), t(2, 1, 18, 46, 31)];
    const out = orderByExpected(teams, "gd", () => 68.0, () => 2);
    expect(out.map((x) => x.id)).toEqual([1, 2]);
  });

  it("formata com uma casa decimal", () => {
    expect(fmtExpPts(68.3, "pt")).toBe("68,3");
    expect(fmtExpPts(68, "en")).toBe("68.0");
  });
});
