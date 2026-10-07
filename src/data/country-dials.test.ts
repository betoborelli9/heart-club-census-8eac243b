import { describe, expect, it } from "vitest";
import { getCountryDials } from "./country-dials";

describe("países do WhatsApp", () => {
  it("cobre o mundo todo, com o Brasil primeiro e sem repetir país", () => {
    const list = getCountryDials("pt");
    expect(list.length).toBeGreaterThan(190);
    expect(list[0].code).toBe("BR");
    expect(list[0].dial).toBe("+55");
    expect(new Set(list.map((c) => c.code)).size).toBe(list.length);
  });

  it("nome no idioma do torcedor e bandeira de cada país", () => {
    const pt = getCountryDials("pt").find((c) => c.code === "DE")!;
    const en = getCountryDials("en").find((c) => c.code === "DE")!;
    const es = getCountryDials("es").find((c) => c.code === "DE")!;
    expect(pt.name).toBe("Alemanha");
    expect(en.name).toBe("Germany");
    expect(es.name).toBe("Alemania");
    expect(pt.flag).toBe("🇩🇪");
  });

  it("países pequenos e distantes também estão (Gabão, Índia, Coreia do Sul e do Norte, Afeganistão)", () => {
    const codes = new Map(getCountryDials("pt").map((c) => [c.code, c.dial]));
    expect(codes.get("GA")).toBe("+241");
    expect(codes.get("IN")).toBe("+91");
    expect(codes.get("KR")).toBe("+82");
    expect(codes.get("KP")).toBe("+850");
    expect(codes.get("AF")).toBe("+93");
  });

  it("toda faixa de dígitos é válida", () => {
    for (const c of getCountryDials("pt")) {
      expect(c.digits[0]).toBeGreaterThan(3);
      expect(c.digits[1]).toBeGreaterThanOrEqual(c.digits[0]);
    }
  });
});
