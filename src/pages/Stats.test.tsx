// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const state: { rows: any[] } = { rows: [] };

const chain = (data: any = null): any => {
  // qualquer método encadeado (select, eq, not, in, order...) devolve o mesmo objeto; no fim, a consulta resolve vazia
  const base: any = {
    maybeSingle: () => Promise.resolve({ data, error: null }),
    then: (res: any, rej: any) => Promise.resolve({ data: [], error: null }).then(res, rej),
  };
  const self: any = new Proxy(base, { get: (t, k) => (k in t ? t[k] : () => self) });
  return self;
};
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => chain(),
    rpc: (name: string) => {
      if (name === "get_ranking_with_growth") return Promise.resolve({ data: state.rows, error: null });
      return Promise.resolve({ data: [], error: null });
    },
    functions: { invoke: () => Promise.resolve({ data: null, error: null }) },
    channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) }),
    removeChannel: () => {},
  },
}));
vi.mock("@/contexts/UserContext", () => ({ useUser: () => ({ user: { id: "u1" }, profile: {}, signOut: () => {} }) }));
vi.mock("@/contexts/ViewedClubContext", () => ({
  useViewedClub: () => ({ viewedClubName: "Vila Nova", setViewedClubName: () => {}, heartClubName: "Vila Nova", isViewingHeart: true }),
}));
vi.mock("@/hooks/useTranslationApp", () => ({ useTranslationApp: () => ({ t: (k: string, o?: any) => (o ? `${k}:${JSON.stringify(o)}` : k), language: "pt" }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: () => {} }) }));
vi.mock("@/components/ClubLogo", () => ({ ClubLogo: () => null }));
vi.mock("@/components/dashboard/ShareTropaModal", () => ({ default: () => null }));
vi.mock("@/components/dashboard/RivalsColumn", () => ({ default: () => null }));
vi.mock("@/components/stats/RaioXTorcida", () => ({ default: () => null }));
vi.mock("@/components/SocioEconomicGate", () => ({ default: ({ children }: any) => <>{children}</> }));
vi.mock("@/lib/search-clubs", () => ({ searchClubsWithFallback: () => Promise.resolve([]) }));

import Stats from "./Stats";

const row = (club: string, votes: number) => ({ club, votes, growth_24h: 0, growth_7d: 0 });
const renderIt = () =>
  render(
    <MemoryRouter>
      <Stats />
    </MemoryRouter>,
  );

describe("Ranking: porcentagem dos votos do Heart Club", () => {
  beforeEach(() => {
    state.rows = [row("Vila Nova", 10), row("Goias", 9), row("Atletico Goianiense", 9), row("Flamengo", 9), row("Outros", 30)];
  });

  it("cada clube mostra os votos e a fatia dos votos do recorte (67 votos: Vila Nova 10 = 15%)", async () => {
    renderIt();
    await waitFor(() => expect(screen.getAllByTestId("row-share").length).toBe(5));
    const first = screen.getAllByTestId("row-share")[0].textContent || "";
    expect(first).toContain('"pct":"15%"');
    expect(screen.getAllByTestId("row-share")[1].textContent).toContain('"pct":"13%"');
  });

  it("a nota explica que é a fatia dos votos do Heart Club, não da torcida do futebol", async () => {
    renderIt();
    const note = await screen.findByTestId("share-note");
    expect(note.textContent).toContain("ranking.share_hint");
  });

  it("a posição do clube do torcedor também mostra a fatia", async () => {
    renderIt();
    const mine = await screen.findByTestId("my-share");
    expect(mine.textContent).toContain('"pct":"15%"');
  });

  it("lista cheia (50 clubes ou mais): não mostra porcentagem, porque o total real não é conhecido", async () => {
    state.rows = Array.from({ length: 50 }, (_, i) => row(`Clube ${i}`, 5));
    renderIt();
    await waitFor(() => expect(screen.getAllByText(/Clube 0/).length).toBeGreaterThan(0));
    expect(screen.queryAllByTestId("row-share").length).toBe(0);
    expect(screen.queryByTestId("share-note")).toBeNull();
  });
});
