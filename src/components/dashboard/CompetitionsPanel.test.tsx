// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const day = 24 * 60 * 60 * 1000;
// Jogo de verdade para o clube: o servidor só devolve competição em que o time tem jogo ao vivo ou próximo jogo
const match = (offsetMs: number, status = "NS") => ({
  id: 1,
  date: new Date(Date.now() + offsetMs).toISOString(),
  status,
  league: { id: 9999, name: "Liga X", logo: "", round: "Regular Season - 34" },
  home: { id: 142, name: "Vila Nova", logo: "" },
  away: { id: 2, name: "Juventude", logo: "" },
  goals: { home: null, away: null },
});
const state: { prognosis: any; invokes: string[]; competitions: any[] | null } = { prognosis: null, invokes: [], competitions: null };

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
              competitions: state.competitions ?? [{ leagueId: 9999, leagueName: "Liga X", leagueLogo: "", season: 2026, standings, me: standings[0], nextMatch: match(2 * day), liveMatch: null }],
            },
            error: null,
          });
        }
        return Promise.resolve({ data: state.prognosis, error: null });
      },
    },
  },
}));
vi.mock("@/hooks/useTranslationApp", () => ({ useTranslationApp: () => ({ t: (k: string, o?: any) => (o?.group ? `${k}:${o.group}` : k), language: "pt" }) }));
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

const openChances = () => fireEvent.click(screen.getByTestId("chances-toggle"));

describe("Tabela do Dashboard — chances %", () => {
  beforeEach(() => {
    state.prognosis = prognosis();
    state.invokes = [];
    state.competitions = null;
  });

  it("a tabela de classificação abre CLÁSSICA: P J V E D SG, sem colunas de porcentagem e sem consultar chances", async () => {
    renderPanel();
    await screen.findByTestId("chances-toggle");
    await waitFor(() => expect(screen.getAllByRole("row").length).toBeGreaterThan(3));
    for (const h of ["P", "J", "V", "E", "D", "SG"]) expect(screen.getAllByText(h).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryAllByTestId("chance-cell").length).toBe(0);
    for (const h of ["ACESSO", "PO", "REB"]) expect(screen.queryAllByText(h).length).toBe(0);
    expect(state.invokes).not.toContain("league-prognosis"); // nem gasta consulta: só quando o torcedor pedir as chances
  });

  it("'Chances %' (opcional) mostra ACESSO, PO e REB no lugar de V E D SG, e consulta o servidor só então", async () => {
    renderPanel();
    await screen.findByTestId("chances-toggle");
    openChances();
    await waitFor(() => expect(screen.getAllByTestId("chance-cell").length).toBeGreaterThan(0));
    expect(state.invokes).toContain("league-prognosis");
    for (const h of ["ACESSO", "PO", "REB"]) expect(screen.getAllByText(h).length).toBeGreaterThanOrEqual(1);
  });

  it("mostra a chance de cada clube em cada objetivo", async () => {
    renderPanel();
    await screen.findByTestId("chances-toggle");
    openChances();
    await waitFor(() => expect(screen.getAllByTestId("chance-cell").length).toBe(12)); // 4 clubes com chance × 3 zonas
    const rows = screen.getAllByRole("row");
    const vila = rows.find((r) => r.textContent?.includes("Vila Nova"))!;
    expect(vila.textContent).toContain("57%"); // acesso direto (1º–2º)
    expect(vila.textContent).toContain(">99%"); // play-off OU MELHOR (57% + 42%): o G6 nunca é menor que o acesso direto
    const ponte = rows.find((r) => r.textContent?.includes("Ponte Preta"))!;
    expect(within(ponte).getAllByTestId("chance-cell").map((c) => c.textContent)).toEqual(["0%", "0%", "100%"]); // só rebaixamento
  });

  it("disputa de acesso em mata-mata: a coluna ACESSO de quem disputa mostra a chance de subir pelo play-off (61% × 39%), não a de acesso direto", async () => {
    const leg = (homeId: number, awayId: number) => ({ homeId, awayId, date: null, status: null, gh: null, ga: null, pH: 0.4, pD: 0.3, pA: 0.3 });
    state.prognosis.groups[0].playoff = {
      series: [{ seeds: [3, 6], betterId: 142, worseId: 2, pBetter: 0.61, pWorse: 0.39, decided: false, leg1: leg(2, 142), leg2: leg(142, 2) }],
    };
    renderPanel();
    await screen.findByTestId("chances-toggle");
    openChances();
    await waitFor(() => expect(screen.getAllByTestId("chance-cell").length).toBeGreaterThan(0));
    const rows = screen.getAllByRole("row");
    const vila = rows.find((r) => r.textContent?.includes("Vila Nova"))!;
    const juve = rows.find((r) => r.textContent?.includes("Juventude"))!;
    expect(within(vila).getAllByTestId("chance-cell")[0].textContent).toBe("61%"); // antes: 57% (acesso direto)
    expect(within(juve).getAllByTestId("chance-cell")[0].textContent).toBe("39%");
  });

  it("clube sem chance prática de subir ou cair aparece como NEUTRO numa célula só, e quem tem chance não", async () => {
    renderPanel();
    await screen.findByTestId("chances-toggle");
    openChances();
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
    await screen.findByTestId("chances-toggle");
    expect(screen.queryAllByTestId("chance-cell").length).toBe(0); // começa clássica
    openChances();
    await waitFor(() => expect(screen.getAllByTestId("chance-cell").length).toBeGreaterThan(0));
    fireEvent.click(screen.getByText("clube.view_stats"));
    await waitFor(() => expect(screen.queryAllByTestId("chance-cell").length).toBe(0));
    expect(screen.getAllByText("SG").length).toBeGreaterThan(0);
  });

  it("campeonato em formato sem chances (copa/grupos especiais): avisa e mostra a tabela normal", async () => {
    state.prognosis = { supported: false, reason: "formato", groups: [] };
    renderPanel();
    await screen.findByTestId("chances-toggle");
    openChances();
    expect(await screen.findByTestId("chances-unavailable")).toBeTruthy();
    expect(screen.queryAllByTestId("chance-cell").length).toBe(0);
    expect(screen.getAllByText("SG").length).toBeGreaterThan(0);
  });
});

