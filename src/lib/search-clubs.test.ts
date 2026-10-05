import { beforeEach, describe, expect, it, vi } from "vitest";

const state: { cacheRows: any[]; serverRows: any[] } = { cacheRows: [], serverRows: [] };

vi.mock("@/integrations/supabase/client", () => {
  const chain: any = {
    select: () => chain,
    or: () => chain,
    limit: () => Promise.resolve({ data: state.cacheRows, error: null }),
  };
  return {
    supabase: {
      from: () => chain,
      functions: { invoke: () => Promise.resolve({ data: state.serverRows, error: null }) },
    },
  };
});

import { searchClubsWithFallback } from "./search-clubs";

const psgServer = {
  api_id: 85,
  name: "Paris Saint Germain",
  city: "Paris",
  country: "France",
  logo: "x.png",
  source: "cache",
};

describe("busca de clubes por sigla e apelido", () => {
  beforeEach(() => {
    state.cacheRows = [];
    state.serverRows = [];
  });

  it("PSG encontra o Paris Saint Germain (resposta confirmada pelo servidor)", async () => {
    state.serverRows = [psgServer];
    const r = await searchClubsWithFallback("PSG");
    expect(r.map((c) => c.name)).toContain("Paris Saint Germain");
  });

  it("PSG também funciona pela base local (nome curto)", async () => {
    state.cacheRows = [{ id: 3, nome: "Paris Saint Germain", nome_curto: "PSG", cidade: "Paris", pais: "France", escudo_url: "x.png", api_id: "85", aliases: [] }];
    const r = await searchClubsWithFallback("psg");
    expect(r.map((c) => c.name)).toContain("Paris Saint Germain");
  });

  it("apelido guardado (alias) também encontra o clube", async () => {
    state.cacheRows = [{ id: 9, nome: "Agro EC", nome_curto: "Agro", cidade: "Catalão", pais: "Brazil", escudo_url: "y.png", api_id: "1", aliases: ["Abecat"] }];
    const r = await searchClubsWithFallback("abecat");
    expect(r.map((c) => c.name)).toContain("Agro EC");
  });

  it("resultado da API que não tem nada a ver com o que foi digitado continua sendo descartado", async () => {
    state.serverRows = [{ api_id: 1, name: "Clube Qualquer", city: "X", country: "Y", logo: "", source: "api" }];
    const r = await searchClubsWithFallback("zzzzz");
    expect(r).toEqual([]);
  });
});
