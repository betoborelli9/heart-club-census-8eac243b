// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

// Quem já votou e volta sem sessão: botão "Já votei — Entrar" e "Bem-vindo de volta, torcedor do <Clube>!".
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
vi.mock("@/hooks/useTranslationApp", () => ({
  useTranslationApp: () => ({ t: (k: string, o?: any) => (o?.club ? `${k}:${o.club}` : o?.email ? `${k}:${o.email}` : k) }),
}));
vi.mock("@/components/ClubLogo", () => ({ ClubLogo: () => null }));
vi.mock("@/components/entrar/ClubSearchBox", () => ({
  ResultsList: () => null,
  useClubSearch: () => ({ query: "", setQuery: vi.fn(), results: [], loading: false, open: false, setOpen: vi.fn(), reset: vi.fn() }),
}));
vi.mock("@/lib/entry-flow", async (orig) => ({ ...(await orig<typeof import("@/lib/entry-flow")>()), NEW_ENTRY_FLOW_ENABLED: true }));

import Entrar from "./Entrar";
import { clearVotedDevice, loadPendingVote, markDeviceVoted, readVotedDevice } from "@/lib/entry-flow";

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
let uaSpy: ReturnType<typeof vi.spyOn>;
const withUa = (ua: string) => {
  uaSpy?.mockRestore();
  uaSpy = vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(ua);
};

