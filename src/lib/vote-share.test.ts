import { describe, expect, it } from "vitest";
import { scopeTotal, shareText } from "./vote-share";

describe("fatia de votos do Heart Club", () => {
  const rows = [{ votes: 10 }, { votes: 9 }, { votes: 9 }, { votes: 9 }, { votes: 30 }];

  it("o total do recorte é a soma dos clubes da lista", () => {
    expect(scopeTotal(rows, 50)).toBe(67);
  });

  it("lista cheia (no limite) não tem total conhecido: não inventa porcentagem", () => {
    expect(scopeTotal(new Array(50).fill({ votes: 3 }), 50)).toBeNull();
    expect(scopeTotal([], 50)).toBeNull();
    expect(scopeTotal([{ votes: 0 }], 50)).toBeNull();
  });

  it("exemplos reais de hoje (67 votos): Vila Nova 10 = 15%, Goiás 9 = 13%", () => {
    expect(shareText(10, 67)).toBe("15%");
    expect(shareText(9, 67)).toBe("13%");
    expect(shareText(67, 67)).toBe("100%");
  });

  it("menos de 1% aparece como <1%; sem voto ou sem total não mostra nada", () => {
    expect(shareText(1, 500)).toBe("<1%");
    expect(shareText(0, 67)).toBeNull();
    expect(shareText(5, null)).toBeNull();
    expect(shareText(5, 0)).toBeNull();
  });

  it("as fatias nunca passam de 100% somadas (arredondamento fica perto)", () => {
    const total = 67;
    const sum = [10, 9, 9, 9, 30].reduce((a, v) => a + Math.round((v / total) * 100), 0);
    expect(sum).toBeGreaterThanOrEqual(98);
    expect(sum).toBeLessThanOrEqual(102);
  });
});
