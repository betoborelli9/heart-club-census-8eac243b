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

import { clearPrognosisCache } from "@/hooks/useLeaguePrognosis";
import ClubChances, { amr, cumZoneProbs, isNeutral, zoneColor, zoneLabel } from "./ClubChances";

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
    clearPrognosisCache();
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
    const cuts = screen.getAllByTestId("cut-row").map((e) => e.textContent || "");
    expect(cuts.length).toBe(2); // campeão (1º) e fugir do rebaixamento
    // Campeão (1º): corte 14, tem 10 → faltam 4 pontos em 2 jogos (6 possíveis) = 67%
    expect(cuts[0]).toContain("chances.cut_champion");
    expect(cuts[0]).toContain("14");
    expect(cuts[0]).toContain('"n":4');
    expect(cuts[0]).toContain('"n":67');
    // Rebaixamento: para escapar vale o corte do 3º (8) + 1 = 9; já tem 10 → "já está acima do corte"
    expect(cuts[1]).toContain("chances.cut_escape");
    expect(cuts[1]).toContain("9");
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

  it("'Como calculamos' abre o explicador da metodologia, com a ressalva de que outros modelos podem diferir", async () => {
    const { fireEvent } = await import("@testing-library/react");
    renderIt();
    await screen.findByTestId("chances");
    expect(screen.queryByTestId("how-dialog")).toBeNull();
    fireEvent.click(screen.getByTestId("how-btn"));
    const dialog = await screen.findByTestId("how-dialog");
    expect(dialog.textContent).toContain("chances.how_1");
    expect(dialog.textContent).toContain("chances.how_5"); // outros modelos podem dar números diferentes
    expect(dialog.textContent).toContain("chances.how_6"); // probabilidade, não garantia
  });

  it("clube neutro: na lista aparece 'Neutro' no lugar dos números e quem tem chance mostra os percentuais", async () => {
    state.payload = payload();
    state.payload.groups[0].teams[2] = { ...state.payload.groups[0].teams[2], title: 0, zoneProb: { Promotion: 0, "Relegation - Serie B": 0.001 } }; // Meio FC
    renderIt();
    await screen.findByTestId("chances");
    const list = screen.getByTestId("chances-all");
    expect(within(list).getAllByTestId("all-neutral").length).toBe(1);
    expect(within(list).getAllByTestId("all-neutral")[0].closest("button")!.textContent).toContain("Meio FC");
    expect(screen.queryByTestId("chances-neutral-note")).toBeNull(); // o nosso time (Nosso FC) não é neutro
  });

  it("quando o nosso próprio clube é neutro, a aba explica em uma frase", async () => {
    state.payload = payload();
    state.payload.groups[0].teams[1] = { ...state.payload.groups[0].teams[1], title: 0, zoneProb: { Promotion: 0, "Relegation - Serie B": 0 } }; // Nosso FC
    renderIt();
    expect(await screen.findByTestId("chances-neutral-note")).toBeTruthy();
  });

  it("neutro = abaixo de 2% em todos os objetivos (e o título também conta)", () => {
    expect(isNeutral({ a: 0.001, b: 0.019 }, 0)).toBe(true);
    expect(isNeutral({ a: 0.001, b: 0.021 }, 0)).toBe(false);
    expect(isNeutral({ a: 0, b: 0 }, 0.03)).toBe(false);
    expect(isNeutral(undefined, 0)).toBe(true);
  });

  it("resumo em frases: subir direto, zona neutra e cair, com barra empilhada somando 100%", async () => {
    renderIt();
    await screen.findByTestId("chances-summary");
    const lines = screen.getAllByTestId("sum-line").map((e) => e.textContent || "");
    expect(lines.length).toBe(3); // acesso direto · zona neutra · rebaixamento
    expect(lines[0]).toContain("10%");
    expect(lines[0]).toContain("chances.sum_zone");
    expect(lines[1]).toContain("80%"); // 2º e 3º lugar: nem sobe nem cai (0,5 + 0,3)
    expect(lines[1]).toContain("chances.sum_neutral");
    expect(lines[2]).toContain("10%");
    expect(lines[2]).toContain("chances.sum_relegation");
    expect(screen.getByTestId("sum-bar").children.length).toBe(3);
  });

  it("jogos que faltam: mostra quantos são em casa e fora e a força de quem joga contra", async () => {
    state.payload = payload();
    const g = state.payload.groups[0];
    g.teams[1] = { ...g.teams[1], homeLeft: 1, awayLeft: 1, homePpg: 2.1, awayPpg: 1.2 };
    g.remaining[0] = { ...g.remaining[0], sh: 40, sa: 90 }; // Nosso FC (casa) x Líder FC (forte)
    g.remaining[1] = { ...g.remaining[1], sh: 10, sa: 40 }; // Meio FC (fraco) x Nosso FC (fora)
    renderIt();
    await screen.findByTestId("chances");
    const ha = screen.getByTestId("chances-homeaway").textContent || "";
    expect(ha).toContain('"h":1');
    expect(ha).toContain('"a":1');
    expect(ha).toContain("chances.ha_record");
    const venues = screen.getAllByTestId("chance-venue").map((e) => e.textContent);
    expect(venues).toEqual(["clube.home", "clube.away"]);
    const strengths = screen.getAllByTestId("opp-strength").map((e) => e.textContent || "");
    expect(strengths[0]).toContain("chances.s_strong"); // adversário 90 → forte
    expect(strengths[1]).toContain("chances.s_weak"); // adversário 10 → fraco
  });

  it("cartão de pontos de corte fica logo abaixo dos 3 cartões de números e acima do resumo", async () => {
    renderIt();
    const cuts = await screen.findByTestId("chances-cuts");
    const summary = screen.getByTestId("chances-summary");
    expect(cuts.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("tabela provável: posições das faixas com o clube projetado, quem mais pode ficar ali e a zona neutra recolhida", async () => {
    renderIt();
    await screen.findByTestId("chances-table");
    const rows = screen.getAllByTestId("table-row");
    expect(rows.length).toBe(2); // 1º e 4º (as faixas)
    expect(rows[0].textContent).toContain("Líder FC"); // mais pontos esperados
    expect(rows[1].textContent).toContain("Lanterna FC"); // menos pontos esperados
    expect(screen.getByTestId("table-gap").textContent).toContain('"a":2');
    expect(screen.getByTestId("table-gap").textContent).toContain('"b":3');
    expect(screen.getAllByTestId("table-also")[0].textContent).toContain("Nosso FC"); // também pode ficar em 1º
  });

  it("tabela provável mostra os pontos esperados com 1 casa decimal e diz qual desempate foi usado", async () => {
    state.payload = payload();
    state.payload.groups[0].meta.rule = "br";
    renderIt();
    await screen.findByTestId("chances-table");
    const pts = screen.getAllByTestId("table-pts").map((e) => e.textContent);
    expect(pts[0]).toBe("15,1"); // Líder FC: 13 + 2,1
    expect(screen.getByTestId("table-tiebreak").textContent).toContain("chances.tiebreak_br");
  });

  it("tabela provável: empate nos pontos esperados vai para o desempate do Brasil (mais vitórias fica na frente)", async () => {
    state.payload = payload();
    const g = state.payload.groups[0];
    g.meta.rule = "br";
    // dois clubes com os mesmos pontos esperados (12,1): quem tem mais vitórias fica na frente, mesmo com saldo pior
    g.teams[0] = { ...g.teams[0], points: 10, expPoints: 12.1, win: 3, gf: 8, ga: 2 }; // Líder FC
    g.teams[1] = { ...g.teams[1], points: 10, expPoints: 12.1, win: 4, gf: 8, ga: 7 }; // Nosso FC: mais vitórias, saldo pior
    renderIt();
    await screen.findByTestId("chances-table");
    const rows = screen.getAllByTestId("table-row");
    expect(rows[0].textContent).toContain("Nosso FC");
  });

  it("faixas de cima somam ('ou melhor'): o G6 nunca é menor que o acesso direto, no resumo e nos objetivos", async () => {
    state.payload = payload();
    const g = state.payload.groups[0];
    g.zones = [
      { label: "Promotion", positions: [1] },
      { label: "Promotion Play-offs", positions: [2, 3] },
      { label: "Relegation - Serie B", positions: [4] },
    ];
    g.teams[1] = { ...g.teams[1], zoneProb: { Promotion: 0.1, "Promotion Play-offs": 0.8, "Relegation - Serie B": 0.1 } }; // Nosso FC: dist [0.1,0.5,0.3,0.1]
    renderIt();
    await screen.findByTestId("chances-zones");
    const rows = screen.getAllByTestId("zone-row");
    expect(rows[0].textContent).toContain("10%"); // acesso (1º)
    expect(rows[1].textContent).toContain("90%"); // play-off OU MELHOR = 1º+2º+3º (10% + 50% + 30%)
    expect(rows[1].textContent).toContain("chances.or_better");
    expect(screen.getAllByTestId("zone-range")[1].textContent).toContain("1º–3º");
    expect(rows[2].textContent).toContain("10%"); // rebaixamento exato
    // resumo diz o mesmo número que a lista
    const lines = screen.getAllByTestId("sum-line").map((e) => e.textContent || "");
    expect(lines[1]).toContain("90%");
    // regra de ouro: cada faixa de cima é >= a anterior
    const pcts = [rows[0], rows[1]].map((r) => Number(/(\d+)%/.exec(r.textContent || "")![1]));
    expect(pcts[1]).toBeGreaterThanOrEqual(pcts[0]);
  });

  it("cumZoneProbs: com a distribuição por posição, sem ela, faixa de rebaixamento exata e limite de 100%", () => {
    const zones = [{ label: "A", positions: [1, 2] }, { label: "B", positions: [3, 4, 5, 6] }, { label: "R", positions: [7, 8] }];
    const dist = [0.3, 0.2, 0.2, 0.1, 0.05, 0.05, 0.05, 0.05];
    const c = cumZoneProbs(zones, 8, dist, {});
    expect(c.A).toBeCloseTo(0.5, 5);
    expect(c.B).toBeCloseTo(0.9, 5); // 1º ao 6º
    expect(c.R).toBeCloseTo(0.1, 5); // rebaixamento: só 7º e 8º
    const c2 = cumZoneProbs(zones, 8, [], { A: 0.5, B: 0.4, R: 0.1 }); // sem dist: soma as faixas de cima
    expect(c2.A).toBeCloseTo(0.5, 5);
    expect(c2.B).toBeCloseTo(0.9, 5);
    expect(c2.R).toBeCloseTo(0.1, 5);
    const c3 = cumZoneProbs(zones, 8, [], { A: 0.7, B: 0.6, R: 0 });
    expect(c3.B).toBe(1);
  });

  it("lista 'Todos os clubes': colunas com título (pontos, 1º lugar e rebaixamento) e cores diferentes", async () => {
    renderIt();
    await screen.findByTestId("chances-all");
    const head = screen.getByTestId("all-head").textContent || "";
    expect(head).toContain("chances.col_pts");
    expect(head).toContain("chances.col_first");
    expect(head).toContain("REB");
    const first = within(screen.getByTestId("chances-all")).getAllByTitle("chances.first")[0] as HTMLElement;
    expect(first.style.color).toBe("rgb(251, 191, 36)"); // dourado, nunca a cor do clube
  });

  it("meta impossível (precisaria de mais de 100% dos pontos que restam) diz 'fora do alcance' e nunca mostra % acima de 100", async () => {
    state.payload = payload();
    const g = state.payload.groups[0];
    g.cutMedian = [40, 11, 8, 4]; // campeão precisaria de 40 pts: tem 10 e só restam 6 possíveis (2 jogos)
    renderIt();
    await screen.findByTestId("chances-cuts");
    const first = screen.getAllByTestId("cut-row")[0].textContent || "";
    expect(first).toContain("chances.out_of_reach");
    expect(first).toContain('"max":6');
    expect(first).not.toContain("chances.need");
    for (const r of screen.getAllByTestId("cut-row")) {
      const m = /"n":(\d+)\}.*chances\.need:\{"n":(\d+)/.exec(r.textContent || "");
      if (m) expect(Number(m[2])).toBeLessThanOrEqual(100);
    }
  });

  it("jogo do clube em andamento: pontos e 'faltam' usam o placar de agora, igual ao topo da página (nunca os pontos oficiais velhos)", async () => {
    state.payload = payload();
    const g = state.payload.groups[0];
    // Nosso FC (10 pts, 2 jogos faltando) está ganhando 1 x 0 em casa agora: conta 13 pts e falta 1 jogo
    g.remaining[0] = { ...g.remaining[0], live: { gh: 1, ga: 0, el: 60, st: "2H" } };
    renderIt();
    await screen.findByTestId("chances-cuts");
    expect(screen.getByTestId("left-count").textContent).toBe("1");
    const champion = screen.getAllByTestId("cut-row")[0].textContent || "";
    expect(champion).toContain('"n":1'); // corte 14: tem 13 → falta 1 ponto (e não 4, como seria com os 10 oficiais)
    expect(champion).toContain('"n":33'); // 1 de 3 pontos possíveis no 1 jogo que sobra
  });

  it("casa/fora dos jogos que faltam em branco e legível", async () => {
    renderIt();
    await screen.findByTestId("chances");
    const v = screen.getAllByTestId("chance-venue")[0];
    expect(v.className).toContain("text-white");
    expect(v.className).not.toContain("text-white/");
  });
});
