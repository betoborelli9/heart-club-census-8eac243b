// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const db: { games: any[]; leagues: any[]; extra: Record<number, any[]>; queries: any[] } = { games: [], leagues: [], extra: {}, queries: [] };
const mine: { ids: number[] } = { ids: [] };

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => {
      const q: any = { f: {} };
      q.select = () => q;
      q.gte = () => q;
      q.lt = () => q;
      q.order = () => q;
      q.limit = () => Promise.resolve({ data: q.f.league != null ? db.extra[q.f.league] || [] : db.games, error: null });
      q.eq = (c: string, v: any) => ((q.f[c === "league_id" ? "league" : c] = v), q);
      q.or = (s: string) => (db.queries.push(s), q);
      return q;
    },
    rpc: () => Promise.resolve({ data: db.leagues, error: null }),
  },
}));
vi.mock("@/hooks/useMyTeamIds", () => ({ useMyTeamIds: () => mine.ids }));
vi.mock("@/hooks/useTranslationApp", () => ({ useTranslationApp: () => ({ t: (k: string, o?: any) => (o?.n !== undefined ? `${k}:${o.n}` : k), language: "pt" }) }));
vi.mock("@/components/ClubLogo", () => ({ ClubLogo: () => null }));

import Jogos from "./Jogos";

const iso = (minAgo: number) => new Date(Date.now() - minAgo * 60_000).toISOString();
const g = (id: number, league: number, h: [number, string], a: [number, string], over: any = {}) => ({
  fixture_id: id, league_id: league, league_name: league === 72 ? "Serie B" : league === 39 ? "Premier League" : "Liga Estranha", league_logo: null, country: league === 72 ? "Brazil" : "England", season: 2026,
  round: "R1", kickoff: iso(30), status: "NS", elapsed: null, extra: null, home_id: h[0], home_name: h[1], home_logo: null, away_id: a[0], away_name: a[1], away_logo: null,
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

describe("Aba Jogos", () => {
  beforeEach(() => {
    mine.ids = [];
    db.queries = [];
    db.extra = {};
    db.games = [
      g(1, 72, [142, "Vila Nova"], [77, "Novorizontino"], { status: "2H", elapsed: 63, goals_home: 2, goals_away: 1, kickoff: iso(70) }),
      g(2, 72, [10, "Time A"], [11, "Time B"], { status: "FT", elapsed: 90, goals_home: 0, goals_away: 3, kickoff: iso(200) }),
      g(3, 39, [33, "Arsenal"], [34, "Chelsea"], { kickoff: new Date(Date.now() + 3 * 3600_000).toISOString() }),
    ];
    db.leagues = [
      { league_id: 72, league_name: "Serie B", league_logo: null, country: "Brazil", jogos: 2, ao_vivo: 1 },
      { league_id: 39, league_name: "Premier League", league_logo: null, country: "England", jogos: 1, ao_vivo: 0 },
      { league_id: 9001, league_name: "Liga Estranha", league_logo: null, country: "Andorra", jogos: 3, ao_vivo: 1 },
    ];
  });

  it("mostra os campeonatos principais agrupados, ao vivo em vermelho com minutos, encerrado com 'Fim' e o placar", async () => {
    renderPage();
    const secs = await screen.findAllByTestId("sec-league");
    expect(secs.length).toBe(2);
    expect(secs[0].textContent).toContain("Serie B"); // Brasil vem antes da Premier na ordem de destaque
    expect(secs[1].textContent).toContain("Premier League");
    expect(screen.getByTestId("row-minute").textContent).toBe("63'");
    const rows = within(secs[0]).getAllByTestId("match-row");
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain("Vila Nova"); // ao vivo vem primeiro
    expect(rows[1].textContent).toContain("jogos.ft");
    expect(within(rows[1]).getByTestId("row-score").textContent).toBe("03");
  });

  it("contador 'Ao vivo' é do mundo todo (vem da lista de campeonatos) e o filtro mostra só os ao vivo", async () => {
    db.extra[9001] = [g(9, 9001, [90, "Andorra FC"], [91, "Escaldes"], { status: "1H", elapsed: 12, goals_home: 0, goals_away: 0, kickoff: iso(14) })];
    renderPage();
    await screen.findAllByTestId("sec-league");
    expect(screen.getByTestId("live-count").textContent).toBe("2");
    fireEvent.click(screen.getByTestId("live-toggle"));
    await waitFor(() => expect(screen.getAllByTestId("match-row").length).toBe(2)); // Vila x Novorizontino + Andorra (outro campeonato, aberto sozinho)
    expect(screen.queryByText("Arsenal")).toBeNull(); // não começou: some no filtro
    expect(document.body.textContent).toContain("Andorra FC");
  });

  it("'Meus times' vem primeiro e destaca os jogos dos times do torcedor", async () => {
    mine.ids = [33];
    renderPage();
    const mineSec = await screen.findByTestId("sec-mine");
    expect(mineSec.textContent).toContain("Arsenal");
    expect(mineSec.textContent).not.toContain("Vila Nova");
    expect(db.queries.some((q) => q.includes("home_id.in.(33)"))).toBe(true); // busca os jogos dos times do torcedor
  });

  it("toque no time abre a página do clube com campeonato e temporada", async () => {
    renderPage();
    const rows = await screen.findAllByTestId("match-row");
    fireEvent.click(within(rows[0]).getByLabelText("Vila Nova"));
    expect((await screen.findByTestId("where")).textContent).toBe("/clube/142?liga=72&temp=2026");
  });

  it("'Mais campeonatos' lista os outros do mundo e abrir um carrega os jogos dele", async () => {
    db.extra[9001] = [g(9, 9001, [90, "Andorra FC"], [91, "Escaldes"], { kickoff: new Date(Date.now() + 2 * 3600_000).toISOString() })];
    renderPage();
    await screen.findAllByTestId("sec-league");
    fireEvent.click(screen.getByText("jogos.more", { exact: false }));
    const more = await screen.findAllByTestId("more-league");
    expect(more.length).toBe(1);
    fireEvent.click(more[0]);
    await waitFor(() => expect(document.body.textContent).toContain("Andorra FC"));
    expect(screen.queryAllByTestId("more-league").length).toBe(0); // saiu da lista e virou seção
  });

  it("dia sem jogos mostra mensagem amigável", async () => {
    db.games = [];
    db.leagues = [];
    renderPage();
    expect(await screen.findByTestId("jogos-empty")).toBeTruthy();
  });

  it("faixa de dias: trocar de dia refaz a busca", async () => {
    renderPage();
    await screen.findAllByTestId("sec-league");
    const before = db.queries.length;
    fireEvent.click(within(screen.getByTestId("day-strip")).getByText("jogos.tomorrow"));
    await waitFor(() => expect(db.queries.length).toBeGreaterThan(before));
  });
});
