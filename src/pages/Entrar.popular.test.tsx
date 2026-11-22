// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// Porta de entrada: faixa "Toque no seu time" — escudos para tocar, sem digitar. Não é ranking (sem ordem de votos nem números).
const rows = [
  { id: 12, nome: "Flamengo", nome_curto: "FLA", api_id: "127", cidade: "Rio de Janeiro", pais: "Brazil", escudo_url: "https://x/127.png" },
  { id: 53, nome: "Goias", nome_curto: "GOI", api_id: "151", cidade: "Goiânia, Goiás", pais: "Brazil", escudo_url: "https://x/151.png" },
  { id: 2, nome: "Vila Nova", nome_curto: "VIL", api_id: "144", cidade: "Goiânia, Goiás", pais: "Brazil", escudo_url: "https://x/144.png" },
  { id: 99, nome: "Flamengo", nome_curto: "FLA-duplicado", api_id: null, cidade: "Não informado", pais: "Não informado", escudo_url: "" },
];
const fromState = { fail: false };
const inSpy = vi.fn((_col: string, _names: string[]) => (fromState.fail ? Promise.reject(new Error("fora do ar")) : Promise.resolve({ data: rows, error: null })));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: () => Promise.resolve({ data: { success: true }, error: null }) },
    auth: { signInWithOAuth: () => Promise.resolve({ error: null }) },
    rpc: () => Promise.resolve({ data: 0, error: null }),
    from: () => ({ select: () => ({ in: (c: string, n: string[]) => inSpy(c, n) }) }),
  },
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

const renderEntrar = () =>
  render(
    <MemoryRouter initialEntries={["/entrar"]}>
      <Routes>
        <Route path="/entrar" element={<Entrar />} />
        <Route path="*" element={<div />} />
      </Routes>
    </MemoryRouter>,
  );

describe("Entrar — faixa 'Toque no seu time'", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.setItem("hc_intro_seen", "1");
    fromState.fail = false;
    inSpy.mockClear();
  });

  it("mostra os escudos que existem no cadastro, com o nome escrito certo, e a busca e o 'Já votei' continuam lá", async () => {
    renderEntrar();
    const tiles = await screen.findAllByTestId("entrar-popular-club");
    expect(tiles.map((t) => t.textContent)).toEqual(["Vila Nova", "Flamengo", "Goiás"]); // só os que o cadastro tem, na ordem da lista
    expect(screen.getByTestId("entrar-already-voted")).toBeTruthy();
    expect(screen.getByText("entrar.popular_title")).toBeTruthy();
    expect(screen.getByText("entrar.pick_title")).toBeTruthy();
  });

  it("não é ranking: nenhum número aparece na faixa", async () => {
    renderEntrar();
    await screen.findAllByTestId("entrar-popular-club");
    expect(screen.getByTestId("entrar-popular").textContent).not.toMatch(/\d/);
  });

  it("pede ao cadastro os clubes pelo nome exato", async () => {
    renderEntrar();
    await screen.findAllByTestId("entrar-popular-club");
    expect(inSpy).toHaveBeenCalledTimes(1);
    expect(inSpy.mock.calls[0][0]).toBe("nome");
    expect(inSpy.mock.calls[0][1]).toEqual(expect.arrayContaining(["Flamengo", "Atletico Goianiense", "Vasco DA Gama"]));
  });

  it("um toque no escudo escolhe o time e vai direto às opções de entrar (usa a linha com o código da API)", async () => {
    renderEntrar();
    const flamengo = (await screen.findAllByTestId("entrar-popular-club")).find((t) => t.textContent === "Flamengo")!;
    fireEvent.click(flamengo);
    const chosen = await screen.findByTestId("entrar-chosen-club");
    expect(chosen.textContent).toContain("Flamengo");
    expect(screen.getByText("entrar.google")).toBeTruthy();
    expect(screen.getByTestId("entrar-terms-notice")).toBeTruthy();
  });

  it("se o cadastro não responder, a faixa some e a tela continua inteira", async () => {
    fromState.fail = true;
    renderEntrar();
    await waitFor(() => expect(inSpy).toHaveBeenCalled());
    expect(screen.queryByTestId("entrar-popular")).toBeNull();
    expect(screen.getByTestId("entrar-already-voted")).toBeTruthy();
    expect(screen.getByText("entrar.pick_title")).toBeTruthy();
  });
});
