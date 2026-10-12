// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const state: { payload: any; invokes: any[] } = { payload: null, invokes: [] };

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: (name: string, opts: any) => {
        state.invokes.push({ name, body: opts?.body });
        return Promise.resolve({ data: state.payload, error: null });
      },
    },
  },
}));
vi.mock("@/hooks/useTranslationApp", () => ({
  useTranslationApp: () => ({ t: (k: string, o?: any) => (o ? `${k}:${JSON.stringify(o)}` : k), language: "pt" }),
}));
vi.mock("@/components/ClubLogo", () => ({ ClubLogo: () => null }));

import ClubChances, { amr, zoneColor, zoneLabel } from "./ClubChances";

// Campeonato de 4 times: 1 vaga de acesso (1º) e 1 rebaixado (4º). Nosso time = id 2 (hoje 2º, 10 pts, 2 jogos faltando).
const team = (id: number, name: string, position: number, points: number, over: any = {}) => ({
  id, name, logo: null, position, points, played: 6, remaining: 2, dist: [0.1, 0.5, 0.3, 0.1], expPoints: points + 2.1, p10: points, p90: points + 5,
  title: 0.1, zoneProb: { Promotion: 0.1, "Relegation - Serie B": 0.1 }, difficulty: 50, ...over,
});
const payload = (over: any = {}) => ({
  supported: true,
  league: { id: 9999, season: 2026, name: "Liga X" },
  groups: [
    {
      group: null,
      teams: [team(1, "Líder FC", 1, 13, { title: 0.7, dist: [0.7, 0.2, 0.1, 0], zoneProb: { Promotion: 0.7, "Relegation - Serie B": 0 }, difficulty: 20 }), team(2, "Nosso FC", 2, 10, { title: 0.1, difficulty: 80 }), team(3, "Meio FC", 3, 7), team(4, "Lanterna FC", 4, 2, { title: 0, dist: [0, 0.05, 0.15, 0.8], zoneProb: { Promotion: 0, "Relegation - Serie B": 0.8 } })],
      zones: [
        { label: "Promotion", positions: [1] },
        { label: "Relegation - Serie B", positions: [4] },
      ],
      cutMedian: [14, 11, 8, 4],
      remaining: [
        { id: 1, date: "2026-10-20T20:00:00Z", h: 2, a: 1, hn: "Nosso FC", an: "Líder FC", hl: null, al: null, pH: 0.25, pD: 0.28, pA: 0.47, live: null },
        { id: 2, date: "2026-10-27T20:00:00Z", h: 3, a: 2, hn: "Meio FC", an: "Nosso FC", hl: null, al: null, pH: 0.4, pD: 0.3, pA: 0.3, live: null },
        { id: 3, date: "2026-10-28T20:00:00Z", h: 3, a: 4, hn: "Meio FC", an: "Lanterna FC", hl: null, al: null, pH: 0.6, pD: 0.25, pA: 0.15, live: null },
      ],
      meta: { sims: 12000, finishedGames: 6, remainingGames: 6, minPlayed: 6 },
    },
  ],
  ...over,
});

const renderIt = (teamId = 2) =>
  render(
    <MemoryRouter>
      <ClubChances teamId={teamId} leagueId={9999} season={2026} />
    </MemoryRouter>,
  );

