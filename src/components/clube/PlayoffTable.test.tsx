// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

vi.mock("@/hooks/useTranslationApp", () => ({ useTranslationApp: () => ({ t: (k: string, o?: any) => (o?.a ? `${k}:${o.a}|${o.b}` : k), language: "pt" }) }));
vi.mock("@/components/ClubLogo", () => ({ ClubLogo: () => null }));

import PlayoffTable from "./PlayoffTable";
import { leagueHasPlayoff, playoffLegOf } from "@/lib/playoff-view";

const teams = [
  { id: 3, name: "Vila Nova", logo: null, position: 3, points: 66 },
  { id: 4, name: "Fortaleza EC", logo: null, position: 4, points: 65 },
  { id: 5, name: "Criciuma", logo: null, position: 5, points: 62 },
  { id: 6, name: "Atletico Goianiense", logo: null, position: 6, points: 61 },
];
const leg = (homeId: number, awayId: number, date: string | null = "2026-11-21T21:00:00+00:00") => ({ homeId, awayId, date, status: "NS", gh: null, ga: null, pH: 0.4, pD: 0.3, pA: 0.3 });
const series = [
  { seeds: [3, 6] as [number, number], betterId: 3, worseId: 6, pBetter: 0.611, pWorse: 0.389, decided: false, leg1: leg(6, 3), leg2: leg(3, 6, "2026-11-28T21:00:00+00:00") },
  { seeds: [4, 5] as [number, number], betterId: 4, worseId: 5, pBetter: 0.652, pWorse: 0.348, decided: false, leg1: leg(5, 4), leg2: leg(4, 5) },
];

describe("Tabela do play-off de acesso", () => {
  it("mostra os 4 clubes com campanha (pontos) e chance de subir arredondada (61%, 39%, 65%, 35%)", () => {
    render(<PlayoffTable series={series} teams={teams} />);
    const rows = screen.getAllByTestId("po-row");
    expect(rows.length).toBe(4);
    expect(screen.getAllByTestId("po-row-pct").map((e) => e.textContent)).toEqual(["61%", "39%", "65%", "35%"]);
    expect(rows[0].textContent).toContain("Vila Nova");
    expect(rows[0].textContent).toContain("66");
    expect(rows[1].textContent).toContain("Atletico Goianiense");
  });

  it("cada disputa mostra o confronto (3º × 6º) e as datas da ida e da volta", () => {
    render(<PlayoffTable series={series} teams={teams} />);
    const blocks = screen.getAllByTestId("po-block");
    expect(blocks[0].textContent).toContain("3º × 6º");
    expect(blocks[0].textContent).toContain("playoff.dates:21/11|28/11");
    expect(blocks[1].textContent).toContain("4º × 5º");
  });

  it("o clube do torcedor vem em primeiro e é o que tem destaque; o adversário leva o selo ALVO", () => {
    render(<PlayoffTable series={series} teams={teams} meTeamId={5} opponentId={4} />);
    const blocks = screen.getAllByTestId("po-block");
    expect(blocks[0].textContent).toContain("4º × 5º"); // disputa do Criciúma primeiro
    expect(within(blocks[0]).getAllByTestId("po-row")[1].textContent).toContain("Criciuma");
    expect(within(blocks[0]).getAllByTestId("po-row")[0].textContent).toContain("playoff.target"); // Fortaleza é o alvo
  });

  it("sem datas na API: 'datas a confirmar'", () => {
    const sem = series.map((s) => ({ ...s, leg1: { ...s.leg1, date: null }, leg2: { ...s.leg2, date: null } }));
    render(<PlayoffTable series={sem} teams={teams} />);
    expect(screen.getAllByTestId("po-block")[0].textContent).toContain("playoff.dates_tbc");
  });

  it("toque em um clube abre a página dele", () => {
    const open = vi.fn();
    render(<PlayoffTable series={series} teams={teams} onOpenTeam={open} />);
    fireEvent.click(screen.getAllByTestId("po-row")[1]);
    expect(open).toHaveBeenCalledWith(6);
  });

  it("probabilidades de ponta viram '>99%' e '<1%'", () => {
    const s = [{ ...series[0], pBetter: 0.998, pWorse: 0.002 }];
    render(<PlayoffTable series={s} teams={teams} />);
    expect(screen.getAllByTestId("po-row-pct").map((e) => e.textContent)).toEqual([">99%", "<1%"]);
  });
});

describe("regras de quais campeonatos têm play-off e qual partida é qual", () => {
  it("Série B (72) a partir de 2026; outros campeonatos não", () => {
    expect(leagueHasPlayoff(72, 2026)).toBe(true);
    expect(leagueHasPlayoff(72, 2025)).toBe(false);
    expect(leagueHasPlayoff(71, 2026)).toBe(false);
    expect(leagueHasPlayoff(null, 2026)).toBe(false);
  });

  it("ida = mandante é o pior colocado; volta = mandante é o melhor colocado (decisiva)", () => {
    expect(playoffLegOf(series, 6, 3)?.kind).toBe("leg1");
    expect(playoffLegOf(series, 3, 6)?.kind).toBe("leg2");
    expect(playoffLegOf(series, 5, 4)?.kind).toBe("leg1");
    expect(playoffLegOf(series, 3, 5)).toBeNull(); // times de disputas diferentes não são uma partida do play-off
    expect(playoffLegOf(null, 3, 6)).toBeNull();
  });
});
