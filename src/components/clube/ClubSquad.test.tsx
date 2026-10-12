// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

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
  useTranslationApp: () => ({ t: (k: string, o?: any) => (o?.n !== undefined ? `${k}:${o.n}` : k), language: "pt" }),
}));

import ClubSquad, { groupKey } from "./ClubSquad";

const p = (id: number, name: string, pos: string | null, number: number | null, age: number | null, isNew = false) => ({ id, name, pos, number, age, photo: null, isNew });

const payload = () => ({
  teamId: 142,
  updatedAt: new Date().toISOString(),
  coach: { name: "Rafael Lacerda", photo: null, age: 40, nationality: "Brazil" },
  players: [
    p(1, "Goleiro Um", "Goalkeeper", 1, 30),
    p(2, "Zagueiro Dois", "Defender", 4, 27),
    p(3, "Meia Três", "Midfielder", 8, 24, true),
    p(4, "Atacante Quatro", "Attacker", 9, 22),
    p(5, "Sem Posição", null, null, null),
    p(6, "Lateral Cinco", "Defender", 2, 25),
  ],
  moves: [
    { dir: "in", player: "Meia Três", playerId: 3, date: "2026-09-01T00:00:00Z", type: "loan", club: { id: 9, name: "Guarani", logo: null } },
    { dir: "out", player: "Caique", playerId: 99, date: "2026-08-31T00:00:00Z", type: "signing", club: { id: 8, name: "Bashundhara", logo: null } },
  ],
});

describe("Elenco do clube", () => {
  beforeEach(() => {
    state.payload = payload();
    state.invokes = [];
  });

  it("pede o elenco do time certo e mostra técnico, grupos por posição, camisa e idade", async () => {
    render(<ClubSquad teamId={142} />);
    await screen.findByTestId("squad");
    expect(state.invokes[0]).toEqual({ name: "club-squad", body: { teamId: 142 } });
    expect(screen.getByTestId("squad-coach").textContent).toContain("Rafael Lacerda");
    const defenders = screen.getByTestId("squad-group-Defender");
    const names = within(defenders).getAllByRole("listitem").map((li) => li.textContent);
    expect(names.length).toBe(2);
    expect(names[0]).toContain("Lateral Cinco"); // ordenado pela camisa: 2 antes do 4
    expect(names[1]).toContain("Zagueiro Dois");
    expect(screen.getByTestId("squad-group-Goalkeeper")).toBeTruthy();
    expect(screen.getByTestId("squad-group-Other").textContent).toContain("Sem Posição"); // posição desconhecida não some
  });

  it("selo NOVO só em quem chegou há pouco; chegadas e saídas aparecem sem valores em dinheiro", async () => {
    render(<ClubSquad teamId={142} />);
    await screen.findByTestId("squad");
    const badges = screen.getAllByTestId("squad-new");
    expect(badges.length).toBe(1);
    expect(badges[0].closest("li")!.textContent).toContain("Meia Três");
    const moves = screen.getByTestId("squad-moves").textContent || "";
    expect(moves).toContain("Caique");
    expect(moves).toContain("squad.kind_loan");
    expect(moves).not.toMatch(/€|\$|R\$|milh|million/i);
  });

  it("erro do servidor: mensagem amigável", async () => {
    state.payload = { error: "time não encontrado" };
    render(<ClubSquad teamId={1} />);
    expect(await screen.findByText("squad.error")).toBeTruthy();
  });

  it("agrupa posições conhecidas e joga o resto em 'Other'", () => {
    expect(groupKey("Goalkeeper")).toBe("Goalkeeper");
    expect(groupKey("Attacker")).toBe("Attacker");
    expect(groupKey(null)).toBe("Other");
    expect(groupKey("Coach")).toBe("Other");
  });
});
