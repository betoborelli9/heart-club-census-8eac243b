import { describe, expect, it } from "vitest";
import { contrastRatio, readableOnDark } from "./readable-color";
import { teamColors } from "@/data/teamColors";

describe("cor de clube legível sobre fundo escuro", () => {
  it("azul-marinho e preto (somem no fundo preto) são clareados até ter contraste mínimo de 4,5:1", () => {
    for (const dark of ["#0a3a8c", "#001a5c", "#1e40af", "#111111", "#000000", "#1a1a1a", "#4b0e1e", "#0b3d0b"]) {
      expect(contrastRatio(dark)).toBeLessThan(4.5); // o problema de verdade
      const fixed = readableOnDark(dark);
      expect(contrastRatio(fixed)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("cores que já são legíveis ficam exatamente como são (só normaliza para minúsculas)", () => {
    expect(readableOnDark("#FF6200")).toBe("#ff6200");
    expect(readableOnDark("#ffffff")).toBe("#ffffff");
    expect(readableOnDark("#fbbf24")).toBe("#fbbf24");
    expect(readableOnDark("#f00")).toBe("#ff0000");
  });

  it("mantém o matiz: azul continua azul (não vira cinza) e o resultado não é branco puro quando não precisa", () => {
    const out = readableOnDark("#0a3a8c");
    const r = parseInt(out.slice(1, 3), 16);
    const b = parseInt(out.slice(5, 7), 16);
    expect(b).toBeGreaterThan(r + 30);
    expect(out).not.toBe("#ffffff");
  });

  it("valores que não são hexadecimais passam sem mudança", () => {
    expect(readableOnDark("rgba(255,255,255,0.35)")).toBe("rgba(255,255,255,0.35)");
    expect(readableOnDark("var(--primary)")).toBe("var(--primary)");
  });

  it("TODAS as cores primárias dos clubes cadastrados ficam legíveis depois da correção", () => {
    const bad: string[] = [];
    for (const [name, th] of Object.entries(teamColors)) {
      const fixed = readableOnDark(th.primaryHex);
      if (/^#/.test(th.primaryHex) && contrastRatio(fixed) < 4.5) bad.push(name);
    }
    expect(bad).toEqual([]);
  });
});
