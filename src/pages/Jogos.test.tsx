// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const state: {
  games: any[]; comps: any[]; team: any; inIds: number[][]; invokes: any[];
  viewed: string | null; heart: string | null; setViewed: any; reset: any;
} = { games: [], comps: [], team: null, inIds: [], invokes: [], viewed: "Vila Nova", heart: "Vila Nova", setViewed: vi.fn(), reset: vi.fn() };

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: (name: string, opts: any) => {
        state.invokes.push({ name, body: opts?.body });
        return Promise.resolve({ data: { team: state.team, competitions: state.comps }, error: null });
      },
    },
    from: () => {
      const q: any = {};
      q.select = () => q;
      q.in = (_c: string, ids: number[]) => (state.inIds.push(ids), q);
      q.gte = () => q;
      q.lt = () => q;
      q.order = () => q;
      q.limit = () => Promise.resolve({ data: state.games, error: null });
      return q;
    },
  },
}));
vi.mock("@/contexts/ViewedClubContext", () => ({
  useViewedClub: () => ({
    viewedClubName: state.viewed,
    heartClubName: state.heart,
    setViewedClubName: state.setViewed,
    resetToHeart: state.reset,
    isViewingHeart: state.viewed === state.heart,
  }),
}));
vi.mock("@/components/dashboard/ClubSearch", () => ({
  ClubSearch: ({ onSelect }: any) => <button data-testid="fake-search" onClick={() => onSelect({ name: "Newcastle", api_id: 34 })}>buscar</button>,
}));
vi.mock("@/hooks/useTranslationApp", () => ({
  useTranslationApp: () => ({ t: (k: string, o?: any) => (o ? `${k}:${JSON.stringify(o)}` : k), language: "pt" }),
}));
vi.mock("@/components/ClubLogo", () => ({ ClubLogo: () => null }));

import Jogos from "./Jogos";
import { clearCompetitionsCache } from "@/hooks/useDayGames";

const day = (offset: number, hour = 16) => {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d.toISOString();
};
const g = (id: number, league: number, h: [number, string], a: [number, string], over: any = {}) => ({
  fixture_id: id, league_id: league, league_name: "Serie B", league_logo: null, country: "Brazil", season: 2026,
  round: "R1", kickoff: day(0), status: "NS", elapsed: null, extra: null, home_id: h[0], home_name: h[1], home_logo: null, away_id: a[0], away_name: a[1], away_logo: null,
  goals_home: null, goals_away: null, updated_at: new Date().toISOString(), ...over,
});

function Where() {
  const l = useLocation();
  return <div data-testid="where">{l.pathname + l.search}</div>;
}
const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/jogos"]}>
      <Routes>
        <Route path="/jogos" element={<Jogos />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );

