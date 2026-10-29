// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

// Porta de entrada nova: logo parado → busca → (toca no clube) → opções de entrar direto, sem "Juro lealdade" nem simpatias.
const invoke = vi.fn(() => Promise.resolve({ data: { success: true }, error: null }));
const signInWithOAuth = vi.fn(() => Promise.resolve({ error: null }));
const state = { authed: false, hasVoted: false, email: "fan@exemplo.com" };

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: (...a: any[]) => (invoke as any)(...a) },
    auth: { signInWithOAuth: (...a: any[]) => (signInWithOAuth as any)(...a) },
    rpc: () => Promise.resolve({ data: 0, error: null }),
  },
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
const club: any = { id: "1", name: "Vila Nova", logo: "", location: "Goiânia, Brazil", source: "local" };
vi.mock("@/components/entrar/ClubSearchBox", () => ({
  // a lista de resultados mostra o clube como botão: tocar nele = escolher o clube
  ResultsList: ({ onPick }: any) => <button onClick={() => onPick(club)}>escolher-vila-nova</button>,
  useClubSearch: () => ({ query: "", setQuery: vi.fn(), results: [], loading: false, open: true, setOpen: vi.fn(), reset: vi.fn() }),
}));
vi.mock("@/lib/entry-flow", async (orig) => ({ ...(await orig<typeof import("@/lib/entry-flow")>()), NEW_ENTRY_FLOW_ENABLED: true }));

import Entrar from "./Entrar";
import { decodePendingVoteParam, loadPendingVote } from "@/lib/entry-flow";

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

const chooseClub = async () => {
  fireEvent.click(await screen.findByText("escolher-vila-nova"));
  await screen.findByTestId("entrar-chosen-club");
};

