// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

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
vi.mock("@/hooks/useTranslationApp", () => ({ useTranslationApp: () => ({ t: (k: string, o?: any) => (o ? `${k}:${JSON.stringify(o)}` : k), language: "pt" }) }));
vi.mock("@/components/ClubLogo", () => ({ ClubLogo: () => null }));

import ClubSimulator, { clearSimulatorCache } from "./ClubSimulator";

const tm = (id: number, name: string, position: number, points: number, win: number, gf: number, ga: number) => ({
  id, name, logo: null, position, points, played: 6, remaining: 2, win, gf, ga, sg: 0, dist: [0.25, 0.25, 0.25, 0.25],
});
const game = (id: number, r: number, h: number, a: number, hn: string, an: string, day: number) => ({
  id, r: `Regular Season - ${r}`, date: new Date(Date.now() + day * 86400000).toISOString(), h, a, hn, an, hl: null, al: null,
  lh: 1.4, la: 1.1, frac: 1, g0h: 0, g0a: 0, pH: 0.45, pD: 0.27, pA: 0.28, live: null,
});
const payload = () => ({
  supported: true,
  groups: [
    {
      group: null,
      teams: [tm(1, "Líder FC", 1, 13, 4, 10, 4), tm(2, "Nosso FC", 2, 10, 3, 8, 6), tm(3, "Meio FC", 3, 7, 2, 6, 7), tm(4, "Lanterna FC", 4, 2, 0, 2, 12)],
      zones: [{ label: "Promotion", positions: [1] }, { label: "Relegation - Serie B", positions: [4] }],
      remaining: [
        game(11, 7, 2, 1, "Nosso FC", "Líder FC", 2),
        game(12, 7, 3, 4, "Meio FC", "Lanterna FC", 2),
        game(21, 8, 1, 3, "Líder FC", "Meio FC", 9),
        game(22, 8, 4, 2, "Lanterna FC", "Nosso FC", 9),
      ],
      meta: { rule: "gd" },
    },
  ],
});

const renderIt = () => render(<ClubSimulator teamId={2} leagueId={9999} season={2026} />);