describe("Aba Jogos — só o clube em exibição e os campeonatos dele", () => {
  afterEach(() => vi.useRealTimers());
  // Relógio fixo (15h de uma segunda): o teste não pode depender da hora em que roda
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 12, 15, 0, 0));
    clearCompetitionsCache();
    state.viewed = "Vila Nova";
    state.heart = "Vila Nova";
    state.team = { id: 142, name: "Vila Nova", logo: "x" };
    state.comps = [{ leagueId: 72, leagueName: "Serie B", leagueLogo: null, country: "Brazil", season: 2026 }];
    state.inIds = [];
    state.invokes = [];
    state.setViewed = vi.fn();
    state.reset = vi.fn();
    state.games = [
      g(1, 72, [142, "Vila Nova"], [77, "Novorizontino"], { status: "2H", elapsed: 63, goals_home: 2, goals_away: 1, kickoff: day(0, 14) }),
      g(2, 72, [10, "Time A"], [11, "Time B"], { status: "FT", elapsed: 90, goals_home: 0, goals_away: 3, kickoff: day(0, 12) }),
      g(3, 72, [12, "Time C"], [13, "Time D"], { kickoff: day(0, 21) }),
      g(4, 72, [142, "Vila Nova"], [14, "Time E"], { kickoff: day(5) }),
    ];
  });

  it("consulta os campeonatos do clube em exibição e busca SÓ os jogos desses campeonatos", async () => {
    renderPage();
    await screen.findAllByTestId("sec-league");
    expect(state.invokes[0]).toEqual({ name: "league-standings", body: { clubName: "Vila Nova" } });
    expect(state.inIds[0]).toEqual([72]); // nenhum outro campeonato do mundo é pedido
    const secs = screen.getAllByTestId("sec-league");
    expect(secs.length).toBe(1);
    expect(secs[0].textContent).toContain("Serie B");
    expect(secs[0].textContent).toContain("Vila Nova");
    expect(secs[0].textContent).toContain("Time A"); // os concorrentes do mesmo campeonato aparecem
  });

  it("jogo ao vivo em vermelho com minutos, encerrado com 'Fim', e o jogo do clube vem destacado", async () => {
    renderPage();
    const rows = await screen.findAllByTestId("match-row");
    expect(rows[0].textContent).toContain("Vila Nova"); // ao vivo primeiro
    expect(within(rows[0]).getByTestId("row-minute").textContent).toBe("63'");
    expect(rows[1].textContent).toContain("jogos.ft");
    expect((rows[0] as HTMLElement).style.boxShadow).toContain("inset"); // destaque do clube
  });

  it("sem jogo hoje: abre sozinho no próximo dia com jogos, com pontinho nos dias que têm jogo", async () => {
    state.games = [g(4, 72, [142, "Vila Nova"], [14, "Time E"], { kickoff: day(3) }), g(5, 72, [20, "X"], [21, "Y"], { kickoff: day(3, 19) })];
    renderPage();
    await screen.findAllByTestId("sec-league");
    const strip = screen.getByTestId("day-strip");
    expect(within(strip).getAllByRole("tab").find((b) => b.getAttribute("aria-selected") === "true")!.textContent).toContain(
      new Date(Date.now() + 3 * 86400000).toLocaleDateString("pt", { day: "2-digit", month: "2-digit" }),
    );
    expect(screen.getByTestId("mark-3")).toBeTruthy();
    expect(screen.queryByTestId("mark-0")).toBeNull();
  });

  it("dia vazio mostra mensagem com o nome do clube e botão para o próximo dia com jogos", async () => {
    renderPage();
    await screen.findAllByTestId("sec-league");
    fireEvent.click(within(screen.getByTestId("day-strip")).getByText("jogos.tomorrow")); // amanhã: sem jogo
    const empty = await screen.findByTestId("jogos-empty");
    expect(empty.textContent).toContain("Vila Nova");
    fireEvent.click(screen.getByTestId("go-next-day"));
    await waitFor(() => expect(screen.getAllByTestId("match-row").length).toBe(1)); // o jogo de daqui a 5 dias
  });

  it("'Ao vivo' conta e mostra só os jogos ao vivo dos campeonatos do clube", async () => {
    renderPage();
    await screen.findAllByTestId("sec-league");
    expect(screen.getByTestId("live-count").textContent).toBe("1");
    fireEvent.click(screen.getByTestId("live-toggle"));
    await waitFor(() => expect(screen.getAllByTestId("match-row").length).toBe(1));
    expect(screen.getByTestId("match-row").textContent).toContain("Novorizontino");
  });

  it("clube consultado (outro): mostra o aviso, o botão 'Meu clube' volta ao coração, e a busca troca o clube", async () => {
    state.viewed = "Newcastle";
    renderPage();
    await screen.findAllByTestId("sec-league");
    expect(screen.getByTestId("club-chip").textContent).toContain("jogos.consulting");
    fireEvent.click(screen.getByTestId("back-to-mine"));
    expect(state.reset).toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("search-toggle"));
    fireEvent.click(await screen.findByTestId("fake-search"));
    expect(state.setViewed).toHaveBeenCalledWith("Newcastle", 34);
  });

  it("toque no time abre a página do clube; 'Tabela e chances' abre a aba Chances no campeonato certo", async () => {
    renderPage();
    const rows = await screen.findAllByTestId("match-row");
    fireEvent.click(within(rows[0]).getByLabelText("Vila Nova"));
    expect((await screen.findByTestId("where")).textContent).toBe("/clube/142?liga=72&temp=2026");
  });

  it("link 'Tabela e chances' leva à aba de probabilidades do campeonato", async () => {
    renderPage();
    await screen.findAllByTestId("sec-league");
    fireEvent.click(screen.getByTestId("table-link"));
    expect((await screen.findByTestId("where")).textContent).toBe("/clube/142?liga=72&temp=2026&aba=chances");
  });

  it("ao abrir a página, e ao trocar de dia, volta ao topo: os primeiros jogos aparecem primeiro (nada escondido atrás do cabeçalho)", async () => {
    const spy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    renderPage();
    await screen.findAllByTestId("sec-league");
    expect(spy).toHaveBeenCalledWith({ top: 0, left: 0 });
    spy.mockClear();
    fireEvent.click(screen.getAllByRole("tab")[0]); // troca de dia
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ top: 0, left: 0 }));
    spy.mockRestore();
  });

  it("a faixa de dias centraliza o dia só na horizontal e nunca rola a página para baixo", async () => {
    const page = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const into = vi.fn();
    Element.prototype.scrollIntoView = into;
    renderPage();
    await screen.findAllByTestId("sec-league");
    expect(into).not.toHaveBeenCalled(); // scrollIntoView puxava a página junto
    page.mockRestore();
  });

  it("a página tem botão de voltar; aberta direto (sem histórico) ele leva ao início", async () => {
    renderPage();
    await screen.findAllByTestId("sec-league");
    fireEvent.click(screen.getByTestId("jogos-back"));
    expect((await screen.findByTestId("where")).textContent).toBe("/dashboard");
  });

  it("sem clube escolhido: pede para escolher e não consulta nada", async () => {
    state.viewed = null;
    state.heart = null;
    renderPage();
    expect(await screen.findByTestId("jogos-pick")).toBeTruthy();
    expect(state.invokes.length).toBe(0);
    expect(state.inIds.length).toBe(0);
  });

  it("clube sem campeonato em andamento: mensagem clara", async () => {
    state.comps = [];
    state.games = [];
    renderPage();
    expect(await screen.findByTestId("jogos-no-comp")).toBeTruthy();
  });
});