describe("Entrar — fluxo direto (logo parado, busca, opções de entrar)", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    invoke.mockClear();
    signInWithOAuth.mockClear();
    state.authed = false;
    state.hasVoted = false;
    uaSpy = vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(CHROME);
  });
  afterEach(() => {
    uaSpy.mockRestore();
    vi.useRealTimers();
  });

  describe("abertura", () => {
    it("mostra só o logo parado (sem vídeo e sem botão PULAR) e passa para a busca em no máximo 2 segundos", () => {
      vi.useFakeTimers();
      const { container } = renderAt();
      expect(screen.getByTestId("entrar-intro")).toBeTruthy();
      expect(container.querySelector("video")).toBeNull();
      expect(screen.queryByText("entrar.skip")).toBeNull();
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(screen.queryByTestId("entrar-intro")).toBeNull();
      expect(screen.getByText("entrar.pick_title")).toBeTruthy();
    });

    it("tocar na tela também pula o logo", () => {
      renderAt();
      fireEvent.click(screen.getByTestId("entrar-intro"));
      expect(screen.getByText("entrar.pick_title")).toBeTruthy();
    });

    it("na mesma sessão o logo não aparece de novo", () => {
      sessionStorage.setItem("hc_intro_seen", "1");
      renderAt();
      expect(screen.queryByTestId("entrar-intro")).toBeNull();
      expect(screen.getByText("entrar.pick_title")).toBeTruthy();
    });
  });

  describe("escolher o clube", () => {
    beforeEach(() => sessionStorage.setItem("hc_intro_seen", "1"));

    it("tocar no clube mostra DIRETO as opções de entrar, com o clube no topo — sem 'Juro lealdade' nem simpatias", async () => {
      renderAt();
      await chooseClub();
      expect(screen.getByTestId("entrar-chosen-club").textContent).toContain("Vila Nova");
      expect(screen.getByText("entrar.google")).toBeTruthy();
      expect(screen.getByText("entrar.send_link")).toBeTruthy();
      expect(screen.queryByText("entrar.swear")).toBeNull();
      expect(screen.queryByText("entrar.sympathy_intro")).toBeNull();
      expect(screen.queryByPlaceholderText("entrar.sympathy_placeholder_n")).toBeNull();
    });

    it("mostra o aviso dos Termos abaixo das opções, com links para Termos e Privacidade", async () => {
      renderAt();
      await chooseClub();
      const notice = screen.getByTestId("entrar-terms-notice");
      expect(notice.textContent).toContain("entrar.terms_notice_pre");
      const hrefs = Array.from(notice.querySelectorAll("a")).map((a) => a.getAttribute("href"));
      expect(hrefs).toEqual(["/termos", "/privacidade"]);
      // o aviso fica DEPOIS do botão de e-mail (abaixo das opções de entrar)
      const sendLink = screen.getByText("entrar.send_link");
      expect(sendLink.compareDocumentPosition(notice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("'Trocar de clube' volta para a busca", async () => {
      renderAt();
      await chooseClub();
      fireEvent.click(screen.getByText("entrar.change_club"));
      expect(await screen.findByText("entrar.pick_title")).toBeTruthy();
    });
  });

  describe("entrar", () => {
    beforeEach(() => sessionStorage.setItem("hc_intro_seen", "1"));

    it("Google: guarda o clube + 'Termos mostrados' no aparelho ANTES de sair para o Google", async () => {
      renderAt();
      await chooseClub();
      fireEvent.click(screen.getByText("entrar.google"));
      await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledTimes(1));
      const saved = loadPendingVote();
      expect(saved?.club.name).toBe("Vila Nova");
      expect(saved?.terms).toBe(true);
      expect(saved?.sympathies).toEqual([]);
      expect((signInWithOAuth.mock.calls[0] as any[])[0].provider).toBe("google");
    });

    it("e-mail: o clube e o sinal de 'Termos mostrados' vão no link do e-mail", async () => {
      renderAt();
      await chooseClub();
      fireEvent.change(screen.getByPlaceholderText("entrar.email_placeholder"), { target: { value: "fan@exemplo.com" } });
      fireEvent.click(screen.getByText("entrar.send_link"));
      await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
      const [fn, opts] = invoke.mock.calls[0] as any[];
      expect(fn).toBe("heart-club-auth");
      const decoded = decodePendingVoteParam(opts.body.pendingVote);
      expect(decoded?.club.name).toBe("Vila Nova");
      expect(decoded?.terms).toBe(true);
      expect(decoded?.sympathies).toEqual([]);
      expect(loadPendingVote()?.terms).toBe(true); // e no aparelho, caso ele abra o link aqui mesmo
    });

    it("a tela de entrada NÃO tem caixinha nenhuma (só duas ações: escolher o time e entrar)", async () => {
      renderAt();
      await chooseClub();
      expect(screen.queryByRole("checkbox")).toBeNull();
      expect(screen.queryByText("entrar.news_optin")).toBeNull();
    });
  });

  describe("quem já está logado e ainda não votou", () => {
    it("escolhe o clube e segue pela confirmação normal (nunca grava sem ter visto o aviso)", async () => {
      sessionStorage.setItem("hc_intro_seen", "1");
      state.authed = true;
      renderAt();
      fireEvent.click(await screen.findByText("escolher-vila-nova"));
      await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/confirmar-voto"));
      expect(loadPendingVote()?.terms).toBe(false);
    });
  });

  describe("pelo Instagram (navegador interno)", () => {
    beforeEach(() => {
      sessionStorage.setItem("hc_intro_seen", "1");
      uaSpy.mockRestore();
      uaSpy = vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(ANDROID_INSTAGRAM);
    });

    it("Android: sem botão laranja de Chrome na busca; depois de escolher, o Google normal e o e-mail levam o clube", async () => {
      renderAt();
      expect(await screen.findByText("entrar.pick_title")).toBeTruthy();
      expect(screen.queryByText("entrar.inapp_open_chrome")).toBeNull();
      await chooseClub();
      expect(screen.getByText("entrar.google")).toBeTruthy();
      expect(screen.getByTestId("entrar-terms-notice")).toBeTruthy();
      fireEvent.change(screen.getByPlaceholderText("entrar.email_placeholder"), { target: { value: "fan@exemplo.com" } });
      fireEvent.click(screen.getByText("entrar.send_link"));
      await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
      const decoded = decodePendingVoteParam((invoke.mock.calls[0] as any[])[1].body.pendingVote);
      expect(decoded?.club.name).toBe("Vila Nova");
    });
  });
});

describe("Entrar — teste do Master (?sim=1) não grava nada", () => {
  it("o botão de entrar só avança para a tela de voto simulada", async () => {
    sessionStorage.setItem("hc_intro_seen", "1");
    state.authed = true;
    state.email = "betoborelli9@gmail.com";
    uaSpy = vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(CHROME);
    renderAt("/entrar?sim=1");
    await chooseClub();
    fireEvent.click(screen.getByText("entrar.google"));
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/confirmar-voto?sim=1"));
    expect(signInWithOAuth).not.toHaveBeenCalled();
    uaSpy.mockRestore();
    state.authed = false;
    state.email = "fan@exemplo.com";
  });
});
