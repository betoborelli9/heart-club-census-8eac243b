// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const state: { prognosis: any; invokes: string[] } = { prognosis: null, invokes: [] };

const standings = [
  { position: 1, name: "Vila Nova", teamId: 142, points: 61, played: 33, win: 18, draw: 7, lose: 8, goalsDiff: 15 },
  { position: 2, name: "Juventude", teamId: 2, points: 60, played: 33, win: 17, draw: 9, lose: 7, goalsDiff: 18 },
  { position: 3, name: "Novorizontino", teamId: 3, points: 57, played: 32, win: 16, draw: 9, lose: 7, goalsDiff: 25 },
  { position: 4, name: "Ponte Preta", teamId: 4, points: 13, played: 32, win: 3, draw: 4, lose: 25, goalsDiff: -40 },
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
        team(4, "Ponte Preta", 4, { zoneProb: { Promotion: 0, "Promotion Play-offs": 0, Relegation: 1 } }),
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

  it("começa nas estatísticas (V E D SG) e NÃO pede chances ao servidor até o torcedor tocar", async () => {
    renderPanel();
    await screen.findByTestId("chances-toggle");
    expect(screen.getAllByText("SG").length).toBeGreaterThan(0);
    expect(screen.queryAllByTestId("chance-cell").length).toBe(0);
    expect(state.invokes).not.toContain("league-prognosis");
  });

  it("ao tocar em 'Chances %' mostra as colunas de acesso, play-off e rebaixamento com as porcentagens de cada clube", async () => {
    renderPanel();
    fireEvent.click(await screen.findByTestId("chances-toggle"));
    await waitFor(() => expect(screen.getAllByTestId("chance-cell").length).toBe(12)); // 4 clubes × 3 zonas
    expect(state.invokes).toContain("league-prognosis");
    const heads = ["ACESSO", "PO", "REB"].map((h) => screen.getAllByText(h).length);
    expect(heads.every((n) => n >= 1)).toBe(true);
    const rows = screen.getAllByRole("row");
    const vila = rows.find((r) => r.textContent?.includes("Vila Nova"))!;
    expect(vila.textContent).toContain("57%"); // acesso direto
    expect(vila.textContent).toContain("42%"); // play-off
    const ponte = rows.find((r) => r.textContent?.includes("Ponte Preta"))!;
    expect(within(ponte).getAllByTestId("chance-cell").map((c) => c.textContent)).toEqual(["0%", "0%", "100%"]); // só rebaixamento
    // as colunas de V E D e SG saem de cena enquanto as chances estão visíveis
    expect(screen.queryAllByText("SG").length).toBe(0);
  });

  it("voltar para 'Estatísticas' traz as colunas de sempre", async () => {
    renderPanel();
    fireEvent.click(await screen.findByTestId("chances-toggle"));
    await waitFor(() => expect(screen.getAllByTestId("chance-cell").length).toBeGreaterThan(0));
    fireEvent.click(screen.getByText("clube.view_stats"));
    await waitFor(() => expect(screen.queryAllByTestId("chance-cell").length).toBe(0));
    expect(screen.getAllByText("SG").length).toBeGreaterThan(0);
  });

  it("campeonato em formato sem chances (copa/grupos especiais): avisa e continua mostrando a tabela normal", async () => {
    state.prognosis = { supported: false, reason: "formato", groups: [] };
    renderPanel();
    fireEvent.click(await screen.findByTestId("chances-toggle"));
    expect(await screen.findByTestId("chances-unavailable")).toBeTruthy();
    expect(screen.queryAllByTestId("chance-cell").length).toBe(0);
    expect(screen.getAllByText("SG").length).toBeGreaterThan(0);
  });
});
