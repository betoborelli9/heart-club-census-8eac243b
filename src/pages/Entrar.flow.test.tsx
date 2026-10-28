// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

// Quem já jurou lealdade (dentro do Instagram) e entrou no Chrome NÃO repete a escolha do time: vai direto para "Confirme seu voto".
const state = { authed: true, hasVoted: false, email: "fan@exemplo.com" };

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: vi.fn() }, auth: { signInWithOAuth: vi.fn() }, rpc: () => Promise.resolve({ data: 0, error: null }) },
}));
vi.mock("@/contexts/UserContext", () => ({
  useUser: () => ({
    user: state.authed ? { id: "u1", email: state.email } : null,
    realUser: state.authed ? { id: "u1", email: state.email } : null,
    isAuthReady: true,
    isLoading: false,
    isAuthenticated: state.authed,
    hasVoted: state.hasVoted,
  }),
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/hooks/useTranslationApp", () => ({ useTranslationApp: () => ({ t: (k: string) => k }) }));
vi.mock("@/components/ClubLogo", () => ({ ClubLogo: () => null }));
vi.mock("@/components/entrar/ClubSearchBox", () => ({
  ResultsList: () => null,
  useClubSearch: () => ({ query: "", setQuery: vi.fn(), results: [], loading: false, open: false, setOpen: vi.fn(), reset: vi.fn() }),
}));
vi.mock("@/lib/entry-flow", async (orig) => ({ ...(await orig<typeof import("@/lib/entry-flow")>()), NEW_ENTRY_FLOW_ENABLED: true }));

import Entrar from "./Entrar";
import { encodePendingVoteParam, loadPendingVote, savePendingVote } from "@/lib/entry-flow";

const club: any = { id: "1", name: "Vila Nova", logo: "", location: "Goiânia, Brazil", source: "local" };

function Where() {
  const l = useLocation();
  return <div data-testid="where">{l.pathname}</div>;
}
const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/entrar" element={<Entrar />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );

describe("Entrar — quem já jurou lealdade e fez login não repete a escolha", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.setItem("hc_intro_seen", "1");
    state.authed = true;
    state.hasVoted = false;
    state.email = "fan@exemplo.com";
  });

  it("logado + escolha guardada no aparelho → direto para /confirmar-voto", async () => {
    savePendingVote(club, []);
    renderAt("/entrar");
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/confirmar-voto"));
  });

  it("logado + escolha no link (?pv=) → direto para /confirmar-voto, com a escolha guardada", async () => {
    renderAt(`/entrar?pv=${encodePendingVoteParam(club, [])}`);
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/confirmar-voto"));
    expect(loadPendingVote()?.club.name).toBe("Vila Nova");
  });

  it("logado, sem nenhuma escolha: continua na tela de escolher o clube (nada de redirecionar)", async () => {
    renderAt("/entrar");
    expect(await screen.findByText("entrar.pick_title")).toBeTruthy();
    expect(screen.queryByTestId("where")).toBeNull();
  });

  it("quem já votou vai ao Dashboard, nunca à confirmação", async () => {
    state.hasVoted = true;
    savePendingVote(club, []);
    renderAt("/entrar");
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/dashboard"));
  });

  it("botão do Google no estilo da página /login: contorno fino, sem fundo branco, com o logo colorido", async () => {
    state.authed = false;
    renderAt(`/entrar?pv=${encodePendingVoteParam(club, [])}`);
    const btn = (await screen.findByText("entrar.google")).closest("button") as HTMLButtonElement;
    expect(btn.className).toContain("border-border/50");
    expect(btn.className).not.toContain("bg-white");
    expect(btn.querySelector("svg path[fill='#4285F4']")).toBeTruthy();
  });
});
