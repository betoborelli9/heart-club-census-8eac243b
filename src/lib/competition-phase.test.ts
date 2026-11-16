import { describe, expect, it } from "vitest";
import { competitionPhase, roundLabel } from "./competition-phase";

describe("fase da competição pela rodada do jogo (vale para qualquer campeonato)", () => {
  it("mata-mata: final, semifinal, quartas, oitavas, 16-avos, disputa do 3º, fase preliminar", () => {
    for (const r of ["Final", "Semi-finals", "Quarter-finals", "Round of 16", "Round of 32", "1/8-finals", "3rd Place Final", "Preliminary Round", "1st Qualifying Round", "Knockout Round Play-offs"]) {
      expect(competitionPhase(r)).toBe("knockout");
    }
  });

  it("fase de grupos / fase de liga", () => {
    for (const r of ["Group Stage - 3", "Group A - 2", "League phase - 5", "League Stage - 8"]) expect(competitionPhase(r)).toBe("group");
  });

  it("pontos corridos", () => {
    expect(competitionPhase("Regular Season - 38")).toBe("league");
  });

  it("sem informação ou nome desconhecido: não muda nada ('unknown')", () => {
    expect(competitionPhase(null)).toBe("unknown");
    expect(competitionPhase("")).toBe("unknown");
    expect(competitionPhase("Apertura - 7")).toBe("unknown");
  });
});

describe("nome da fase para o torcedor", () => {
  it("português", () => {
    expect(roundLabel("Final", "pt")).toBe("Final");
    expect(roundLabel("Round of 16", "pt")).toBe("Oitavas de final");
    expect(roundLabel("Quarter-finals", "pt")).toBe("Quartas de final");
    expect(roundLabel("Semi-finals", "pt")).toBe("Semifinal");
    expect(roundLabel("Round of 32", "pt")).toBe("16-avos de final");
    expect(roundLabel("3rd Place Final", "pt")).toBe("Disputa do 3º lugar");
    expect(roundLabel("Regular Season - 38", "pt")).toBe("Rodada 38");
    expect(roundLabel("Group Stage - 3", "pt")).toBe("Fase de grupos · Rodada 3");
  });

  it("espanhol e inglês", () => {
    expect(roundLabel("Round of 16", "es")).toBe("Octavos de final");
    expect(roundLabel("Semi-finals", "es")).toBe("Semifinal");
    expect(roundLabel("Round of 16", "en")).toBe("Round of 16");
  });

  it("vazio ou desconhecido volta como veio", () => {
    expect(roundLabel(null, "pt")).toBe("");
    expect(roundLabel("Apertura - 7", "pt")).toBe("Apertura - 7");
  });
});
