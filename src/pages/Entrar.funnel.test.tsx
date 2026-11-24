// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// Contador de passos da entrada + iPhone: a escolha do time vai no endereço da página para abrir no Safari.
const inserts: any[] = [];
const insertSpy = vi.fn((row: any) => {
  inserts.push(row);
  return Promise.resolve({ error: null });
});
const signInWithOAuth = vi.fn(() => Promise.resolve({ error: null }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: () => Promise.resolve({ data: { success: true }, error: null }) },
    auth: { signInWithOAuth: (...a: any[]) => (signInWithOAuth as any)(...a) },
    rpc: (name: string, args: any) => (name === "registrar_passo_entrada" ? insertSpy(args) : Promise.resolve({ data: 0, error: null })),
  },
}));
vi.mock("@/contexts/UserContext", () => ({
  useUser: () => ({ user: null, realUser: null, isAuthReady: true, isLoading: false, isAuthenticated: false, hasVoted: false }),
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/hooks/useTranslationApp", () => ({ useTranslationApp: () => ({ t: (k: string) => k }) }));
vi.mock("@/components/ClubLogo", () => ({ ClubLogo: () => null }));
const club: any = { id: "1", name: "Vila Nova", logo: "", location: "Goiânia, Brazil", city: "Goiânia", country: "Brazil", source: "local", api_id: 144 };
vi.mock("@/components/entrar/ClubSearchBox", () => ({
  ResultsList: ({ onPick }: any) => <button onClick={() => onPick(club)}>escolher-vila-nova</button>,
  useClubSearch: () => ({ query: "", setQuery: vi.fn(), results: [], loading: false, open: true, setOpen: vi.fn(), reset: vi.fn() }),
}));
vi.mock("@/lib/entry-flow", async (orig) => ({ ...(await orig<typeof import("@/lib/entry-flow")>()), NEW_ENTRY_FLOW_ENABLED: true }));

import Entrar from "./Entrar";

const CHROME = "Mozilla/5.0 (Linux; Android 13; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
const ANDROID_INSTAGRAM =
  "Mozilla/5.0 (Linux; Android 13; SM-A546E; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 Instagram 310.0.0.37.108 Android";
const IPHONE_INSTAGRAM = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 310.0.0.37.108";
let uaSpy: ReturnType<typeof vi.spyOn>;

const renderEntrar = (url = "/entrar") =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/entrar" element={<Entrar />} />
        <Route path="*" element={<div />} />
      </Routes>
    </MemoryRouter>,
  );

const steps = () => inserts.map((r) => r.p_etapa);

describe("Entrar — contador de passos da entrada", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    sessionStorage.setItem("hc_intro_seen", "1");
    inserts.length = 0;
    insertSpy.mockClear();
    signInWithOAuth.mockClear();
    uaSpy = vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(CHROME);
    window.history.replaceState(null, "", "/entrar");
  });
  afterEach(() => uaSpy.mockRestore());

  it("registra 'abriu' e 'toque_time' (só o passo: sem nome, e-mail nem clube)", async () => {
    renderEntrar();
    expect(steps()).toEqual(["abriu"]);
    fireEvent.click(await screen.findByText("escolher-vila-nova"));
    await screen.findByTestId("entrar-chosen-club");
    expect(steps()).toEqual(["abriu", "toque_time"]);
    for (const r of inserts) expect(Object.keys(r).sort()).toEqual(["p_etapa", "p_in_app", "p_origem_id", "p_plataforma", "p_visitor_id"]);
    expect(JSON.stringify(inserts)).not.toContain("Vila Nova");
  });

  it("cada passo vale 1 vez por dia por visitante", () => {
    renderEntrar();
    renderEntrar();
    expect(steps().filter((s) => s === "abriu")).toHaveLength(1);
  });

  it("Chrome normal: tocar no Google registra 'toque_google' e 'google_iniciado'", async () => {
    renderEntrar();
    fireEvent.click(await screen.findByText("escolher-vila-nova"));
    await screen.findByTestId("entrar-chosen-club");
    fireEvent.click(screen.getByText("entrar.google"));
    await vi.waitFor(() => expect(signInWithOAuth).toHaveBeenCalled());
    expect(steps()).toEqual(["abriu", "toque_time", "toque_google", "google_iniciado"]);
    expect(inserts[0]).toMatchObject({ p_plataforma: "android", p_in_app: false });
  });

  it("Instagram no Android: registra 'abrir_chrome' marcando que está dentro do Instagram", async () => {
    uaSpy.mockReturnValue(ANDROID_INSTAGRAM);
    renderEntrar();
    fireEvent.click(await screen.findByText("escolher-vila-nova"));
    await screen.findByTestId("entrar-chosen-club");
    const original = window.location;
    const hrefs: string[] = [];
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { get href() { return "https://www.votenoseutime.com.br/entrar"; }, set href(v: string) { hrefs.push(v); }, origin: "https://www.votenoseutime.com.br" },
    });
    try {
      fireEvent.click(screen.getByText("entrar.google"));
    } finally {
      Object.defineProperty(window, "location", { configurable: true, value: original });
    }
    expect(steps()).toContain("abrir_chrome");
    expect(inserts.find((r) => r.p_etapa === "abrir_chrome")).toMatchObject({ p_plataforma: "android", p_in_app: true });
    expect(hrefs[0]).toMatch(/^intent:\/\//);
    expect(decodeURIComponent(hrefs[0])).toContain("vi=");
  });

  it("chegou no Chrome vindo do Instagram: registra 'chrome_chegou' ligado ao id do Instagram", () => {
    renderEntrar("/entrar?go=google&vi=visitante-do-instagram-1");
    const chegou = inserts.find((r) => r.p_etapa === "chrome_chegou");
    expect(chegou).toBeTruthy();
    expect(chegou.p_origem_id).toBe("visitante-do-instagram-1");
  });

  it("iPhone no Instagram: o time escolhido e o pedido do Google vão no endereço da página (abrir no Safari não perde nada)", async () => {
    uaSpy.mockReturnValue(IPHONE_INSTAGRAM);
    renderEntrar();
    fireEvent.click(await screen.findByText("escolher-vila-nova"));
    await screen.findByTestId("entrar-chosen-club");
    fireEvent.click(screen.getByText("entrar.google"));
    expect(await screen.findByTestId("inapp-ios")).toBeTruthy();
    const q = new URLSearchParams(window.location.search);
    expect(q.get("go")).toBe("google");
    expect(q.get("pv")).toBeTruthy();
    expect(q.get("vi")).toBeTruthy();
    expect(steps()).toContain("aviso_ios");
    expect(signInWithOAuth).not.toHaveBeenCalled();
  });

  it("se o contador falhar, a tela continua funcionando", async () => {
    insertSpy.mockImplementation(() => Promise.reject(new Error("fora do ar")));
    renderEntrar();
    fireEvent.click(await screen.findByText("escolher-vila-nova"));
    expect(await screen.findByTestId("entrar-chosen-club")).toBeTruthy();
  });
});
