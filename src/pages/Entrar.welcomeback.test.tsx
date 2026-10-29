// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

// Quem já votou neste aparelho e volta SEM login vê "Bem-vindo de volta!" (entrar), nunca a busca de clube como se fosse novo.
const invoke = vi.fn(() => Promise.resolve({ data: { success: true }, error: null }));
const signInWithOAuth = vi.fn(() => Promise.resolve({ error: null }));
const submitVote = vi.fn();
const insert = vi.fn();
const state = { authed: false, hasVoted: false, email: "fan@exemplo.com" };

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: (...a: any[]) => (invoke as any)(...a) },
    auth: { signInWithOAuth: (...a: any[]) => (signInWithOAuth as any)(...a) },
    rpc: () => Promise.resolve({ data: 0, error: null }),
    from: () => ({ insert }),
  },
}));
vi.mock("@/lib/submit-vote", () => ({ submitVote: (...a: any[]) => (submitVote as any)(...a) }));
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
const club: any = { id: "1", name: "Vila Nova", logo: "", location: "Goiânia, Brazil", source: "local" };
vi.mock("@/components/entrar/ClubSearchBox", () => ({
  ResultsList: ({ onPick }: any) => <button onClick={() => onPick(club)}>escolher-vila-nova</button>,
  useClubSearch: () => ({ query: "", setQuery: vi.fn(), results: [], loading: false, open: true, setOpen: vi.fn(), reset: vi.fn() }),
}));
vi.mock("@/lib/entry-flow", async (orig) => ({ ...(await orig<typeof import("@/lib/entry-flow")>()), NEW_ENTRY_FLOW_ENABLED: true }));

import Entrar from "./Entrar";
import { encodePendingVoteParam, loadPendingVote, markDeviceVoted } from "@/lib/entry-flow";

function Where() {
  const l = useLocation();
  return <div data-testid="where">{l.pathname + l.search}</div>;
}
const renderAt = (url = "/entrar") =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/entrar" element={<Entrar />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );

const CHROME = "Mozilla/5.0 (Linux; Android 13; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
const ANDROID_INSTAGRAM =
  "Mozilla/5.0 (Linux; Android 13; SM-A546E; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 Instagram 310.0.0.37.108 Android";
const IPHONE_INSTAGRAM =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21C62 Instagram 312.0.0.22.114 (iPhone14,5; iOS 17_2)";
let uaSpy: ReturnType<typeof vi.spyOn>;
const withUa = (ua: string) => {
  uaSpy?.mockRestore();
  uaSpy = vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(ua);
};