// Regra geral (qualquer clube do mundo): clube SEM campeonato no momento não mostra tabela nem jogo velho
describe("Clube sem campeonato no momento", () => {
  const comp = (over: any) => ({ leagueId: 9999, leagueName: "Serie D", leagueLogo: "", season: 2026, standings, me: standings[0], nextMatch: null, liveMatch: null, ...over });

  beforeEach(() => {
    state.prognosis = prognosis();
    state.invokes = [];
    state.competitions = null;
  });

  it("servidor sem nenhuma competição: aparece 'sem campeonato' e nenhuma tabela", async () => {
    state.competitions = [];
    renderPanel();
    expect(await screen.findByText("competitions.empty")).toBeTruthy();
    expect(screen.queryAllByRole("row").length).toBe(0);
    expect(screen.queryByTestId("chances-toggle")).toBeNull();
  });

  it("jogo antigo 'não iniciado' (cache velho de 26/jul, caso do Goiatuba) NÃO vale como próximo jogo: nada de tabela nem 'Começando…'", async () => {
    state.competitions = [comp({ nextMatch: match(-110 * day, "NS") })]; // data passada há meses, status NS
    renderPanel();
    expect(await screen.findByText("competitions.empty")).toBeTruthy();
    expect(screen.queryAllByRole("row").length).toBe(0);
    expect(screen.queryByText("competitions.starting_soon")).toBeNull();
  });

  it("próximo jogo longe demais (mais de 30 dias): clube sem campeonato no momento, nada aparece", async () => {
    state.competitions = [comp({ nextMatch: match(45 * day) })];
    renderPanel();
    expect(await screen.findByText("competitions.empty")).toBeTruthy();
    expect(screen.queryAllByRole("row").length).toBe(0);
  });

  it("competição com jogo próximo (até 30 dias) continua aparecendo com a tabela", async () => {
    state.competitions = [comp({ nextMatch: match(5 * day) })];
    renderPanel();
    await screen.findByTestId("chances-toggle");
    expect(screen.getAllByRole("row").length).toBeGreaterThan(3);
    expect(screen.queryByText("competitions.empty")).toBeNull();
  });

  it("competição com jogo AO VIVO aparece mesmo sem próximo jogo", async () => {
    state.competitions = [comp({ liveMatch: match(-30 * 60 * 1000, "2H") })];
    renderPanel();
    await screen.findByTestId("chances-toggle");
    expect(screen.getAllByRole("row").length).toBeGreaterThan(3);
  });

  it("só a competição ativa fica: campeonato parado some e a que está em andamento permanece", async () => {
    state.competitions = [
      comp({ leagueId: 628, leagueName: "Goiano - 1", nextMatch: match(-200 * day) }), // parado
      comp({ leagueId: 76, leagueName: "Serie D", nextMatch: match(3 * day) }), // em andamento
    ];
    renderPanel();
    await screen.findByTestId("chances-toggle");
    expect(screen.getByText("Serie D")).toBeTruthy();
    expect(screen.queryByText("Goiano - 1")).toBeNull();
  });
});

