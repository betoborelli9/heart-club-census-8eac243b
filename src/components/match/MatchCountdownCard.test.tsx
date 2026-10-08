// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const db: { club: any; watch: any } = { club: null, watch: null };
const rpcSpy: { calls: any[] } = { calls: [] };

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (fn: string, args: any) => {
      rpcSpy.calls.push({ fn, args });
      return Promise.resolve({ data: null, error: null });
    },
    from: (table: string) => {
      const q: any = {
        select: () => q,
        eq: () => q,
        maybeSingle: () => Promise.resolve({ data: table === "clubes_cache" ? db.club : table === "fixture_watch" ? db.watch : null, error: null }),
      };
      return q;
    },
  },
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "pt" } }),
}));
vi.mock("@/hooks/useClubTheme", () => ({
  useClubTheme: () => ({ primaryHex: "#111111", secondaryHex: "#2a2a2a" }),
}));
vi.mock("@/components/ClubLogo", () => ({ ClubLogo: () => null }));
const who: { email: string; sim: boolean } = { email: "fan@x.com", sim: false };
vi.mock("@/contexts/UserContext", () => ({ useUser: () => ({ realUser: { email: who.email }, simActive: who.sim }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { MatchCountdownCard } from "./MatchCountdownCard";

const fixture: any = {
  id: 77,
  date: "2026-10-11T20:30:00Z",
  status: "NS",
  venue: "Estádio Onésio Brasileiro Alvarenga",
  league: { id: 1, name: "Serie B", logo: "", round: "R30" },
  home: { id: 10, name: "Vila Nova", logo: "" },
  away: { id: 20, name: "Nautico Recife", logo: "" },
};

describe("Card do próximo jogo", () => {
  beforeEach(() => {
    db.club = { cor_primaria: "#E30613", cor_secundaria: "#000000", estadio_nome: "OBA" };
    db.watch = { canais: ["Premiere", "Globoplay"], fonte: "ia" };
    who.email = "fan@x.com";
    who.sim = false;
    rpcSpy.calls = [];
  });

  it("usa as cores do clube do torcedor, mostra o estádio e onde assistir", async () => {
    render(<MatchCountdownCard fixture={fixture} diffMs={90_000_000} teamId={10} />);
    expect(await screen.findByText("Premiere")).toBeTruthy();
    expect(screen.getByText("Globoplay")).toBeTruthy();
    expect(screen.getByTestId("match-stadium").textContent).toContain("Estádio Onésio Brasileiro Alvarenga");
    const card = screen.getByTestId("match-card") as HTMLElement;
    expect(card.style.border.toLowerCase()).toContain("#000000"); // borda = cor secundária do clube
    expect(card.style.color).toBe("rgb(255, 255, 255)"); // vermelho escuro → texto branco
  });

  it("sem canais confirmados: mostra 'a confirmar' (não inventa)", async () => {
    db.watch = { canais: [] };
    render(<MatchCountdownCard fixture={fixture} diffMs={1000} teamId={10} />);
    expect(await screen.findByText("match.tbc")).toBeTruthy();
  });

  it("sem nome do estádio no jogo: usa o do cadastro do clube quando joga em casa", async () => {
    render(<MatchCountdownCard fixture={{ ...fixture, venue: undefined }} diffMs={1000} teamId={10} />);
    expect((await screen.findByTestId("match-stadium")).textContent).toContain("OBA");
  });

  it("cor clara (clube de camisa branca): texto escuro para ler bem", async () => {
    db.club = { cor_primaria: "#FFFFFF", cor_secundaria: "#FF0000", estadio_nome: null };
    render(<MatchCountdownCard fixture={fixture} diffMs={1000} teamId={10} />);
    await screen.findByText("Premiere");
    expect((screen.getByTestId("match-card") as HTMLElement).style.color).toBe("rgb(17, 17, 17)");
  });

  it("torcedor comum NÃO vê o botão de remover; o Master vê e remove (some a linha)", async () => {
    const { fireEvent, waitFor } = await import("@testing-library/react");
    const { unmount } = render(<MatchCountdownCard fixture={fixture} diffMs={1000} teamId={10} />);
    await screen.findByText("Premiere");
    expect(screen.queryByLabelText("Remover onde assistir")).toBeNull();
    unmount();

    who.email = "betoborelli9@gmail.com";
    render(<MatchCountdownCard fixture={fixture} diffMs={1000} teamId={10} />);
    await screen.findByText("Premiere");
    fireEvent.click(screen.getByLabelText("Remover onde assistir"));
    await waitFor(() => expect(rpcSpy.calls[0]).toEqual({ fn: "admin_set_fixture_watch", args: { p_fixture: 77, p_canais: [] } }));
    await waitFor(() => expect(screen.queryByTestId("match-watch")).toBeNull());
  });

  it("Master em simulação de torcedor novo também não vê o botão", async () => {
    who.email = "betoborelli9@gmail.com";
    who.sim = true;
    render(<MatchCountdownCard fixture={fixture} diffMs={1000} teamId={10} />);
    await screen.findByText("Premiere");
    expect(screen.queryByLabelText("Remover onde assistir")).toBeNull();
  });

  it("jogo cujo 'onde assistir' o Beto removeu: a linha não aparece para ninguém", async () => {
    db.watch = { canais: [], fonte: "admin" };
    render(<MatchCountdownCard fixture={fixture} diffMs={1000} teamId={10} />);
    await screen.findByTestId("match-stadium");
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.queryByTestId("match-watch")).toBeNull();
  });
});
