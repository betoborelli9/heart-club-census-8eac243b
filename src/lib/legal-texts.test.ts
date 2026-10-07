import { describe, expect, it } from "vitest";
import { PRIVACY, TERMS } from "./legal-texts";

const all = (doc: (typeof TERMS)["pt"]) => JSON.stringify(doc).toLowerCase();

describe("textos jurídicos", () => {
  it("existem nos 3 idiomas com as mesmas seções", () => {
    for (const docs of [TERMS, PRIVACY]) {
      expect(docs.pt.sections.length).toBe(docs.en.sections.length);
      expect(docs.pt.sections.length).toBe(docs.es.sections.length);
    }
  });

  it("não deixam pendência nem prometem exclusão completa / anonimato total", () => {
    for (const lang of ["pt", "en", "es"] as const) {
      for (const docs of [TERMS, PRIVACY]) {
        const txt = all(docs[lang]);
        expect(txt).not.toMatch(/preencher|advogado|lawyer|abogado/);
        expect(txt).not.toMatch(/exclusão completa|100% an[oô]nimo|complete deletion|eliminación completa/);
      }
    }
  });

  it("não falam de dinheiro, parceiros ou patrocinadores para o torcedor", () => {
    for (const lang of ["pt", "en", "es"] as const) {
      for (const docs of [TERMS, PRIVACY]) {
        expect(all(docs[lang])).not.toMatch(/parceir|patrocin|partner|sponsor|socio comercial|dinheiro|money|renda/);
      }
    }
  });

  it("deixam claro que o voto é definitivo", () => {
    expect(all(TERMS.pt)).toContain("definitivo");
    expect(all(PRIVACY.pt)).toContain("definitivo");
  });
});
