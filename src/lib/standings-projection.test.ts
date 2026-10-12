import { describe, expect, it } from "vitest";
import { projectGroup, projectStandings, ruleFor, type SeasonGame, type StRow } from "../../supabase/functions/_shared/standings-projection";

const row = (teamId: number, position: number, p: Partial<StRow>): StRow => ({
  teamId, position, points: 0, played: 0, win: 0, draw: 0, lose: 0, goalsFor: 0, goalsAgainst: 0, goalsDiff: 0, ...p,
});
const game = (id: number, h: number, a: number, gh: number, ga: number, day: number, st = "FT"): SeasonGame => ({
  id, date: new Date(2026, 9, day).toISOString(), st, h, a, gh, ga,
});
const order = (r: StRow[]) => r.map((x) => x.teamId);

describe("Classificação ao vivo — lógica da projeção", () => {
  it("um gol muda a tabela na hora: o 2º colocado perdendo cai e o 3º, ganhando, sobe", () => {
    // 1=A (6 pts), 2=B (3 pts), 3=C (3 pts). C x B ao vivo: C 1 x 0 B.
    const rows = [
      row(1, 1, { points: 6, played: 2, win: 2, goalsFor: 4, goalsAgainst: 1, goalsDiff: 3 }),
      row(2, 2, { points: 3, played: 2, win: 1, lose: 1, goalsFor: 2, goalsAgainst: 1, goalsDiff: 1 }),
      row(3, 3, { points: 3, played: 2, win: 1, lose: 1, goalsFor: 2, goalsAgainst: 2, goalsDiff: 0 }),
    ];
    const seasonGames = [game(1, 1, 2, 2, 0, 1), game(2, 3, 1, 0, 2, 2), game(3, 2, 3, 2, 1, 3), game(4, 1, 3, 2, 0, 4)];
    void seasonGames;
    const p = projectGroup({ rows, leagueId: 39, seasonGames: [], liveGames: [{ id: 9, h: 3, a: 2, gh: 1, ga: 0 }] });
    expect(order(p.rows)).toEqual([1, 3, 2]);
    const c = p.rows.find((r) => r.teamId === 3)!;
    expect(c.points).toBe(6);
    expect(c.played).toBe(3);
    expect(c.isLive).toBe(true);
    expect(p.rows.find((r) => r.teamId === 1)!.isLive).toBeUndefined(); // quem não joga não fica marcado
    expect(p.liveApplied).toBe(1);
  });

  it("NÃO conta jogo duas vezes: se a oficial já tem o jogo encerrado, nada é somado", () => {
    // A venceu B (jogo 1, encerrado). A oficial já mostra J=1 para os dois.
    const rows = [
      row(1, 1, { points: 3, played: 1, win: 1, goalsFor: 2, goalsAgainst: 0, goalsDiff: 2 }),
      row(2, 2, { points: 0, played: 1, lose: 1, goalsFor: 0, goalsAgainst: 2, goalsDiff: -2 }),
    ];
    const p = projectGroup({ rows, leagueId: 39, seasonGames: [game(1, 1, 2, 2, 0, 1)], liveGames: [] });
    expect(p.reconciled).toBe(0);
    expect(p.rows.find((r) => r.teamId === 1)!.points).toBe(3);
    expect(p.rows.find((r) => r.teamId === 1)!.provisional).toBeUndefined();
  });

  it("jogo que acabou mas a API ainda não contou é somado UMA vez só", () => {
    // Oficial ainda sem o jogo 1 (J=0), mas ele já terminou 2x0 para o time 2.
    const rows = [row(1, 1, {}), row(2, 2, {})];
    const p = projectGroup({ rows, leagueId: 39, seasonGames: [game(1, 1, 2, 0, 2, 1)], liveGames: [] });
    expect(p.reconciled).toBe(1);
    expect(order(p.rows)).toEqual([2, 1]);
    expect(p.rows[0].points).toBe(3);
    expect(p.rows[0].played).toBe(1);
    // rodando de novo com o resultado já na oficial: nada muda
    const again = projectGroup({
      rows: [row(2, 1, { points: 3, played: 1, win: 1, goalsFor: 2, goalsDiff: 2 }), row(1, 2, { played: 1, lose: 1, goalsAgainst: 2, goalsDiff: -2 })],
      leagueId: 39, seasonGames: [game(1, 1, 2, 0, 2, 1)], liveGames: [],
    });
    expect(again.reconciled).toBe(0);
    expect(again.rows[0].points).toBe(3);
  });

  it("dados que não batem (diferença grande de jogos): não ajusta nada e confia na tabela oficial", () => {
    const rows = [row(1, 1, { points: 9, played: 3, win: 3 }), row(2, 2, { points: 0, played: 3, lose: 3 })];
    const many = [1, 2, 3, 4, 5, 6].map((i) => game(i, i % 2 ? 1 : 2, i % 2 ? 2 : 1, 1, 0, i));
    const p = projectGroup({ rows, leagueId: 39, seasonGames: many, liveGames: [] });
    expect(p.reconciled).toBe(0);
    expect(p.rows[0].points).toBe(9);
  });

  it("Brasil: no empate de pontos, mais vitórias vem antes do saldo de gols", () => {
    expect(ruleFor(72)).toBe("br");
    // Oficial coerente com a regra: B (2 vitórias) acima de A (1 vitória), mesmos pontos
    const rows = [
      row(2, 1, { points: 7, played: 3, win: 2, lose: 1, goalsFor: 3, goalsAgainst: 3, goalsDiff: 0 }),
      row(1, 2, { points: 7, played: 3, win: 1, draw: 4 - 1, goalsFor: 9, goalsAgainst: 2, goalsDiff: 7 }),
    ];
    // Sem jogo ao vivo a ordem oficial é preservada (a regra reproduz a oficial)
    const p = projectGroup({ rows, leagueId: 72, seasonGames: [], liveGames: [] });
    expect(order(p.rows)).toEqual([2, 1]);
    expect(p.rule).toBe("br");
  });

  it("regra que não reproduz a ordem oficial é descartada: nos empates vale a ordem oficial", () => {
    // Liga 'gd' (padrão), mas a oficial põe o de PIOR saldo na frente (regra desconhecida, ex.: confronto direto).
    const rows = [
      row(1, 1, { points: 6, played: 2, goalsDiff: -1, goalsFor: 1, goalsAgainst: 2 }),
      row(2, 2, { points: 6, played: 2, goalsDiff: 5, goalsFor: 6, goalsAgainst: 1 }),
      row(3, 3, { points: 0, played: 2 }),
    ];
    const p = projectGroup({ rows, leagueId: 999, seasonGames: [], liveGames: [{ id: 5, h: 3, a: 1, gh: 0, ga: 0 }] });
    expect(p.rule).toBe("official");
    expect(order(p.rows).slice(0, 2)).toEqual([1, 2]); // não inventa ordem entre empatados
  });

  it("Espanha/Itália/Portugal: confronto direto desempata antes do saldo", () => {
    expect(ruleFor(140)).toBe("h2h");
    // A e B empatados em pontos; A ganhou o confronto direto, B tem melhor saldo. Oficial: A na frente.
    const rows = [
      row(1, 1, { points: 4, played: 2, win: 1, draw: 1, goalsFor: 2, goalsAgainst: 1, goalsDiff: 1 }),
      row(2, 2, { points: 4, played: 2, win: 1, draw: 1, goalsFor: 6, goalsAgainst: 1, goalsDiff: 5 }),
      row(3, 3, { points: 0, played: 2, lose: 2 }),
    ];
    const seasonGames = [game(1, 1, 2, 1, 0, 1), game(2, 3, 1, 0, 0, 2), game(3, 2, 3, 6, 0, 3)];
    const p = projectGroup({ rows, leagueId: 140, seasonGames, liveGames: [] });
    expect(p.rule).toBe("h2h");
    expect(order(p.rows)).toEqual([1, 2, 3]);
  });

  it("vários grupos: cada grupo é projetado separado e jogo entre times de grupos diferentes é ignorado", () => {
    const rows = [
      row(1, 1, { group: "Grupo 1", points: 3, played: 1, win: 1 }),
      row(2, 2, { group: "Grupo 1", points: 0, played: 1, lose: 1 }),
      row(3, 1, { group: "Grupo 2", points: 3, played: 1, win: 1 }),
      row(4, 2, { group: "Grupo 2", points: 0, played: 1, lose: 1 }),
    ];
    const p = projectStandings(rows, { leagueId: 2, seasonGames: [], liveGames: [{ id: 1, h: 2, a: 1, gh: 5, ga: 0 }, { id: 2, h: 4, a: 1, gh: 1, ga: 0 }] });
    const g1 = p.rows.filter((r) => r.group === "Grupo 1");
    expect(order(g1)).toEqual([2, 1]); // virou no grupo 1
    expect(p.rows.find((r) => r.teamId === 4)!.points).toBe(0); // 4 x 1 (grupos diferentes) foi ignorado
    expect(p.liveApplied).toBe(1);
  });
});
