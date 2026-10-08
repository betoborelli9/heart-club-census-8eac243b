// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";

const db: { rows: any[]; queries: any[]; handler: ((p: any) => void) | null } = { rows: [], queries: [], handler: null };

vi.mock("@/integrations/supabase/client", () => {
  const q: any = {
    select: () => q,
    eq: (c: string, v: any) => (db.queries.push([c, v]), q),
    gte: () => q,
    lte: () => q,
    order: () => Promise.resolve({ data: db.rows, error: null }),
  };
  return {
    supabase: {
      from: () => q,
      channel: () => {
        const ch: any = { on: (_e: string, _f: any, h: any) => ((db.handler = h), ch), subscribe: () => ch };
        return ch;
      },
      removeChannel: vi.fn(),
    },
  };
});
vi.mock("@/hooks/useTranslationApp", () => ({ useTranslationApp: () => ({ t: (k: string) => k }) }));
vi.mock("@/components/ClubLogo", () => ({ ClubLogo: () => null }));

import LeagueLiveStrip, { liveMinute } from "./LeagueLiveStrip";

const iso = (minAgo: number) => new Date(Date.now() - minAgo * 60_000).toISOString();
const row = (over: any) => ({
  fixture_id: 1, league_id: 72, kickoff: iso(60), status: "FT", elapsed: 90,
  home_id: 1, home_name: "Casa FC", home_logo: "", away_id: 2, away_name: "Fora FC", away_logo: "",
  goals_home: 1, goals_away: 0, updated_at: iso(1), ...over,
});

describe("Jogos do dia do campeonato (strip)", () => {
  beforeEach(() => {
    db.rows = [];
    db.queries = [];
    db.handler = null;
  });

  it("mostra ao vivo (vermelho, com minutos) e encerrado (preto, sem minutos); consulta só o nosso banco do campeonato certo", async () => {
    db.rows = [
      row({ fixture_id: 1, status: "2H", elapsed: 63, kickoff: iso(70), goals_home: 2, goals_away: 1, updated_at: new Date().toISOString() }),
      row({ fixture_id: 2, status: "FT", home_name: "Terminou A", away_name: "Terminou B", goals_home: 3, goals_away: 3, kickoff: iso(150) }),
    ];
    render(<LeagueLiveStrip leagueId={72} teamId={null} />);
    expect(await screen.findByText("Terminou A")).toBeTruthy();
    expect(screen.getByTestId("live-minute").textContent).toBe("63'");
    expect(screen.getByTestId("final-score").textContent).toBe("3 - 3");
    expect(document.body.textContent).not.toContain("90'"); // encerrado não mostra minutos
    expect(db.queries).toContainEqual(["league_id", 72]);
  });

  it("cada jogo tem o seu relógio e o intervalo aparece como 'Intervalo'", async () => {
    db.rows = [
      row({ fixture_id: 1, status: "1H", elapsed: 12, kickoff: iso(14), updated_at: new Date().toISOString() }),
      row({ fixture_id: 2, status: "2H", elapsed: 77, kickoff: iso(100), updated_at: new Date().toISOString(), home_name: "Outro", away_name: "Jogo" }),
      row({ fixture_id: 3, status: "HT", elapsed: 45, kickoff: iso(50), updated_at: new Date().toISOString(), home_name: "Meio", away_name: "Tempo" }),
    ];
    render(<LeagueLiveStrip leagueId={72} />);
    await screen.findByText("Outro");
    const mins = screen.getAllByTestId("live-minute").map((e) => e.textContent);
    expect(mins).toEqual(expect.arrayContaining(["12'", "77'", "competitions.halftime"]));
  });

  it("o clube do torcedor (ou pesquisado) aparece em destaque e primeiro, mesmo sendo de outro clube a lista", async () => {
    db.rows = [
      row({ fixture_id: 1, home_id: 10, away_id: 11, home_name: "Atlético", away_name: "Rival X", status: "FT" }),
      row({ fixture_id: 2, home_id: 20, away_id: 21, home_name: "Goiás", away_name: "Rival Y", status: "FT" }),
    ];
    render(<LeagueLiveStrip leagueId={72} teamId={20} />);
    await screen.findByText("Goiás");
    const mine = screen.getAllByTestId("live-row-mine");
    expect(mine.length).toBe(1);
    expect(mine[0].textContent).toContain("Goiás");
    const all = document.querySelectorAll("li");
    expect(all[0].textContent).toContain("Goiás"); // destaque vem primeiro
    expect(all.length).toBe(2); // os concorrentes continuam na lista
  });

  it("chega gol por tempo real e atualiza o placar sem recarregar", async () => {
    db.rows = [row({ fixture_id: 1, status: "1H", elapsed: 30, kickoff: iso(32), goals_home: 0, goals_away: 0, updated_at: new Date().toISOString() })];
    render(<LeagueLiveStrip leagueId={72} />);
    await screen.findByText("Casa FC");
    expect(document.body.textContent).toContain("0 - 0");
    act(() => db.handler!({ new: { ...db.rows[0], goals_home: 1, updated_at: new Date().toISOString() } }));
    await waitFor(() => expect(document.body.textContent).toContain("1 - 0"));
  });

  it("sem jogos do campeonato hoje: não mostra nada", async () => {
    render(<LeagueLiveStrip leagueId={72} />);
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.queryByTestId("league-live-strip")).toBeNull();
  });

  it("minutos: soma o tempo desde a última gravação, no máximo +3", () => {
    const f: any = row({ elapsed: 50, updated_at: new Date(Date.now() - 2 * 60_000).toISOString() });
    expect(liveMinute(f, Date.now())).toBe(52);
    const old: any = row({ elapsed: 50, updated_at: new Date(Date.now() - 20 * 60_000).toISOString() });
    expect(liveMinute(old, Date.now())).toBe(53);
  });
});
