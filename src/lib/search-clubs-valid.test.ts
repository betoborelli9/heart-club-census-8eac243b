import { describe, it, expect } from "vitest";
import { isValidClubName } from "./search-clubs";

describe("isValidClubName", () => {
  it("aceita clubes que começam com 'Na' (Náutico, Nacional, Napoli, Nantes)", () => {
    for (const n of ["Nautico Recife", "Náutico", "Nacional", "Napoli", "Nantes", "Nacional Potosi", "Testaccio"]) {
      expect(isValidClubName(n), n).toBe(true);
    }
  });

  it("continua barrando lixo e placeholders", () => {
    for (const n of ["na", "NA", "N/A", "n/a", "teste", "Teste 123", "xxx", "Seu clube", "Selecione...", "Novo time", "Nenhum", "sem nome", "12", "ab"]) {
      expect(isValidClubName(n), n).toBe(false);
    }
  });
});
