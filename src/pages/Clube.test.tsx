// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const state: { payload: any; error: any; invokes: any[]; standings: any } = { payload: null, error: null, invokes: [], standings: null };
const squadPayload = { teamId: 142, updatedAt: new Date().toISOString(), coach: null, players: [{ id: 1, name: "Goleiro Um", pos: "Goalkeeper", number: 1, age: 30, photo: null }], moves: [] };

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: (name: string, opts: any) => {
        state.invokes.push({ name, body: opts?.body });
        return Promise.resolve({ data: name === "club-squad" ? squadPayload : name === "league-standings" ? state.standings : state.payload, error: state.error });
      },
    },
    from: () => {
      const q: any = {
        select: () => q,
        eq: () => q,
        maybeSingle: () => Promise.resolve({ data: { cor_primaria: "#E30613", cor_secundaria: "#000000", estadio_nome: "Estádio OBA" }, error: null }),
      };
      return q;
    },
  },
}));
vi.mock("@/hooks/useTranslationApp", () => ({ useTranslationApp: () => ({ t: (k: string) => k, language: "pt" }) }));
vi.mock("@/hooks/useClubTheme", () => ({ useClubTheme: () => ({ primaryHex: "#111111", secondaryHex: "#2a2a2a" }) }));
vi.mock("@/components/ClubLogo", () => ({ ClubLogo: () => null }));
vi.mock("@/components/dashboard/ClubSearch", () => ({
  ClubSearch: ({ onSelect }: any) => <button data-testid="fake-search" onClick={() => onSelect({ name: "Newcastle", api_id: 34 })}>buscar</button>,
}));

import Clube, { resultFor, roundLabel } from "./Clube";

const g = (id: number, r: number, h: number, a: number, gh: number | null, ga: number | null, st: string, day: number, extra: any = {}) => ({
  id, date: new Date(2026, 3, day, 16, 0).toISOString(), st, r: `Regular Season - ${r}`, h, hn: h === 142 ? "Vila Nova" : `Time ${h}`, hl: null, a, an: a === 142 ? "Vila Nova" : `Time ${a}`, al: null, gh, ga, ...extra,
});

const payload = () => ({
  team: { id: 142, name: "Vila Nova", logo: null },
  league: { id: 72, season: 2026, name: "Serie B", logo: "", country: "Brazil" },
  summary: { played: 3, win: 1, draw: 1, lose: 1, goalsFor: 4, goalsAgainst: 4, goalsDiff: 0, points: 4, pct: 44, form: ["V", "E", "D"] },
  games: [
    g(1, 1, 142, 10, 2, 0, "FT", 1), // vitória
    g(2, 2, 11, 142, 1, 1, "FT", 8), // empate fora
    g(3, 3, 142, 12, 0, 2, "FT", 15), // derrota
    g(4, 4, 142, 13, 1, 0, "2H", 22, { el: 63, upd: new Date().toISOString() }), // ao vivo
    g(5, 5, 14, 142, null, null, "NS", 29),
  ],
});

const renderAt = (url = "/clube/142?liga=72&temp=2026") => {
  Element.prototype.scrollIntoView = vi.fn();
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/clube/:teamId" element={<Clube />} />
      </Routes>
    </MemoryRouter>,
  );
};

