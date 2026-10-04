// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const submitVote = vi.fn(() => Promise.resolve());
const mockUser: { value: any } = { value: null };

vi.mock("@/lib/submit-vote", () => ({ submitVote: (...a: any[]) => submitVote(...(a as [])) }));
vi.mock("@/contexts/UserContext", () => ({
  useUser: () => ({
    user: mockUser.value,
    profile: null,
    isAuthReady: true,
    isLoading: false,
    isAuthenticated: !!mockUser.value,
    hasVoted: false,
    refreshProfile: vi.fn(),
    updateProfile: vi.fn(),
  }),
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/components/ClubLogo", () => ({ ClubLogo: () => null }));
vi.mock("@/hooks/useTranslationApp", () => ({
  useTranslationApp: () => ({
    t: (k: string, o?: any) => (o?.club ? `${k}:${o.club}` : k),
  }),
}));

import ConfirmarVoto from "./ConfirmarVoto";
import { savePendingVote } from "@/lib/entry-flow";

const club: any = { id: "1", name: "Vila Nova", logo: "", location: "Goiânia, Brazil", source: "local" };

function Where() {
  const l = useLocation();
  return <div data-testid="where">{l.pathname + l.search}</div>;
}

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/confirmar-voto" element={<ConfirmarVoto />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );

describe("ConfirmarVoto", () => {
  beforeEach(() => {
    localStorage.clear();
    submitVote.mockClear();
  });

  it("público: com o fluxo novo desligado, volta para a entrada antiga (/)", async () => {
    mockUser.value = { id: "u1", email: "fan@exemplo.com" };
    savePendingVote(club, []);
    renderAt("/confirmar-voto");
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/"));
    expect(submitVote).not.toHaveBeenCalled();
  });

  it("simulação do Master: exige o quadradinho dos Termos e NÃO grava voto", async () => {
    mockUser.value = { id: "m", email: "betoborelli9@gmail.com" };
    savePendingVote(club, []);
    renderAt("/confirmar-voto?sim=1");

    const button = await screen.findByText("entrar.yes_swear");
    // 4 espaços de simpatia visíveis (opcional) na tela de confirmação
    expect(screen.getByText("entrar.sympathy_intro")).toBeTruthy();
    expect(screen.getByPlaceholderText("entrar.sympathy_placeholder_n")).toBeTruthy();
    expect((button.closest("button") as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole("checkbox"));
    await waitFor(() => expect((button.closest("button") as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(button);

    await waitFor(() => expect(screen.getByText("entrar.sim_done_title")).toBeTruthy());
    expect(screen.getByText("entrar.reason_basics_title")).toBeTruthy();
    expect(submitVote).not.toHaveBeenCalled();
  });

  it("Master sem ?sim=1 nunca vota de verdade: é levado para a simulação", async () => {
    mockUser.value = { id: "m", email: "betoborelli9@gmail.com" };
    savePendingVote(club, []);
    renderAt("/confirmar-voto");
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/entrar?sim=1"));
    expect(submitVote).not.toHaveBeenCalled();
  });
});
