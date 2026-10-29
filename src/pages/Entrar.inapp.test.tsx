// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// Dentro do Instagram/Facebook o botão é o MESMO "Continuar com Google":
//  - Android: abre a página no Chrome (levando o clube) e o Google começa sozinho lá (?go=google);
//  - iPhone: aviso curto para abrir no navegador; o link por e-mail funciona normalmente.
const invoke = vi.fn(() => Promise.resolve({ data: { success: true }, error: null }));
const signInWithOAuth = vi.fn(() => Promise.resolve({ error: null }));
const state = { authed: false, email: "fan@exemplo.com" };

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...a: any[]) => (invoke as any)(...a) }, auth: { signInWithOAuth: (...a: any[]) => (signInWithOAuth as any)(...a) }, rpc: () => Promise.resolve({ data: 0, error: null }) },
}));
vi.mock("@/contexts/UserContext", () => ({
  useUser: () => ({
    user: state.authed ? { id: "u1", email: state.email } : null,
    realUser: state.authed ? { id: "u1", email: state.email } : null,
    isAuthReady: true,
    isLoading: false,
    isAuthenticated: state.authed,
    hasVoted: false,
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
import { decodePendingVoteParam, encodePendingVoteParam, loadPendingVote } from "@/lib/entry-flow";

const ANDROID_INSTAGRAM =
  "Mozilla/5.0 (Linux; Android 13; SM-A546E; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 Instagram 310.0.0.37.108 Android";
const ANDROID_FACEBOOK =
  "Mozilla/5.0 (Linux; Android 13; SM-A546E; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/450.0.0.38.108;]";
const IPHONE_INSTAGRAM =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21C62 Instagram 312.0.0.22.114 (iPhone14,5; iOS 17_2)";
const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 13; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

const club: any = { id: "1", name: "Vila Nova", logo: "", location: "Goiânia, Brazil", source: "local" };
let uaSpy: ReturnType<typeof vi.spyOn>;

const renderLogin = (extra = "") => {
  const pv = encodePendingVoteParam(club, []);
  return render(
    <MemoryRouter initialEntries={[`/entrar?pv=${pv}${extra}`]}>
      <Routes>
        <Route path="/entrar" element={<Entrar />} />
      </Routes>
    </MemoryRouter>,
  );
};
const withUa = (ua: string) => {
  uaSpy?.mockRestore();
  uaSpy = vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(ua);
};
// a página muda de endereço assim que o botão abre o Chrome: captura para onde ela foi mandada
const captureNavigation = () => {
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
  return { hrefSet, restore: () => Object.defineProperty(window, "location", { configurable: true, value: original }) };
};

describe("Entrar — navegador interno do Instagram/Facebook", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    invoke.mockClear();
    signInWithOAuth.mockClear();
    state.authed = false;
  });
  afterEach(() => uaSpy?.mockRestore());

  it("Android: NÃO há mais botão laranja 'Abrir no Chrome' nem texto explicativo; o botão é o 'Continuar com Google' normal", async () => {
    withUa(ANDROID_INSTAGRAM);
    renderLogin();
    expect(await screen.findByText("entrar.google")).toBeTruthy();
    expect(screen.queryByText("entrar.inapp_open_chrome")).toBeNull();
    expect(screen.queryByText("entrar.inapp_open_chrome_hint")).toBeNull();
    expect(screen.queryByTestId("inapp-android")).toBeNull();
    expect(screen.getByText("entrar.send_link")).toBeTruthy(); // e o link por e-mail está logo abaixo
  });

  it("Android: tocar no Google abre a MESMA página no Chrome (intent), levando o clube e pedindo o Google automático", async () => {
    withUa(ANDROID_INSTAGRAM);
    const nav = captureNavigation();
    try {
      renderLogin();
      fireEvent.click(await screen.findByText("entrar.google"));
      expect(nav.hrefSet).toHaveBeenCalledTimes(1);
      const target = nav.hrefSet.mock.calls[0][0] as string;
      expect(target.startsWith("intent://www.votenoseutime.com.br/entrar?")).toBe(true);
      expect(target).toContain("#Intent;scheme=https;package=com.android.chrome;");
      expect(target).toContain("go=google");
      expect(target.endsWith(";end")).toBe(true);
      // o clube escolhido viaja no endereço
      const query = target.split("?")[1].split("#")[0];
      const pv = new URLSearchParams(query).get("pv");
      expect(decodePendingVoteParam(pv)?.club.name).toBe("Vila Nova");
      expect(signInWithOAuth).not.toHaveBeenCalled(); // o Google em si começa só no Chrome
    } finally {
      nav.restore();
    }
  });

  it("Facebook no Android: mesmo tratamento do Instagram", async () => {
    withUa(ANDROID_FACEBOOK);
    const nav = captureNavigation();
    try {
      renderLogin();
      fireEvent.click(await screen.findByText("entrar.google"));
      expect(nav.hrefSet).toHaveBeenCalledTimes(1);
      expect((nav.hrefSet.mock.calls[0][0] as string).startsWith("intent://")).toBe(true);
    } finally {
      nav.restore();
    }
  });

  it("iPhone: o mesmo botão; ao tocar, aviso curto 'Toque em ••• e escolha Abrir no navegador' (e nada de login do Google)", async () => {
    withUa(IPHONE_INSTAGRAM);
    renderLogin();
    expect(screen.queryByTestId("inapp-ios")).toBeNull(); // antes do toque, nada de aviso
    fireEvent.click(await screen.findByText("entrar.google"));
    expect(await screen.findByTestId("inapp-ios")).toBeTruthy();
    expect(screen.getByText("entrar.inapp_ios_tap")).toBeTruthy();
    expect(signInWithOAuth).not.toHaveBeenCalled();
  });

  it("iPhone: o link por e-mail funciona normalmente e leva o clube", async () => {
    withUa(IPHONE_INSTAGRAM);
    renderLogin();
    fireEvent.change(await screen.findByPlaceholderText("entrar.email_placeholder"), { target: { value: "fan@exemplo.com" } });
    fireEvent.click(screen.getByText("entrar.send_link"));
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    const [fn, opts] = invoke.mock.calls[0] as any[];
    expect(fn).toBe("heart-club-auth");
    expect(opts.body.email).toBe("fan@exemplo.com");
    const decoded = decodePendingVoteParam(opts.body.pendingVote);
    expect(decoded?.club.name).toBe("Vila Nova");
    expect(decoded?.terms).toBe(true); // o aceite dos Termos viaja com o voto
  });

  it("Android: o link por e-mail também funciona dentro do Instagram", async () => {
    withUa(ANDROID_INSTAGRAM);
    renderLogin();
    fireEvent.change(await screen.findByPlaceholderText("entrar.email_placeholder"), { target: { value: "fan@exemplo.com" } });
    fireEvent.click(screen.getByText("entrar.send_link"));
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    expect(decodePendingVoteParam((invoke.mock.calls[0] as any[])[1].body.pendingVote)?.club.name).toBe("Vila Nova");
  });

  it("navegador normal: o Google começa na hora, sem intent e sem aviso", async () => {
    withUa(ANDROID_CHROME);
    renderLogin();
    fireEvent.click(await screen.findByText("entrar.google"));
    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId("inapp-ios")).toBeNull();
    const saved = loadPendingVote();
    expect(saved?.club.name).toBe("Vila Nova");
    expect(saved?.terms).toBe(true);
  });

  it("chegou pelo link com a escolha: já cai no login do time certo e guarda a escolha no aparelho (sem 'Termos mostrados')", async () => {
    withUa(ANDROID_CHROME);
    renderLogin();
    expect(await screen.findByText("Vila Nova")).toBeTruthy();
    expect(screen.getByText("entrar.login_title")).toBeTruthy();
    await waitFor(() => expect(loadPendingVote()?.club.name).toBe("Vila Nova"));
    expect(loadPendingVote()?.terms).toBe(false);
  });
});

describe("Entrar — no Chrome, vindo do Instagram (?go=google): o Google começa SOZINHO", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    invoke.mockClear();
    signInWithOAuth.mockClear();
    state.authed = false;
    withUa(ANDROID_CHROME);
  });
  afterEach(() => uaSpy?.mockRestore());

  it("sem nenhum toque: chama o login do Google e guarda o clube com o aviso dos Termos", async () => {
    renderLogin("&go=google");
    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledTimes(1));
    expect((signInWithOAuth.mock.calls[0] as any[])[0].provider).toBe("google");
    expect(loadPendingVote()?.club.name).toBe("Vila Nova");
    expect(loadPendingVote()?.terms).toBe(true);
  });

  it("começa UMA vez só (não repete em novas renderizações)", async () => {
    const { rerender } = renderLogin("&go=google");
    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledTimes(1));
    rerender(
      <MemoryRouter initialEntries={["/entrar"]}>
        <Routes>
          <Route path="/entrar" element={<Entrar />} />
        </Routes>
      </MemoryRouter>,
    );
    await new Promise((r) => setTimeout(r, 50));
    expect(signInWithOAuth).toHaveBeenCalledTimes(1);
  });

  it("se voltar do Google com o 'voltar' do navegador logo em seguida, não entra em laço (trava de 60 s)", async () => {
    sessionStorage.setItem("hc_auto_google_at", String(Date.now() - 5000));
    renderLogin("&go=google");
    expect(await screen.findByText("entrar.google")).toBeTruthy();
    await new Promise((r) => setTimeout(r, 50));
    expect(signInWithOAuth).not.toHaveBeenCalled();
  });

  it("sem ?go=google nada começa sozinho (o torcedor toca)", async () => {
    renderLogin();
    expect(await screen.findByText("entrar.google")).toBeTruthy();
    await new Promise((r) => setTimeout(r, 50));
    expect(signInWithOAuth).not.toHaveBeenCalled();
  });

  it("dentro do Instagram (Chrome ainda não aberto) o ?go=google NÃO dispara o Google (ele seria bloqueado)", async () => {
    withUa(ANDROID_INSTAGRAM);
    renderLogin("&go=google");
    expect(await screen.findByText("entrar.google")).toBeTruthy();
    await new Promise((r) => setTimeout(r, 50));
    expect(signInWithOAuth).not.toHaveBeenCalled();
  });

  it("já logado: não começa login nenhum", async () => {
    state.authed = true;
    renderLogin("&go=google");
    await new Promise((r) => setTimeout(r, 80));
    expect(signInWithOAuth).not.toHaveBeenCalled();
  });
});