describe("Página do clube — temporada completa", () => {
  beforeEach(() => {
    state.payload = payload();
    state.error = null;
    state.invokes = [];
  });

  it("pede ao servidor os jogos do time no campeonato certo e mostra resumo, cores e todos os jogos", async () => {
    renderAt();
    await screen.findByTestId("club-summary");
    expect(state.invokes[0]).toEqual({ name: "club-season", body: { teamId: 142, leagueId: 72, season: 2026 } });
    expect(screen.getAllByText("Vila Nova").length).toBeGreaterThan(0);
    await waitFor(() => expect(screen.getByTestId("club-hero").getAttribute("data-primary")).toBe("#E30613")); // cor do clube no cabeçalho
    expect(screen.getAllByTestId("game-row").length + screen.getAllByTestId("game-next").length).toBe(5);
    // resultado do ponto de vista do Vila: V, E, D
    expect(screen.getAllByTestId("game-result").map((e) => e.textContent)).toEqual(["D", "E", "V"]); // mais recente primeiro
  });

  it("o jogo ao vivo é o destaque, com minutos do próprio jogo; jogo encerrado mostra só o placar", async () => {
    renderAt();
    await screen.findByTestId("game-next");
    expect(screen.getByTestId("game-minute").textContent).toBe("63'");
    expect(screen.getAllByTestId("game-score").map((e) => e.textContent)).toEqual(["0 - 2", "1 - 1", "2 - 0"]);
  });

  it("filtros: Jogados e Próximos", async () => {
    renderAt();
    await screen.findByTestId("game-next");
    fireEvent.click(screen.getByText("clube.f_done"));
    await waitFor(() => expect(screen.getAllByTestId("game-score").length).toBe(3));
    expect(screen.queryByTestId("game-next")).toBeNull();
    fireEvent.click(screen.getByText("clube.f_next"));
    await waitFor(() => expect(screen.queryAllByTestId("game-score").length).toBe(0));
    expect(screen.getByTestId("game-next")).toBeTruthy();
  });

  it("endereço sem campeonato ou erro do servidor: mostra mensagem amigável e não quebra", async () => {
    state.payload = { error: "campeonato não encontrado" };
    renderAt();
    expect(await screen.findByText("clube.error")).toBeTruthy();
    expect(screen.queryByTestId("club-summary")).toBeNull();
  });

  it("endereço malformado (sem liga/temporada) não chama o servidor", async () => {
    renderAt("/clube/142");
    expect(await screen.findByText("clube.error")).toBeTruthy();
    expect(state.invokes.length).toBe(0);
  });

  it("utilitários: rodada curta e resultado pelo ponto de vista do time", () => {
    expect(roundLabel("Regular Season - 33")).toBe("R33");
    expect(roundLabel("Round of 16")).toBe("Round of 16");
    expect(roundLabel("Quarter-finals of the competition")).toBe("Quarter-final…");
    expect(roundLabel(null)).toBe("");
    const game: any = g(1, 1, 142, 10, 1, 3, "FT", 1);
    expect(resultFor(game, 142)).toBe("D");
    expect(resultFor(game, 10)).toBe("V");
    expect(resultFor(g(2, 2, 1, 2, null, null, "NS", 2) as any, 1)).toBeNull();
  });

  it("abas: Jogos e Elenco; o elenco só é buscado quando a aba é aberta", async () => {
    renderAt();
    await screen.findByTestId("club-summary");
    expect(state.invokes.map((i) => i.name)).toEqual(["club-season"]); // elenco ainda não foi pedido
    fireEvent.click(screen.getByText("clube.tab_squad"));
    expect(await screen.findByTestId("squad")).toBeTruthy();
    expect(state.invokes.map((i) => i.name)).toEqual(["club-season", "club-squad"]);
    fireEvent.click(screen.getByText("clube.tab_games"));
    await waitFor(() => expect(screen.queryByTestId("tab-elenco")).toBeNull());
  });

  it("endereço com ?aba=elenco já abre no elenco", async () => {
    renderAt("/clube/142?liga=72&temp=2026&aba=elenco");
    expect(await screen.findByTestId("squad")).toBeTruthy();
  });

  it("pesquisar outro clube: a lupa abre a busca e o clube escolhido abre no campeonato principal, na mesma aba", async () => {
    state.standings = {
      team: { id: 34, name: "Newcastle", logo: null },
      competitions: [
        { leagueId: 48, season: 2026, leagueName: "League Cup", country: "England", standings: [] },
        { leagueId: 2, season: 2026, leagueName: "UEFA Champions League", country: "World", standings: new Array(36).fill(0) },
        { leagueId: 39, season: 2026, leagueName: "Premier League", country: "England", standings: new Array(20).fill(0) },
      ],
    };
    renderAt("/clube/142?liga=72&temp=2026&aba=chances");
    await screen.findByTestId("club-summary");
    expect(screen.queryByTestId("club-search")).toBeNull();
    fireEvent.click(screen.getByTestId("club-search-toggle"));
    fireEvent.click(await screen.findByTestId("fake-search"));
    await waitFor(() => expect(state.invokes.some((i) => i.name === "club-season" && i.body.teamId === 34 && i.body.leagueId === 39)).toBe(true));
    expect(state.invokes.find((i) => i.name === "league-standings")?.body).toEqual({ clubName: "Newcastle", teamId: 34 });
    expect(screen.getByTestId("tab-chances")).toBeTruthy(); // continua na aba Chances
  });

  it("pesquisar clube sem campeonato ativo mostra aviso e não troca de página", async () => {
    state.standings = { team: { id: 999, name: "Clube Amador", logo: null }, competitions: [] };
    renderAt();
    await screen.findByTestId("club-summary");
    fireEvent.click(screen.getByTestId("club-search-toggle"));
    fireEvent.click(await screen.findByTestId("fake-search"));
    expect(await screen.findByTestId("club-search-msg")).toBeTruthy();
    expect(state.invokes.filter((i) => i.name === "club-season").length).toBe(1);
  });

  it("ordem dos jogos: os que faltam primeiro (do mais próximo ao mais distante) e os já realizados por último, do mais recente ao mais antigo", async () => {
    renderAt();
    await screen.findByTestId("club-summary");
    const rows = screen.getAllByTestId(/^game-(next|row)$/).map((e) => e.textContent || "");
    expect(rows.length).toBe(5);
    expect(rows[0]).toContain("Time 13"); // ao vivo agora
    expect(rows[1]).toContain("Time 14"); // próximo jogo marcado
    expect(rows[2]).toContain("Time 12"); // último jogo realizado
    expect(rows[3]).toContain("Time 11");
    expect(rows[4]).toContain("Time 10"); // o mais antigo por último
    const heads = screen.getAllByTestId("games-head").map((e) => e.textContent);
    expect(heads).toEqual(["clube.upcoming", "clube.played"]);
  });

  it("casa/fora aparece em branco e legível", async () => {
    renderAt();
    await screen.findByTestId("club-summary");
    const v = screen.getAllByTestId("game-venue")[0];
    expect(v.className).toContain("text-white");
    expect(v.className).not.toContain("text-white/");
  });
});