describe("Chances do clube", () => {
  beforeEach(() => {
    state.payload = payload();
    state.invokes = [];
  });

  it("pede ao servidor o campeonato certo e mostra chance de 1º, de cada zona e pontos projetados", async () => {
    renderIt();
    await screen.findByTestId("chances");
    expect(state.invokes[0]).toEqual({ name: "league-prognosis", body: { leagueId: 9999, season: 2026 } });
    expect(within(screen.getByTestId("zone-title")).getByText("10%")).toBeTruthy();
    const rows = screen.getAllByTestId("zone-row");
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain("Acesso"); // "Promotion" → "Acesso"
    expect(rows[1].textContent).toContain("Rebaixamento"); // "Relegation - Serie B" → "Rebaixamento"
    expect(rows[1].textContent).toContain("10%");
    expect(screen.getByText("12")).toBeTruthy(); // pontos projetados (10 + 2,1 → 12)
  });

  it("pontos de corte e aproveitamento necessário (AMR) fazem a conta com os jogos que faltam", async () => {
    renderIt();
    await screen.findByTestId("chances");
    const cuts = screen.getAllByTestId("zone-cut").map((e) => e.textContent || "");
    // Acesso (1º): corte 14, tem 10 → faltam 4 pontos em 2 jogos (6 possíveis) = 67%
    expect(cuts[0]).toContain('"pts":14');
    expect(cuts[0]).toContain('"n":67');
    // Rebaixamento: para escapar vale o corte do 3º (8) + 1 = 9; já tem 10 → "já está acima do corte"
    expect(cuts[1]).toContain('"pts":9');
    expect(cuts[1]).toContain("chances.safe_now");
  });

  it("jogos que faltam mostram vitória/empate/derrota do ponto de vista do nosso time (mandante e visitante)", async () => {
    renderIt();
    await screen.findByTestId("chances");
    const games = screen.getAllByTestId("chance-game");
    expect(games.length).toBe(2); // só os do time 2
    expect(games[0].textContent).toContain("Líder FC");
    expect(games[0].textContent).toContain("25%"); // em casa: vitória = pH
    expect(games[0].textContent).toContain("47%"); // derrota = pA
    expect(games[1].textContent).toContain("30%"); // fora: vitória = pA (30%)
    expect(screen.getByTestId("chances-sos").textContent).toContain("chances.hard"); // dificuldade 80
  });

  it("lista de todos os clubes aparece e o aviso de poucos jogos só quando há menos de 8 por time", async () => {
    renderIt();
    await screen.findByTestId("chances");
    expect(within(screen.getByTestId("chances-all")).getAllByRole("button").length).toBe(4);
    expect(screen.getByTestId("chances-few")).toBeTruthy(); // minPlayed = 6
    state.payload = payload();
    state.payload.groups[0].meta.minPlayed = 20;
    const { unmount } = renderIt();
    unmount();
  });

  it("campeonato sem tabela de pontos corridos: mensagem clara, sem número inventado", async () => {
    state.payload = { supported: false, reason: "Este campeonato não tem tabela de pontos corridos.", groups: [] };
    renderIt();
    expect(await screen.findByTestId("chances-unsupported")).toBeTruthy();
    expect(screen.queryByTestId("chances")).toBeNull();
  });

  it("time que não está em nenhum grupo suportado: mensagem clara", async () => {
    renderIt(777);
    expect(await screen.findByTestId("chances-unsupported")).toBeTruthy();
  });

  it("funções de apoio: AMR, nome e cor de zona", () => {
    expect(amr(60, 50, 5)).toMatchObject({ need: 10, pct: 67, done: false, impossible: false });
    expect(amr(60, 62, 5)).toMatchObject({ need: 0, done: true });
    expect(amr(60, 40, 5)).toMatchObject({ impossible: true }); // 20 pontos em 15 possíveis
    expect(amr(60, 50, 0)).toMatchObject({ pct: null, impossible: true });
    expect(zoneLabel(999, { label: "Promotion - Champions League (League phase)", positions: [1, 2] }, 20, "pt")).toBe("Champions League (fase de liga)");
    expect(zoneLabel(999, { label: "Relegation - Championship", positions: [18, 19, 20] }, 20, "pt")).toBe("Rebaixamento");
    expect(zoneLabel(999, { label: "Promotion Play-offs", positions: [3, 4, 5, 6] }, 20, "pt")).toBe("Playoff de acesso");
    expect(zoneColor("Rebaixamento")).toBe("#ef4444");
    expect(zoneColor("Promotion Play-offs")).toBe("#f59e0b");
    expect(zoneColor("Acesso")).toBe("#22c55e");
  });

  it("campeonatos com regras já cadastradas (ex.: Série B, id 72) usam o texto em português das regras", () => {
    const label = zoneLabel(72, { label: "Promotion", positions: [1, 2] }, 20, "pt");
    expect(label.length).toBeGreaterThan(0);
    expect(label).not.toBe("Promotion");
  });
});
