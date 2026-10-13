import { describe, expect, it } from "vitest";
import { pickMainCompetition } from "./main-competition";

const c = (leagueId: number, leagueName: string, country: string, n: number) => ({ leagueId, season: 2026, leagueName, country, standings: new Array(n).fill(0) });

describe("campeonato principal do clube", () => {
  it("prefere a liga nacional e deixa copas e torneios continentais para depois", () => {
    expect(pickMainCompetition([c(2, "UEFA Champions League", "World", 36), c(140, "La Liga", "Spain", 20)])?.leagueId).toBe(140);
    expect(pickMainCompetition([c(48, "League Cup", "England", 0), c(2, "UEFA Champions League", "World", 36), c(39, "Premier League", "England", 20)])?.leagueId).toBe(39);
    expect(pickMainCompetition([c(1, "Copa do Nordeste", "Brazil", 20), c(75, "Serie D", "Brazil", 96)])?.leagueId).toBe(75);
    expect(pickMainCompetition([c(13, "CONMEBOL Libertadores", "World", 32), c(71, "Serie A", "Brazil", 20)])?.leagueId).toBe(71);
  });

  it("se só houver copa, usa a primeira; sem campeonato, nada", () => {
    expect(pickMainCompetition([c(45, "FA Cup", "England", 0)])?.leagueId).toBe(45);
    expect(pickMainCompetition([])).toBeNull();
  });
});
