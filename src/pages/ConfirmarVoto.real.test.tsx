// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

// Fluxo REAL (não é o teste do Master): o voto deve ser gravado assim que o torcedor chega logado.
const state = { hasVoted: false, user: { id: "fan-1", email: "fan@exemplo.com" } as any, profile: null as any };
const refreshProfile = vi.fn(() => Promise.resolve());
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
    profile: state.profile,
    isAuthReady: true,
    isLoading: false,
    isAuthenticated: true,
    hasVoted: state.hasVoted,
    refreshProfile,
    updateProfile: vi.fn(),
  }),
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/components/ClubLogo", () => ({ ClubLogo: () => null }));
vi.mock("@/hooks/useTranslationApp", () => ({
  useTranslationApp: () => ({ t: (k: string, o?: any) => (o?.club ? `${k}:${o.club}` : k) }),
}));

import ConfirmarVoto from "./ConfirmarVoto";
import { encodePendingVoteParam, loadPendingVote, savePendingVote } from "@/lib/entry-flow";

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
    state.profile = null;
    submitVote.mockClear();
    rpc.mockClear();
    refreshProfile.mockClear();
  });

  it("grava o voto UMA vez assim que a tela abre, antes de qualquer clique", async () => {
    savePendingVote(club, []);
    renderPage();
    await waitFor(() => expect(submitVote).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(loadPendingVote()).toBeNull()); // escolha guardada já foi usada
    // nada de aviso verde: o torcedor só vê a tela normal
    expect(screen.queryByText("entrar.vote_recorded")).toBeNull();
    expect(screen.queryByText("entrar.vote_recording")).toBeNull();
    expect(rpc).not.toHaveBeenCalled(); // o aceite dos Termos só vem no botão
  });

  it("depois de gravar, NÃO pula a tela: o torcedor ainda marca os Termos e toca em SIM, EU JURO!", async () => {
    savePendingVote(club, []);
    state.profile = { id: "fan-1", terms_accepted_at: null };
    const { rerender } = renderPage();
    await waitFor(() => expect(submitVote).toHaveBeenCalledTimes(1));
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
    await waitFor(() => expect((screen.getByText("entrar.yes_swear").closest("button") as HTMLButtonElement).disabled).toBe(false));
    await act(async () => {
      fireEvent.click(button);
    });
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("accept_terms", { p_version: "1.0" }));
    expect(refreshProfile).toHaveBeenCalled(); // o app passa a saber que os Termos foram aceitos
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
    await waitFor(() => expect(screen.getByText("entrar.yes_swear")).toBeTruthy()); // voltou ao botão normal
    expect(screen.queryByText("entrar.vote_error")).toBeNull();
  });

  it("quem já votou mas NÃO aceitou os Termos só entra depois de aceitar (volta e vê só o aceite)", async () => {
    state.hasVoted = true;
    state.profile = { id: "fan-1", terms_accepted_at: null };
    renderPage(); // sem escolha pendente: é alguém voltando
    expect(await screen.findByText("entrar.terms_only_title")).toBeTruthy();
    const button = screen.getByText("entrar.enter_cta").closest("button") as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(screen.getByRole("checkbox"));
    await waitFor(() => expect((screen.getByText("entrar.enter_cta").closest("button") as HTMLButtonElement).disabled).toBe(false));
    await act(async () => {
      fireEvent.click(screen.getByText("entrar.enter_cta"));
    });
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("accept_terms", { p_version: "1.0" }));
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/dashboard"));
    expect(submitVote).not.toHaveBeenCalled(); // nunca grava voto de novo
  });

  it("já votou, ainda não aceitou os Termos e sobrou escolha guardada: descarta a escolha e libera 'só aceitar e entrar'", async () => {
    state.hasVoted = true;
    state.profile = { id: "fan-1", terms_accepted_at: null };
    savePendingVote(club, []); // sobra de um voto antigo: nunca seria gravado de novo
    renderPage();
    expect(await screen.findByText("entrar.terms_only_title")).toBeTruthy();
    expect(loadPendingVote()).toBeNull(); // escolha velha limpa
    expect(submitVote).not.toHaveBeenCalled();
    const button = screen.getByText("entrar.enter_cta").closest("button") as HTMLButtonElement; // NÃO é o "SIM, EU JURO!" travado
    expect(button.disabled).toBe(true); // falta só o quadradinho
    fireEvent.click(screen.getByRole("checkbox"));
    await waitFor(() => expect((screen.getByText("entrar.enter_cta").closest("button") as HTMLButtonElement).disabled).toBe(false));
    await act(async () => {
      fireEvent.click(screen.getByText("entrar.enter_cta"));
    });
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("accept_terms", { p_version: "1.0" }));
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/dashboard"));
    expect(submitVote).not.toHaveBeenCalled();
  });

  it("link do e-mail aberto em outro navegador (aparelho sem escolha): refaz o voto pela URL e grava o time certo", async () => {
    const pv = encodePendingVoteParam(club, [{ ...club, id: "2", name: "Goiás", api_id: 2 }])!;
    expect(loadPendingVote()).toBeNull();
    render(
      <MemoryRouter initialEntries={[`/confirmar-voto?pv=${pv}`]}>
        <Routes>
          <Route path="/confirmar-voto" element={<ConfirmarVoto />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(submitVote).toHaveBeenCalledTimes(1));
    const args = (submitVote.mock.calls[0] as any[])[0];
    expect(args.heartClub.name).toBe("Paris Saint Germain");
    expect(args.sympathyClubs.map((s: any) => s.name)).toEqual(["Goiás"]);
    expect(screen.getByText("entrar.confirm_title")).toBeTruthy(); // fica na tela "Confirme seu voto"
  });

  it("'Voltar' (trocar de clube) limpa a escolha guardada, senão a tela de entrada mandaria o torcedor de volta para cá", async () => {
    submitVote.mockImplementationOnce(async () => {
      throw new Error("rede caiu");
    });
    savePendingVote(club, []);
    renderPage();
    await waitFor(() => expect(screen.getAllByText("entrar.vote_error").length).toBeGreaterThan(0));
    await act(async () => {
      fireEvent.click(screen.getByText("entrar.back"));
    });
    expect(loadPendingVote()).toBeNull();
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/entrar"));
  });

  it("quem já aceitou os Termos entra direto no Dashboard", async () => {
    state.hasVoted = true;
    state.profile = { id: "fan-1", terms_accepted_at: "2026-10-01T10:00:00Z" };
    renderPage();
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/dashboard"));
  });
});
