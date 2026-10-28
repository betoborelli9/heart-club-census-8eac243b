// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// Quem chega pelo Instagram/Facebook (navegador interno): Google bloqueado → Chrome (Android), aviso (iPhone) e e-mail como principal.
const invoke = vi.fn(() => Promise.resolve({ data: { success: true }, error: null }));
const signInWithOAuth = vi.fn(() => Promise.resolve({ error: null }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...a: any[]) => (invoke as any)(...a) }, auth: { signInWithOAuth: (...a: any[]) => (signInWithOAuth as any)(...a) }, rpc: () => Promise.resolve({ data: 0, error: null }) },
}));
vi.mock("@/contexts/UserContext", () => ({
  useUser: () => ({ user: null, realUser: null, isAuthReady: true, isLoading: false, isAuthenticated: false, hasVoted: false }),
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
import { encodePendingVoteParam, loadPendingVote } from "@/lib/entry-flow";

const ANDROID_INSTAGRAM =
  "Mozilla/5.0 (Linux; Android 13; SM-A546E; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 Instagram 310.0.0.37.108 Android";
const IPHONE_INSTAGRAM =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21C62 Instagram 312.0.0.22.114 (iPhone14,5; iOS 17_2)";
const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 13; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

const club: any = { id: "1", name: "Vila Nova", logo: "", location: "Goiânia, Brazil", source: "local" };
let uaSpy: ReturnType<typeof vi.spyOn>;

const renderLogin = () => {
  const pv = encodePendingVoteParam(club, []);
  return render(
    <MemoryRouter initialEntries={[`/entrar?pv=${pv}`]}>
      <Routes>
        <Route path="/entrar" element={<Entrar />} />
      </Routes>
    </MemoryRouter>,
  );
};
const withUa = (ua: string) => {
  uaSpy = vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(ua);
};

describe("Entrar — navegador interno do Instagram/Facebook", () => {
  beforeEach(() => {
    localStorage.clear();
    invoke.mockClear();
    signInWithOAuth.mockClear();
  });
  afterEach(() => uaSpy?.mockRestore());

  it("Android: mostra 'Abrir no Chrome para votar' no topo e esconde o botão do Google", async () => {
    withUa(ANDROID_INSTAGRAM);
    renderLogin();
    expect(await screen.findByText("entrar.inapp_open_chrome")).toBeTruthy();
    expect(screen.queryByText("entrar.google")).toBeNull();
    expect(screen.getByText("entrar.send_link")).toBeTruthy(); // e-mail é a opção principal
    expect(screen.queryByTestId("inapp-ios")).toBeNull();
  });

  it("iPhone: mostra o aviso de abrir no navegador e esconde o Google", async () => {
    withUa(IPHONE_INSTAGRAM);
    renderLogin();
    expect(await screen.findByTestId("inapp-ios")).toBeTruthy();
    expect(screen.queryByText("entrar.inapp_open_chrome")).toBeNull();
    expect(screen.queryByText("entrar.google")).toBeNull();
  });

  it("navegador normal: nada muda — Google aparece e não há aviso", async () => {
    withUa(ANDROID_CHROME);
    renderLogin();
    expect(await screen.findByText("entrar.google")).toBeTruthy();
    expect(screen.queryByText("entrar.inapp_open_chrome")).toBeNull();
    expect(screen.queryByTestId("inapp-ios")).toBeNull();
  });

  it("chegou pelo link com a escolha: já cai no login do time certo e guarda a escolha no aparelho", async () => {
    withUa(ANDROID_CHROME);
    renderLogin();
    expect(await screen.findByText("Vila Nova")).toBeTruthy();
    expect(screen.getByText("entrar.login_title")).toBeTruthy();
    await waitFor(() => expect(loadPendingVote()?.club.name).toBe("Vila Nova"));
  });

  it("o link do e-mail leva a escolha do time (pendingVote) para a função", async () => {
    withUa(ANDROID_INSTAGRAM);
    renderLogin();
    const input = await screen.findByPlaceholderText("entrar.email_placeholder");
    fireEvent.change(input, { target: { value: "fan@exemplo.com" } });
    fireEvent.click(screen.getByText("entrar.send_link"));
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    const [fn, opts] = invoke.mock.calls[0] as any[];
    expect(fn).toBe("heart-club-auth");
    expect(opts.body.email).toBe("fan@exemplo.com");
    expect(opts.body.pendingVote).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("Android: o botão abre a mesma página no Chrome (intent) levando a escolha do time", async () => {
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
      renderLogin();
      fireEvent.click(await screen.findByText("entrar.inapp_open_chrome"));
      expect(hrefSet).toHaveBeenCalledTimes(1);
      const target = hrefSet.mock.calls[0][0] as string;
      expect(target.startsWith("intent://www.votenoseutime.com.br/entrar?pv=")).toBe(true);
      expect(target).toContain("#Intent;scheme=https;package=com.android.chrome;");
      expect(target.endsWith(";end")).toBe(true);
    } finally {
      Object.defineProperty(window, "location", { configurable: true, value: original });
    }
  });
});
