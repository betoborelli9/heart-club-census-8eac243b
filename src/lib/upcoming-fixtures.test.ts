import { describe, expect, it } from "vitest";
import { apiResponseFailed, isUpcomingFixture, upcomingOnly } from "../../supabase/functions/_shared/upcoming-fixtures";
import { onlyActiveCompetitions } from "./active-competitions";

const NOW = new Date("2026-11-15T15:00:00Z").getTime();
const H = 60 * 60 * 1000;
const D = 24 * H;
const fx = (date: number, status = "NS") => ({ date: new Date(date).toISOString(), status });

describe("próximo jogo: só o que ainda vai acontecer, perto o bastante (regra de qualquer clube)", () => {
  it("jogo daqui a alguns dias vale", () => {
    expect(isUpcomingFixture(fx(NOW + 3 * D), NOW)).toBe(true);
  });

  it("caso do Goiatuba: 'não iniciado' de 26/jul visto em 15/nov NÃO vale (cache velho nunca é próximo jogo)", () => {
    expect(isUpcomingFixture({ date: "2026-07-26T20:00:00+00:00", status: "NS" }, NOW)).toBe(false);
  });

  it("jogo que deveria ter começado há pouco (até 3 h) ainda conta como 'começando'; passou disso, não", () => {
    expect(isUpcomingFixture(fx(NOW - 2 * H), NOW)).toBe(true);
    expect(isUpcomingFixture(fx(NOW - 4 * H), NOW)).toBe(false);
  });

  it("mais de 30 dias à frente = clube sem campeonato no momento", () => {
    expect(isUpcomingFixture(fx(NOW + 29 * D), NOW)).toBe(true);
    expect(isUpcomingFixture(fx(NOW + 31 * D), NOW)).toBe(false);
  });

  it("jogo encerrado, cancelado ou ao vivo não é 'próximo jogo' (o ao vivo vem do nosso banco)", () => {
    for (const st of ["FT", "AET", "PEN", "CANC", "ABD", "AWD", "WO", "1H", "2H", "HT", "LIVE"]) {
      expect(isUpcomingFixture(fx(NOW + 2 * D, st), NOW)).toBe(false);
    }
  });

  it("horário a definir (TBD) e adiado (PST) com data futura valem; data inválida não", () => {
    expect(isUpcomingFixture(fx(NOW + 2 * D, "TBD"), NOW)).toBe(true);
    expect(isUpcomingFixture(fx(NOW + 2 * D, "PST"), NOW)).toBe(true);
    expect(isUpcomingFixture({ date: "lixo", status: "NS" }, NOW)).toBe(false);
  });

  it("sem status informado conta como não iniciado", () => {
    expect(isUpcomingFixture({ date: new Date(NOW + D).toISOString() }, NOW)).toBe(true);
  });

  it("upcomingOnly tira os velhos/longes e deixa os próximos em ordem de data", () => {
    const out = upcomingOnly([fx(NOW + 9 * D), fx(NOW - 100 * D), fx(NOW + 2 * D), fx(NOW + 60 * D)], NOW);
    expect(out.map((f) => Math.round((new Date(f.date).getTime() - NOW) / D))).toEqual([2, 9]);
    expect(upcomingOnly(null, NOW)).toEqual([]);
    expect(upcomingOnly(undefined, NOW)).toEqual([]);
  });
});

describe("resposta da API: vazia SEM erro é válida; com erro não", () => {
  it("erro = limite de requisições / instabilidade", () => {
    expect(apiResponseFailed({ errors: { rateLimit: "Too many requests" }, response: [] })).toBe(true);
    expect(apiResponseFailed({ errors: ["falhou"], response: [] })).toBe(true);
  });

  it("sem erro, mesmo vazia, quer dizer 'o clube não tem mais jogos'", () => {
    expect(apiResponseFailed({ errors: [], response: [] })).toBe(false);
    expect(apiResponseFailed({ errors: {}, response: [] })).toBe(false);
    expect(apiResponseFailed({ response: [] })).toBe(false);
    expect(apiResponseFailed(null)).toBe(false);
  });
});

describe("competições na tela: só as em andamento", () => {
  const comp = (name: string, over: any = {}) => ({ leagueName: name, liveMatch: null, nextMatch: null, ...over });

  it("clube parado (nenhuma competição com jogo) → lista vazia", () => {
    expect(onlyActiveCompetitions([comp("Serie D", { nextMatch: fx(new Date("2026-07-26T20:00:00Z").getTime()) }), comp("Goiano")], NOW)).toEqual([]);
  });

  it("mantém só a competição com jogo próximo ou ao vivo", () => {
    const out = onlyActiveCompetitions(
      [comp("Parada", { nextMatch: fx(NOW - 90 * D) }), comp("Ativa", { nextMatch: fx(NOW + 4 * D) }), comp("Ao vivo", { liveMatch: fx(NOW - H, "2H") })],
      NOW,
    );
    expect(out.map((c) => c.leagueName)).toEqual(["Ativa", "Ao vivo"]);
  });

  it("na competição que fica, o próximo jogo velho some (nunca 'Começando…')", () => {
    const out = onlyActiveCompetitions([comp("Copa", { liveMatch: fx(NOW - H, "1H"), nextMatch: fx(NOW - 80 * D) })], NOW);
    expect(out).toHaveLength(1);
    expect(out[0].nextMatch).toBeNull();
  });

  it("entradas vazias ou nulas não quebram", () => {
    expect(onlyActiveCompetitions(null, NOW)).toEqual([]);
    expect(onlyActiveCompetitions([], NOW)).toEqual([]);
  });
});
