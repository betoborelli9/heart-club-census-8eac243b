// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const state: { prognosis: any; invokes: string[] } = { prognosis: null, invokes: [] };

const standings = [
  { position: 1, name: "Vila Nova", teamId: 142, points: 61, played: 33, win: 18, draw: 7, lose: 8, goalsDiff: 15 },
  { position: 2, name: "Juventude", teamId: 2, points: 60, played: 33, win: 17, draw: 9, lose: 7, goalsDiff: 18 },
  { position: 3, name: "Novorizontino", teamId: 3, points: 57, played: 32, win: 16, draw: 9, lose: 7, goalsDiff: 25 },
  { position: 4, name: "Meio de Tabela", teamId: 5, points: 40, played: 32, win: 11, draw: 7, lose: 14, goalsDiff: -2 },
  { position: 5, name: "Ponte Preta", teamId: 4, points: 13, played: 32, win: 3, draw: 4, lose: 25, goalsDiff: -40 },
];

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: (name: string) => {
        state.invokes.push(name);
        if (name === "league-standings") {
          return Promise.resolve({
            data: {
              team: { id: 142, name: "Vila Nova", logo: "" },
              competitions: [{ leagueId: 9999, leagueName: "Liga X", leagueLogo: "", season: 2026, standings, me: standings[0], nextMatch: null, liveMatch: null }],
            },
            error: null,
          });
        }
        return Promise.resolve({ data: state.prognosis, error: null });
      },
    },
  },
}));
vi.mock("@/hooks/useTranslationApp", () => ({ useTranslationApp: () => ({ t: (k: string) => k, language: "pt" }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("html-to-image", () => ({ toPng: vi.fn() }));
vi.mock("@/components/ClubLogo", () => ({ ClubLogo: () => null }));
vi.mock("@/components/dashboard/LeagueLiveStrip", () => ({ default: () => null }));

import CompetitionsPanel from "./CompetitionsPanel";

const team = (id: number, name: string, position: number, over: any = {}) => ({
  id, name, position, points: 0, played: 0, remaining: 5, dist: [], expPoints: 0, p10: 0, p90: 0, title: 0, difficulty: 50,
  zoneProb: { Promotion: 0, "Promotion Play-offs": 0, Relegation: 0 }, ...over,
});
const prognosis = () => ({
  supported: true,
  groups: [
    {
      group: null,
      teams: [
        team(142, "Vila Nova", 1, { zoneProb: { Promotion: 0.573, "Promotion Play-offs": 0.424, Relegation: 0 } }),
        team(2, "Juventude", 2, { zoneProb: { Promotion: 0.586, "Promotion Play-offs": 0.412, Relegation: 0 } }),
        team(3, "Novorizontino", 3, { zoneProb: { Promotion: 0.4, "Promotion Play-offs": 0.5, Relegation: 0 } }),
        team(5, "Meio de Tabela", 4, { zoneProb: { Promotion: 0, "Promotion Play-offs": 0.001, Relegation: 0.002 } }),
        team(4, "Ponte Preta", 5, { zoneProb: { Promotion: 0, "Promotion Play-offs": 0, Relegation: 1 } }),
      ],
      zones: [
        { label: "Promotion", positions: [1, 2] },
        { label: "Promotion Play-offs", positions: [3] },
        { label: "Relegation", positions: [4] },
      ],
    },
  ],
});

const renderPanel = () =>
  render(
    <MemoryRouter>
      <CompetitionsPanel clubName="Vila Nova" />
    </MemoryRouter>,
  );

describe("Tabela do Dashboard — chances %", () => {
  beforeEach(() => {
    state.prognosis = prognosis();
    state.invokes = [];
  });

  it("os percentuais já aparecem de cara (sem tocar em nada): ACESSO, PO e REB, e o servidor é consultado na abertura", async () => {
    renderPanel();
    await waitFor(() => expect(screen.getAllByTestId("chance-cell").length).toBeGreaterThan(0));
    expect(state.invokes).toContain("league-prognosis");
    for (const h of ["ACESSO", "PO", "REB"]) expect(screen.getAllByText(h).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryAllByText("SG").length).toBe(0);
  });

  it("mostra a chance de cada clube em cada objetivo", async () => {
    renderPanel();
    await waitFor(() => expect(screen.getAllByTestId("chance-cell").length).toBe(12)); // 4 clubes com chance × 3 zonas
    const rows = screen.getAllByRole("row");
    const vila = rows.find((r) => r.textContent?.includes("Vila Nova"))!;
    expect(vila.textContent).toContain("57%"); // acesso direto (1º–2º)
    expect(vila.textContent).toContain(">99%"); // play-off OU MELHOR (57% + 42%): o G6 nunca é menor que o acesso direto
    const ponte = rows.find((r) => r.textContent?.includes("Ponte Preta"))!;
    expect(within(ponte).getAllByTestId("chance-cell").map((c) => c.textContent)).toEqual(["0%", "0%", "100%"]); // só rebaixamento
  });

  it("clube sem chance prática de subir ou cair aparece como NEUTRO numa célula só, e quem tem chance não", async () => {
    renderPanel();
    const neutral = await screen.findAllByTestId("chance-neutral");
    expect(neutral.length).toBe(1);
    const row = neutral[0].closest("tr")!;
    expect(row.textContent).toContain("Meio de Tabela");
    expect(row.textContent).toContain("chances.neutral");
    expect(neutral[0].getAttribute("colspan")).toBe("3");
    const vila = screen.getAllByRole("row").find((r) => r.textContent?.includes("Vila Nova"))!;
    expect(within(vila).queryByTestId("chance-neutral")).toBeNull();
  });

  it("'Estatísticas' traz V E D SG de volta e 'Chances %' volta às colunas de chance", async () => {
    renderPanel();
    await waitFor(() => expect(screen.getAllByTestId("chance-cell").length).toBeGreaterThan(0));
    fireEvent.click(screen.getByText("clube.view_stats"));
    await waitFor(() => expect(screen.queryAllByTestId("chance-cell").length).toBe(0));
    expect(screen.getAllByText("SG").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByTestId("chances-toggle"));
    await waitFor(() => expect(screen.getAllByTestId("chance-cell").length).toBeGreaterThan(0));
  });

  it("campeonato em formato sem chances (copa/grupos especiais): avisa e mostra a tabela normal", async () => {
    state.prognosis = { supported: false, reason: "formato", groups: [] };
    renderPanel();
    expect(await screen.findByTestId("chances-unavailable")).toBeTruthy();
    expect(screen.queryAllByTestId("chance-cell").length).toBe(0);
    expect(screen.getAllByText("SG").length).toBeGreaterThan(0);
  });
});