// Regra geral por FASE: copa em mata-mata não tem tabela; na fase de grupos só o grupo do clube; ligas ficam como estão
describe("Tabela por fase da competição (Libertadores, Série D, Champions…)", () => {
  const grp = (g: string, ids: number[]) => ids.map((id, i) => ({ position: i + 1, name: `T${id}`, teamId: id, points: 12 - i * 3, played: 6, win: 3, draw: 0, lose: 3, goalsDiff: 1, group: g }));
  // 2 grupos de 4: o Vila Nova (142) está no Grupo 2 (a tabela "toda misturada" mostraria o Grupo 1 antes)
  const grouped = [...grp("Grupo 1", [11, 12, 13, 14]), ...grp("Grupo 2", [142, 22, 23, 24])];
  const cup = (round: string, over: any = {}) => ({
    leagueId: 13, leagueName: "Copa Libertadores", leagueLogo: "", leagueType: "Cup", season: 2026,
    standings: grouped, me: grouped.find((r) => r.teamId === 142), nextMatch: { ...match(12 * day), league: { id: 13, name: "Copa Libertadores", logo: "", round } }, liveMatch: null, ...over,
  });

  beforeEach(() => {
    state.prognosis = prognosis();
    state.invokes = [];
    state.competitions = null;
  });

  it("FINAL da Libertadores (copa em mata-mata): nenhuma tabela, nenhum botão de 'Chances %', e aparece 'Final'", async () => {
    state.competitions = [cup("Final")];
    renderPanel();
    const note = await screen.findByTestId("knockout-note");
    expect(note.textContent).toContain("Final");
    expect(note.textContent).toContain("competitions.knockout_note");
    expect(screen.queryAllByRole("row").length).toBe(0); // acabou a tabela "de pontos corridos"
    expect(screen.queryByTestId("chances-toggle")).toBeNull();
    expect(screen.queryByTestId("view-toggle")).toBeNull();
  });

  it("oitavas, quartas e semifinal também: sem tabela (e o nome da fase em português)", async () => {
    for (const [round, label] of [["Round of 16", "Oitavas de final"], ["Quarter-finals", "Quartas de final"], ["Semi-finals", "Semifinal"]]) {
      state.competitions = [cup(round)];
      const { unmount } = renderPanel();
      const note = await screen.findByTestId("knockout-note");
      expect(note.textContent).toContain(label);
      expect(screen.queryAllByRole("row").length).toBe(0);
      unmount();
    }
  });

  it("FASE DE GRUPOS: só a tabela do grupo do clube (nunca todos os grupos misturados), com o nome do grupo", async () => {
    state.competitions = [cup("Group Stage - 4")];
    renderPanel();
    await screen.findByTestId("my-group");
    expect(screen.getByTestId("my-group").textContent).toContain("Grupo 2");
    const body = screen.getAllByRole("row").map((r) => r.textContent || "");
    expect(body.some((r) => r.includes("Vila Nova") || r.includes("T142"))).toBe(true);
    expect(body.some((r) => r.includes("T11") || r.includes("T12"))).toBe(false); // nada do Grupo 1
    expect(screen.getAllByRole("row").length).toBeLessThanOrEqual(6); // cabeçalho + 4 times do grupo
    expect(screen.queryByTestId("knockout-note")).toBeNull();
  });

  it("copa de tabela única (ex.: Champions, sem grupos) também some nas oitavas", async () => {
    const single = grp("", [142, 2, 3, 4]).map((r) => ({ ...r, group: null }));
    state.competitions = [cup("Round of 16", { standings: single, me: single[0] })];
    renderPanel();
    expect(await screen.findByTestId("knockout-note")).toBeTruthy();
    expect(screen.queryAllByRole("row").length).toBe(0);
  });

  it("Série D (liga com grupos) no mata-mata: sem a tabela da fase de grupos", async () => {
    state.competitions = [cup("Round of 16", { leagueName: "Serie D", leagueType: "League" })];
    renderPanel();
    expect(await screen.findByTestId("knockout-note")).toBeTruthy();
    expect(screen.queryAllByRole("row").length).toBe(0);
  });

  it("pontos corridos (Série B) com play-off de acesso: a tabela final CONTINUA e os botões também", async () => {
    state.competitions = [
      {
        leagueId: 72, leagueName: "Serie B", leagueLogo: "", leagueType: "League", season: 2026, standings, me: standings[0],
        nextMatch: { ...match(5 * day), league: { id: 72, name: "Serie B", logo: "", round: "Promotion Play-offs - Semi-finals" } }, liveMatch: null,
      },
    ];
    renderPanel();
    await screen.findByTestId("chances-toggle");
    expect(screen.getAllByRole("row").length).toBeGreaterThan(3);
    expect(screen.queryByTestId("knockout-note")).toBeNull();
  });

  it("pontos corridos normais (rodada 34): tabela como sempre, e a rodada aparece em português", async () => {
    renderPanel();
    await screen.findByTestId("chances-toggle");
    expect(screen.getAllByRole("row").length).toBeGreaterThan(3);
    expect(screen.getByText("Rodada 34")).toBeTruthy();
  });
});

