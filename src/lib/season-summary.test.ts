import { describe, expect, it } from "vitest";
import { summarizeTeam, type FullGame } from "../../supabase/functions/_shared/season-full";

const g = (id: number, h: number, a: number, gh: number | null, ga: number | null, st: string): FullGame =>
  ({ id, date: "2026-10-18T21:00:00+00:00", st, r: null, h, hn: `T${h}`, hl: null, a, an: `T${a}`, al: null, gh, ga }) as FullGame;

describe("resumo do clube: pontos, jogos e forma", () => {
  const games = [g(1, 10, 20, 2, 0, "FT"), g(2, 30, 10, 1, 1, "FT"), g(3, 10, 40, 0, 1, "FT"), g(4, 10, 50, 2, 1, "2H")]; // o último está rolando

  it("só conta jogos encerrados (o jogo ao vivo fica de fora)", () => {
    const s = summarizeTeam(games, 10);
    expect(s).toMatchObject({ played: 3, win: 1, draw: 1, lose: 1, points: 4, goalsFor: 3, goalsAgainst: 2, goalsDiff: 1 });
    expect(s.form).toEqual(["V", "E", "D"]);
  });

  it("projeção ao vivo: o jogo em andamento conta pelo placar de agora (2 x 1 = +3 pontos, +1 jogo, +1 vitória)", () => {
    const s = summarizeTeam(games, 10, { includeLive: true });
    expect(s).toMatchObject({ played: 4, win: 2, draw: 1, lose: 1, points: 7, goalsFor: 5, goalsAgainst: 3, goalsDiff: 2 });
    expect(s.form).toEqual(["V", "E", "D", "V"]);
  });

  it("se o placar ao vivo virar, a projeção acompanha (empate = +1; derrota = +0)", () => {
    expect(summarizeTeam([...games.slice(0, 3), g(4, 10, 50, 1, 1, "2H")], 10, { includeLive: true }).points).toBe(5);
    expect(summarizeTeam([...games.slice(0, 3), g(4, 10, 50, 0, 3, "2H")], 10, { includeLive: true }).points).toBe(4);
  });

  it("jogo ao vivo sem placar ainda não entra, e jogo que não começou nunca entra", () => {
    expect(summarizeTeam([...games.slice(0, 3), g(4, 10, 50, null, null, "1H")], 10, { includeLive: true }).played).toBe(3);
    expect(summarizeTeam([...games.slice(0, 3), g(4, 10, 50, null, null, "NS")], 10, { includeLive: true }).played).toBe(3);
  });
});
