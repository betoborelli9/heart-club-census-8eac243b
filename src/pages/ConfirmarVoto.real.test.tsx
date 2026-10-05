// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

// Fluxo REAL (não é o teste do Master): o voto deve ser gravado assim que o torcedor chega logado.
const state = { hasVoted: false, user: { id: "fan-1", email: "fan@exemplo.com" } as any };
const submitVote = vi.fn(async () => {
  state.hasVoted = true; // depois de gravar, o app passa a saber que o torcedor votou
});
const rpc = vi.fn(() => Promise.resolve({ data: null, error: null }));

vi.mock("@/lib/entry-flow", async (orig) => ({ ...(await orig<typeof import("@/lib/entry-flow")>()), NEW_ENTRY_FLOW_ENABLED: true }));
vi.mock("@/lib/submit-vote", () => ({ submitVote: (...a: any[]) => (submitVote as any)(...a) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: (...a: any[]) => (rpc as any)(...a) } }));
vi.mock("@/contexts/UserContext", () => ({
  useUser: () => ({
    user: state.user,
    realUser: state.user,
    profile: null,
    isAuthReady: true,
    isLoading: false,
    isAuthenticated: true,
    hasVoted: state.hasVoted,
    refreshProfile: vi.fn(),
    updateProfile: vi.fn(),
  }),
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/components/ClubLogo", () => ({ ClubLogo: () => null }));
vi.mock("@/hooks/useTranslationApp", () => ({
  useTranslationApp: () => ({ t: (k: string, o?: any) => (o?.club ? `${k}:${o.club}` : k) }),
}));

import ConfirmarVoto from "./ConfirmarVoto";
import { loadPendingVote, savePendingVote } from "@/lib/entry-flow";

const club: any = { id: "1", name: "Paris Saint Germain", logo: "", location: "Paris, France", source: "api" };

function Where() {
  const l = useLocation();
  return <div data-testid="where">{l.pathname}</div>;
}

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/confirmar-voto"]}>
      <Routes>
        <Route path="/confirmar-voto" element={<ConfirmarVoto />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );

describe("ConfirmarVoto — voto gravado ao chegar logado", () => {
  beforeEach(() => {
    localStorage.clear();
    state.hasVoted = false;
    submitVote.mockClear();
    rpc.mockClear();
  });

  it("grava o voto UMA vez assim que a tela abre, antes de qualquer clique", async () => {
    savePendingVote(club, []);
    renderPage();
    await waitFor(() => expect(submitVote).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText("entrar.vote_recorded")).toBeTruthy());
    expect(loadPendingVote()).toBeNull(); // escolha guardada já foi usada
    expect(rpc).not.toHaveBeenCalled(); // o aceite dos Termos só vem no botão
  });

  it("depois de gravar, NÃO pula a tela: o torcedor ainda marca os Termos e toca em SIM, EU JURO!", async () => {
    savePendingVote(club, []);
    const { rerender } = renderPage();
    await waitFor(() => expect(screen.getByText("entrar.vote_recorded")).toBeTruthy());
    rerender(
      <MemoryRouter initialEntries={["/confirmar-voto"]}>
        <Routes>
          <Route path="/confirmar-voto" element={<ConfirmarVoto />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    );
    const button = screen.getByText("entrar.yes_swear").closest("button") as HTMLButtonElement;
    expect(button.disabled).toBe(true); // falta o quadradinho
    fireEvent.click(screen.getByRole("checkbox"));
    await waitFor(() => expect(button.disabled).toBe(false));
    await act(async () => {
      fireEvent.click(button);
    });
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("accept_terms", { p_version: "1.0" }));
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/dashboard"));
    expect(submitVote).toHaveBeenCalledTimes(1); // nunca grava duas vezes
  });

  it("quem já tinha votado antes vai direto ao Dashboard e não grava de novo", async () => {
    state.hasVoted = true;
    savePendingVote(club, []);
    renderPage();
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/dashboard"));
    expect(submitVote).not.toHaveBeenCalled();
  });

  it("se a gravação falhar, mostra tentar de novo e não deixa seguir sem voto", async () => {
    submitVote.mockImplementationOnce(async () => {
      throw new Error("rede caiu");
    });
    savePendingVote(club, []);
    renderPage();
    await waitFor(() => expect(screen.getAllByText("entrar.vote_error").length).toBeGreaterThan(0));
    const retry = screen.getByText("entrar.retry").closest("button") as HTMLButtonElement;
    expect(retry.disabled).toBe(false);
    await act(async () => {
      fireEvent.click(retry);
    });
    await waitFor(() => expect(submitVote).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByText("entrar.vote_recorded")).toBeTruthy());
  });
});