describe("Entrar — 'Bem-vindo de volta!' para aparelho que já teve um voto", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    sessionStorage.setItem("hc_intro_seen", "1");
    invoke.mockClear();
    signInWithOAuth.mockClear();
    submitVote.mockClear();
    insert.mockClear();
    state.authed = false;
    state.hasVoted = false;
    state.email = "fan@exemplo.com";
    withUa(CHROME);
  });
  afterEach(() => uaSpy.mockRestore());

  it("com o sinal no aparelho e sem login: mostra as opções de entrar no lugar da busca", async () => {
    markDeviceVoted();
    renderAt();
    expect(await screen.findByTestId("entrar-welcome-back")).toBeTruthy();
    expect(screen.getByText("entrar.back_title")).toBeTruthy();
    expect(screen.getByText("entrar.google")).toBeTruthy();
    expect(screen.getByText("entrar.send_link")).toBeTruthy();
    expect(screen.getByText("entrar.back_not_me")).toBeTruthy();
    expect(screen.queryByText("entrar.pick_title")).toBeNull(); // nada de busca de clube
    expect(screen.queryByText("escolher-vila-nova")).toBeNull();
  });

  it("sem o sinal (aparelho novo): continua a busca normal", async () => {
    renderAt();
    expect(await screen.findByText("entrar.pick_title")).toBeTruthy();
    expect(screen.queryByTestId("entrar-welcome-back")).toBeNull();
  });

  it("Google: só entra na conta — não guarda escolha de clube nem grava voto", async () => {
    markDeviceVoted();
    renderAt();
    fireEvent.click(await screen.findByText("entrar.google"));
    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledTimes(1));
    expect((signInWithOAuth.mock.calls[0] as any[])[0].provider).toBe("google");
    expect(loadPendingVote()).toBeNull();
    expect(submitVote).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("e-mail: pede o link sem nenhuma escolha de clube dentro", async () => {
    markDeviceVoted();
    renderAt();
    fireEvent.change(await screen.findByPlaceholderText("entrar.email_placeholder"), { target: { value: "fan@exemplo.com" } });
    fireEvent.click(screen.getByText("entrar.send_link"));
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    const [fn, opts] = invoke.mock.calls[0] as any[];
    expect(fn).toBe("heart-club-auth");
    expect(opts.body.email).toBe("fan@exemplo.com");
    expect(opts.body.pendingVote).toBeUndefined();
    expect(loadPendingVote()).toBeNull();
    expect(submitVote).not.toHaveBeenCalled();
  });

  it("'Não sou eu / votar com outra conta' mostra a busca normal e o fluxo de voto segue funcionando", async () => {
    markDeviceVoted();
    renderAt();
    fireEvent.click(await screen.findByText("entrar.back_not_me"));
    expect(await screen.findByText("entrar.pick_title")).toBeTruthy();
    expect(screen.queryByTestId("entrar-welcome-back")).toBeNull();
    fireEvent.click(screen.getByText("escolher-vila-nova"));
    expect(await screen.findByTestId("entrar-chosen-club")).toBeTruthy();
    expect(screen.getByTestId("entrar-terms-notice")).toBeTruthy(); // o aviso dos Termos volta no caminho de voto novo
  });

  it("logado mas SEM voto (conta diferente): vê a busca, não o 'bem-vindo de volta'", async () => {
    markDeviceVoted();
    state.authed = true;
    renderAt();
    expect(await screen.findByText("entrar.pick_title")).toBeTruthy();
    expect(screen.queryByTestId("entrar-welcome-back")).toBeNull();
  });

  it("logado e já votou: vai direto para o painel", async () => {
    markDeviceVoted();
    state.authed = true;
    state.hasVoted = true;
    renderAt();
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/dashboard"));
  });

  it("chegou com a escolha de time no link (?pv=): segue o fluxo do voto, sem 'bem-vindo de volta'", async () => {
    markDeviceVoted();
    renderAt(`/entrar?pv=${encodePendingVoteParam(club, [])}`);
    expect(await screen.findByTestId("entrar-chosen-club")).toBeTruthy();
    expect(screen.queryByTestId("entrar-welcome-back")).toBeNull();
  });

  it("teste do Master (?sim=1) nunca vê o 'bem-vindo de volta'", async () => {
    markDeviceVoted();
    state.authed = true;
    state.email = "betoborelli9@gmail.com";
    renderAt("/entrar?sim=1");
    expect(await screen.findByText("entrar.pick_title")).toBeTruthy();
    expect(screen.queryByTestId("entrar-welcome-back")).toBeNull();
  });

  it("Instagram Android: o mesmo botão 'Continuar com Google'; ao tocar, abre a página no Chrome com o Google automático", async () => {
    markDeviceVoted();
    withUa(ANDROID_INSTAGRAM);
    const hrefSet = vi.fn();
    const original = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        get href() {
          return "https://www.votenoseutime.com.br/entrar";
        },
        set href(v: string) {
          hrefSet(v);
        },
        origin: "https://www.votenoseutime.com.br",
      },
    });
    try {
      renderAt();
      expect(await screen.findByTestId("entrar-welcome-back")).toBeTruthy();
      expect(screen.queryByText("entrar.inapp_open_chrome")).toBeNull();
      expect(screen.getByText("entrar.send_link")).toBeTruthy();
      expect(screen.getByText("entrar.back_not_me")).toBeTruthy();
      fireEvent.click(screen.getByText("entrar.google"));
      expect(hrefSet).toHaveBeenCalledTimes(1);
      const target = hrefSet.mock.calls[0][0] as string;
      expect(target.startsWith("intent://www.votenoseutime.com.br/entrar?")).toBe(true);
      expect(target).toContain("go=google");
      expect(target).not.toContain("pv="); // aqui não há clube escolhido: só entra na conta
      expect(signInWithOAuth).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(window, "location", { configurable: true, value: original });
    }
  });

  it("Instagram iPhone: o mesmo botão; ao tocar, o aviso curto de abrir no navegador", async () => {
    markDeviceVoted();
    withUa(IPHONE_INSTAGRAM);
    renderAt();
    expect(await screen.findByTestId("entrar-welcome-back")).toBeTruthy();
    expect(screen.queryByTestId("inapp-ios")).toBeNull();
    fireEvent.click(screen.getByText("entrar.google"));
    expect(await screen.findByTestId("inapp-ios")).toBeTruthy();
    expect(screen.getByText("entrar.send_link")).toBeTruthy();
    expect(signInWithOAuth).not.toHaveBeenCalled();
  });

  it("Chrome vindo do Instagram (?go=google, sem clube): o Google começa sozinho e nenhum voto é gravado", async () => {
    markDeviceVoted();
    renderAt("/entrar?go=google");
    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledTimes(1));
    expect(loadPendingVote()).toBeNull();
    expect(submitVote).not.toHaveBeenCalled();
  });
});