describe("Aba Simular (E se...?)", () => {
  beforeEach(() => {
    state.payload = payload();
    state.invokes = [];
    clearSimulatorCache();
    localStorage.clear();
  });

  it("abre na próxima rodada: mostra só os jogos da rodada 7, com o jogo do meu clube primeiro", async () => {
    renderIt();
    await screen.findByTestId("simulator");
    expect(state.invokes[0]).toEqual({ name: "league-prognosis", body: { leagueId: 9999, season: 2026 } });
    const games = screen.getAllByTestId("sim-game");
    expect(games.length).toBe(2);
    expect(games[0].getAttribute("data-mine")).toBe("1");
    expect(games[0].textContent).toContain("Nosso FC");
    expect(games[1].textContent).toContain("Meio FC");
  });

  it("os botões trocam entre próxima rodada, só meu clube e todos os jogos", async () => {
    renderIt();
    await screen.findByTestId("simulator");
    fireEvent.click(screen.getByTestId("sim-mode-all"));
    expect(screen.getAllByTestId("sim-game").length).toBe(4); // inclui jogos dos adversários
    fireEvent.click(screen.getByTestId("sim-mode-mine"));
    expect(screen.getAllByTestId("sim-game").length).toBe(2); // 11 e 22
    expect(screen.getAllByTestId("sim-game").every((g) => g.getAttribute("data-mine") === "1")).toBe(true);
  });

  it("colocar o placar muda a tabela na hora (nosso clube vence o líder e assume a ponta) e mostra a seta", async () => {
    renderIt();
    await screen.findByTestId("simulator");
    const first = screen.getAllByTestId("sim-game")[0];
    fireEvent.change(within(first).getByTestId("sim-in-h"), { target: { value: "3" } });
    fireEvent.change(within(first).getByTestId("sim-in-a"), { target: { value: "0" } });
    await waitFor(() => expect(screen.getByTestId("sim-count").textContent).toContain('"n":1'));
    const rows = screen.getAllByTestId("sim-row").map((r) => r.textContent || "");
    expect(rows[0]).toContain("Nosso FC");
    expect(rows[0]).toContain("13"); // 10 + 3 (empata com o líder em pontos, vence no saldo)
    expect(screen.getAllByTestId("sim-delta-pos")[0].textContent).toBe("▲1");
    expect(rows[1]).toContain("Líder FC");
  });

  it("limpar volta tudo ao normal e os placares ficam guardados só neste aparelho (localStorage)", async () => {
    renderIt();
    await screen.findByTestId("simulator");
    const first = screen.getAllByTestId("sim-game")[0];
    fireEvent.change(within(first).getByTestId("sim-in-h"), { target: { value: "2" } });
    fireEvent.change(within(first).getByTestId("sim-in-a"), { target: { value: "2" } });
    await waitFor(() => expect(screen.getByTestId("sim-count").textContent).toContain('"n":1'));
    expect(localStorage.getItem("hc-whatif:9999:2026:2")).toContain('"2"');
    fireEvent.click(screen.getByTestId("sim-clear"));
    await waitFor(() => expect(screen.getByTestId("sim-count").textContent).toContain("sim.none"));
    expect(screen.getAllByTestId("sim-row")[0].textContent).toContain("Líder FC");
    // nada foi enviado ao servidor além da busca do campeonato
    expect(state.invokes.length).toBe(1);
  });

  it("só aceita números (letras são ignoradas) e placar incompleto não conta", async () => {
    renderIt();
    await screen.findByTestId("simulator");
    const first = screen.getAllByTestId("sim-game")[0];
    const h = within(first).getByTestId("sim-in-h") as HTMLInputElement;
    fireEvent.change(h, { target: { value: "a2b" } });
    expect(h.value).toBe("2");
    await new Promise((r) => setTimeout(r, 350));
    expect(screen.getByTestId("sim-count").textContent).toContain("sim.none"); // falta o outro lado
  });

  it("tabela final provável e chances com a diferença (pontos percentuais) em relação a não simular", async () => {
    renderIt();
    await screen.findByTestId("simulator");
    fireEvent.click(screen.getByTestId("sim-view-final"));
    expect(screen.getAllByTestId("sim-row").length).toBe(4);
    expect(screen.getAllByTestId("sim-line").length).toBe(3); // acesso · neutra · rebaixamento
    expect(screen.getByTestId("sim-likely").textContent).toContain("sim.bar_final");
  });

  it("rodada quase toda jogada: a próxima rodada junta a seguinte até completar uma rodada cheia, com título de cada rodada", async () => {
    state.payload = payload();
    state.payload.groups[0].remaining = [
      game(11, 7, 2, 1, "Nosso FC", "Líder FC", 1), // só 1 jogo falta na rodada 7
      game(21, 8, 3, 4, "Meio FC", "Lanterna FC", 5),
      game(22, 8, 4, 2, "Lanterna FC", "Nosso FC", 5),
      game(31, 9, 1, 3, "Líder FC", "Meio FC", 12),
    ];
    renderIt();
    await screen.findByTestId("simulator");
    expect(screen.getAllByTestId("sim-game").length).toBe(3); // rodada 7 (1 jogo) + rodada 8 (2 jogos)
    expect(screen.getByText('sim.round:{"n":7}')).toBeTruthy();
    expect(screen.getByText('sim.round:{"n":8}')).toBeTruthy();
    expect(screen.queryByText('sim.round:{"n":9}')).toBeNull();
  });

  it("campeonato sem tabela de pontos corridos mostra o aviso", async () => {
    state.payload = { supported: false, groups: [] };
    renderIt();
    expect(await screen.findByTestId("sim-unsupported")).toBeTruthy();
  });
});
