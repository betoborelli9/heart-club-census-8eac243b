// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// A página antiga /login também não pode oferecer o Google dentro do Instagram/Facebook (o Google bloqueia ali).
const invoke = vi.fn(() => Promise.resolve({ data: { success: true }, error: null }));
const signInWithOAuth = vi.fn(() => Promise.resolve({ error: null }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...a: any[]) => (invoke as any)(...a) }, auth: { signInWithOAuth: (...a: any[]) => (signInWithOAuth as any)(...a) } },
}));
vi.mock("@/contexts/UserContext", () => ({
  useUser: () => ({ user: null, isAuthenticated: false, isProfileComplete: false, hasVoted: false, isLoading: false }),
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/hooks/useTranslationApp", () => ({ useTranslationApp: () => ({ t: (k: string) => k }) }));

import Login from "./Login";

const ANDROID_INSTAGRAM =
  "Mozilla/5.0 (Linux; Android 13; SM-A546E; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 Instagram 310.0.0.37.108 Android";
const ANDROID_FACEBOOK =
  "Mozilla/5.0 (Linux; Android 12; Pixel 6 Build/SQ3A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/119.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/440.0.0.30.113;]";
const IPHONE_INSTAGRAM =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21C62 Instagram 312.0.0.22.114 (iPhone14,5; iOS 17_2)";
const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 13; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1";

let uaSpy: ReturnType<typeof vi.spyOn>;
const withUa = (ua: string) => {
  uaSpy = vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(ua);
};
const renderLogin = () =>
  render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<Login />} />
      </Routes>
    </MemoryRouter>,
  );

describe("Login (/login) — navegador interno do Instagram/Facebook", () => {
  beforeEach(() => {
    invoke.mockClear();
    signInWithOAuth.mockClear();
  });
  afterEach(() => uaSpy?.mockRestore());

  it("Android no Instagram: botão 'Abrir no Chrome' no topo e sem o botão do Google", () => {
    withUa(ANDROID_INSTAGRAM);
    renderLogin();
    expect(screen.getByText("entrar.inapp_open_chrome")).toBeTruthy();
    expect(screen.queryByText("auth.login.google")).toBeNull();
    expect(screen.getByText("auth.login.send_link")).toBeTruthy(); // e-mail é a opção principal
    expect(screen.queryByTestId("inapp-ios")).toBeNull();
  });

  it("Android no Facebook: o mesmo", () => {
    withUa(ANDROID_FACEBOOK);
    renderLogin();
    expect(screen.getByText("entrar.inapp_open_chrome")).toBeTruthy();
    expect(screen.queryByText("auth.login.google")).toBeNull();
  });

  it("iPhone no Instagram: aviso de '••• > Abrir no navegador' e sem o botão do Google", () => {
    withUa(IPHONE_INSTAGRAM);
    renderLogin();
    expect(screen.getByTestId("inapp-ios")).toBeTruthy();
    expect(screen.queryByText("entrar.inapp_open_chrome")).toBeNull();
    expect(screen.queryByText("auth.login.google")).toBeNull();
    expect(screen.getByText("auth.login.send_link")).toBeTruthy();
  });

  it("navegador normal (Chrome e Safari): nada muda — Google aparece, sem avisos", () => {
    for (const ua of [ANDROID_CHROME, IPHONE_SAFARI]) {
      withUa(ua);
      const { unmount } = renderLogin();
      expect(screen.getByText("auth.login.google")).toBeTruthy();
      expect(screen.getByText("auth.login.divider")).toBeTruthy();
      expect(screen.queryByText("entrar.inapp_open_chrome")).toBeNull();
      expect(screen.queryByTestId("inapp-ios")).toBeNull();
      unmount();
      uaSpy.mockRestore();
    }
  });

  it("dentro do Instagram o login por e-mail continua funcionando", async () => {
    withUa(ANDROID_INSTAGRAM);
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText("auth.login.email_placeholder"), { target: { value: "fan@exemplo.com" } });
    fireEvent.click(screen.getByText("auth.login.send_link"));
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    const [fn, opts] = invoke.mock.calls[0] as any[];
    expect(fn).toBe("heart-club-auth");
    expect(opts.body.email).toBe("fan@exemplo.com");
    expect(signInWithOAuth).not.toHaveBeenCalled();
  });

  it("Android: o botão abre a mesma página (/login) no Chrome por intent, com plano B se não houver Chrome", () => {
    withUa(ANDROID_INSTAGRAM);
    const hrefSet = vi.fn();
    const original = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        get href() {
          return "https://www.votenoseutime.com.br/login";
        },
        set href(v: string) {
          hrefSet(v);
        },
        origin: "https://www.votenoseutime.com.br",
      },
    });
    try {
      renderLogin();
      fireEvent.click(screen.getByText("entrar.inapp_open_chrome"));
      expect(hrefSet).toHaveBeenCalledTimes(1);
      const target = hrefSet.mock.calls[0][0] as string;
      expect(target.startsWith("intent://www.votenoseutime.com.br/login#Intent;scheme=https;package=com.android.chrome;")).toBe(true);
      expect(target).toContain("S.browser_fallback_url=" + encodeURIComponent("https://www.votenoseutime.com.br/login"));
      expect(target.endsWith(";end")).toBe(true);
    } finally {
      Object.defineProperty(window, "location", { configurable: true, value: original });
    }
  });
});