// ── Play-off de acesso em destaque; tabela geral escondida atrás de um toque ───────────────────────────────────
describe("Painel com play-off de acesso (Série B 2026)", () => {
  const leg = (homeId: number, awayId: number) => ({ homeId, awayId, date: "2026-11-21T21:00:00+00:00", status: "NS", gh: null, ga: null, pH: 0.4, pD: 0.3, pA: 0.3 });
  // 3º Vila Nova (142) × 6º Juventude (2: fica como 6º só para o teste); 4º Novorizontino (3) × 5º Meio de Tabela (5)
  const withPlayoff = () => {
    const p: any = prognosis();
    p.groups[0].playoff = {
      series: [
        { seeds: [3, 6], betterId: 142, worseId: 2, pBetter: 0.61, pWorse: 0.39, decided: false, leg1: leg(2, 142), leg2: leg(142, 2) },
        { seeds: [4, 5], betterId: 3, worseId: 5, pBetter: 0.65, pWorse: 0.35, decided: false, leg1: leg(5, 3), leg2: leg(3, 5) },
      ],
    };
    return p;
  };
  const comp72 = (round = "Final", home = { id: 2, name: "Juventude", logo: "" }, away = { id: 142, name: "Vila Nova", logo: "" }) => ({
    leagueId: 72, leagueName: "Serie B", leagueLogo: "", leagueType: "League", season: 2026, standings, me: standings[0],
    nextMatch: { id: 9, date: new Date(Date.now() + 5 * day).toISOString(), status: "NS", league: { id: 72, name: "Serie B", logo: "", round }, home, away, goals: { home: null, away: null } },
    liveMatch: null,
  });

  beforeEach(() => {
    state.prognosis = withPlayoff();
    state.invokes = [];
    state.competitions = [comp72()];
  });

  it("ao entrar: a tabela do PLAY-OFF aparece de cara com os 4 clubes e a chance de subir de cada um", async () => {
    renderPanel();
    const table = await screen.findByTestId("playoff-table");
    expect(within(table).getAllByTestId("po-row").length).toBe(4);
    expect(within(table).getAllByTestId("po-row-pct").map((e) => e.textContent)).toEqual(["61%", "39%", "65%", "35%"]);
    expect(state.invokes).toContain("league-prognosis"); // pedido sozinho, sem o torcedor tocar em nada
  });

  it("a tabela geral do campeonato fica ESCONDIDA e abre com um clique (e esconde de novo)", async () => {
    renderPanel();
    await screen.findByTestId("playoff-table");
    expect(screen.queryAllByRole("row").length).toBe(0); // nenhuma linha da tabela geral
    expect(screen.queryByTestId("view-toggle")).toBeNull();
    const toggle = screen.getByTestId("full-table-toggle");
    expect(toggle.textContent).toBe("playoff.show_general");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    await waitFor(() => expect(screen.getAllByRole("row").length).toBeGreaterThan(3)); // tabela geral aparece
    expect(screen.getByTestId("view-toggle")).toBeTruthy(); // e os botões Estatísticas / Chances % junto
    expect(screen.getByTestId("playoff-table")).toBeTruthy(); // o play-off continua em evidência
    expect(screen.getByTestId("full-table-toggle").textContent).toBe("playoff.hide_general");
    fireEvent.click(screen.getByTestId("full-table-toggle"));
    await waitFor(() => expect(screen.queryAllByRole("row").length).toBe(0));
  });

  it("o jogo em destaque é a ida do play-off (e não 'Final'): 'Play-off de acesso · Ida'", async () => {
    renderPanel(); // ida: o mandante é o pior colocado (Juventude no teste), o visitante é o Vila Nova
    await screen.findByTestId("playoff-table");
    expect(screen.getByText("playoff.round_leg1")).toBeTruthy();
    expect(screen.queryByText("Final")).toBeNull();
  });

  it("a volta (mandante = melhor colocado) aparece como 'Volta (decisiva)'", async () => {
    state.competitions = [comp72("Final", { id: 142, name: "Vila Nova", logo: "" }, { id: 2, name: "Juventude", logo: "" })];
    renderPanel();
    await screen.findByTestId("playoff-table");
    expect(screen.getByText("playoff.round_leg2")).toBeTruthy();
  });

  it("clube na disputa vem primeiro: o bloco do clube do torcedor (Vila Nova) é o primeiro", async () => {
    renderPanel();
    const blocks = await screen.findAllByTestId("po-block");
    expect(blocks[0].textContent).toContain("Vila Nova");
  });

  it("sem cálculo de play-off (formato sem chances ou erro): mostra a tabela geral normal, sem esconder nada", async () => {
    state.prognosis = { supported: false, reason: "formato", groups: [] };
    renderPanel();
    await waitFor(() => expect(screen.getAllByRole("row").length).toBeGreaterThan(3));
    expect(screen.queryByTestId("playoff-table")).toBeNull();
    expect(screen.queryByTestId("full-table-toggle")).toBeNull();
    expect(screen.getByTestId("chances-toggle")).toBeTruthy();
  });

  it("campeonato SEM play-off (pontos corridos comuns) continua igual: tabela geral direto e nenhuma consulta extra", async () => {
    state.competitions = null;
    state.prognosis = prognosis();
    renderPanel();
    await screen.findByTestId("chances-toggle");
    expect(screen.getAllByRole("row").length).toBeGreaterThan(3);
    expect(screen.queryByTestId("playoff-table")).toBeNull();
    expect(state.invokes).not.toContain("league-prognosis"); // só consulta quando o torcedor pede "Chances %"
  });
});