describe("Entrar — 'Já votei — Entrar' e 'Bem-vindo de volta, torcedor do <Clube>!'", () => {
  beforeEach(() => {
    localStorage.clear();
    clearVotedDevice();
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

  it("(a) nunca votou: busca de clube normal + botão 'Já votei — Entrar' logo abaixo dela (o link pequeno antigo some)", async () => {
    renderAt();
    expect(await screen.findByText("entrar.pick_title")).toBeTruthy();
    const input = screen.getByPlaceholderText("entrar.search_placeholder");
    const button = screen.getByTestId("entrar-already-voted") as HTMLButtonElement;
    expect(button.textContent).toBe("entrar.already_voted_btn");
    // fica DEPOIS da caixa de busca
    expect(input.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // sóbrio e do tamanho da caixa de busca: mesma altura e arredondamento, borda fina branca, sem degradê/sombra/brilho
    expect(button.className).toContain("h-14");
    expect(button.className).toContain("w-full");
    expect(button.className).toContain("rounded-2xl");
    expect(button.className).toContain("border-white/20");
    expect(button.className).toContain("hover:border-white/40");
    expect(button.className).not.toMatch(/gradient|shadow|glow|animate/);
    expect(screen.queryByText("entrar.already_voted")).toBeNull(); // o link pequeno antigo saiu
    expect(screen.queryByTestId("entrar-welcome-back")).toBeNull();
  });

  it("(b) votou neste aparelho, sem sessão: 'Bem-vindo de volta, torcedor do <Clube>!' com escudo, e-mail mascarado e Google — sem busca", async () => {
    markDeviceVoted({ clubName: "Vila Nova", logo: "https://x.test/vila.png", email: "b***9@gmail.com" });
    renderAt();
    expect(await screen.findByTestId("entrar-welcome-back")).toBeTruthy();
    expect(screen.getByText("entrar.back_title_club:Vila Nova")).toBeTruthy();
    expect(screen.getByTestId("entrar-welcome-crest")).toBeTruthy();
    expect(screen.getByTestId("entrar-masked-email").textContent).toBe("entrar.back_account:b***9@gmail.com");
    expect(screen.getByText("entrar.google")).toBeTruthy();
    expect(screen.getByText("entrar.send_link")).toBeTruthy();
    expect(screen.queryByText("entrar.pick_title")).toBeNull();
    expect(screen.queryByPlaceholderText("entrar.search_placeholder")).toBeNull();
    expect(screen.queryByTestId("entrar-already-voted")).toBeNull();
    // só o botão normal do Google: nada de laranja nem aviso extra
    expect(screen.queryByTestId("inapp-ios")).toBeNull();
    expect(screen.queryByText("entrar.inapp_open_chrome")).toBeNull();
  });

  it("(b) 'Não é você? Votar com outra conta' apaga a marca (localStorage e cookie) e mostra a busca normal", async () => {
    markDeviceVoted({ clubName: "Vila Nova", email: "b***9@gmail.com" });
    expect(document.cookie).toContain("hc_voted=");
    renderAt();
    fireEvent.click(await screen.findByText("entrar.back_not_you"));
    expect(await screen.findByText("entrar.pick_title")).toBeTruthy();
    expect(screen.getByTestId("entrar-already-voted")).toBeTruthy();
    expect(readVotedDevice()).toBeNull();
    expect(localStorage.getItem("hc_device_voted")).toBeNull();
    expect(document.cookie).not.toContain("hc_voted=");
  });

  it("(b) aparelho que perdeu o localStorage mas ainda tem o cookie de 1 ano: ainda mostra 'Bem-vindo de volta'", async () => {
    markDeviceVoted({ clubName: "Vila Nova", email: "b***9@gmail.com" });
    localStorage.removeItem("hc_device_voted"); // o navegador limpou só o localStorage
    renderAt();
    expect(await screen.findByText("entrar.back_title_club:Vila Nova")).toBeTruthy();
  });

  it("(c) votou em OUTRO aparelho: 'Já votei — Entrar' → Google e e-mail direto, sem pedir clube → Google não grava voto nenhum", async () => {
    renderAt();
    fireEvent.click(await screen.findByTestId("entrar-already-voted"));
    expect(await screen.findByTestId("entrar-signin")).toBeTruthy();
    expect(screen.queryByPlaceholderText("entrar.search_placeholder")).toBeNull(); // sem busca de clube
    expect(screen.queryByTestId("entrar-chosen-club")).toBeNull();
    expect(screen.getByText("entrar.google")).toBeTruthy();
    expect(screen.getByText("entrar.send_link")).toBeTruthy();
    fireEvent.click(screen.getByText("entrar.google"));
    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledTimes(1));
    const call = (signInWithOAuth.mock.calls[0] as any[])[0];
    expect(call.provider).toBe("google");
    expect(call.options.redirectTo.endsWith("/")).toBe(true); // volta para "/", que leva ao painel de quem já votou
    expect(loadPendingVote()).toBeNull();
    expect(submitVote).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("(c) por e-mail: o pedido do link não leva nenhum clube", async () => {
    renderAt();
    fireEvent.click(await screen.findByTestId("entrar-already-voted"));
    fireEvent.change(await screen.findByPlaceholderText("entrar.email_placeholder"), { target: { value: "fan@exemplo.com" } });
    fireEvent.click(screen.getByText("entrar.send_link"));
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    expect((invoke.mock.calls[0] as any[])[1].body.pendingVote).toBeUndefined();
  });

  it("(c) 'Voltar' do modo entrar volta à busca de clube", async () => {
    renderAt();
    fireEvent.click(await screen.findByTestId("entrar-already-voted"));
    fireEvent.click(await screen.findByText("entrar.back"));
    expect(await screen.findByText("entrar.pick_title")).toBeTruthy();
  });

  it("(c) Instagram Android: 'Já votei — Entrar' usa o MESMO botão do Google, que abre o Chrome com o Google automático", async () => {
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
      fireEvent.click(await screen.findByTestId("entrar-already-voted"));
      fireEvent.click(await screen.findByText("entrar.google"));
      expect(hrefSet).toHaveBeenCalledTimes(1);
      expect(hrefSet.mock.calls[0][0]).toContain("go=google");
      expect(hrefSet.mock.calls[0][0]).not.toContain("pv=");
    } finally {
      Object.defineProperty(window, "location", { configurable: true, value: original });
    }
  });

  it("(d) votou e com sessão ativa: /entrar não mostra NADA e leva direto ao painel", async () => {
    markDeviceVoted({ clubName: "Vila Nova", email: "b***9@gmail.com" });
    state.authed = true;
    state.hasVoted = true;
    const { container } = renderAt();
    // desde o primeiro quadro: só o indicador de redirecionamento — nem busca, nem "bem-vindo de volta", nem botões
    expect(screen.queryByText("entrar.pick_title")).toBeNull();
    expect(screen.queryByTestId("entrar-welcome-back")).toBeNull();
    expect(screen.queryByTestId("entrar-already-voted")).toBeNull();
    expect(container.querySelectorAll("button").length).toBe(0);
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/dashboard"));
  });

  it("(d) com o logo de abertura ainda por mostrar: quem tem sessão e voto não vê nem o logo", async () => {
    sessionStorage.clear(); // abertura ainda não vista
    state.authed = true;
    state.hasVoted = true;
    renderAt();
    expect(screen.queryByTestId("entrar-intro")).toBeNull();
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/dashboard"));
  });
});
