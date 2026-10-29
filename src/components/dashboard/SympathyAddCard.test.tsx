// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

// Cartão do painel: "Adicione até 4 times de simpatia (opcional)". Só PREENCHE simpatia vazia do voto original.
const state = { user: { id: "u1" } as any, simActive: false };
let slots: (string | null)[] = [null, null, null, null];
const updateSpy = vi.fn();
const isSpy = vi.fn();
const toast = vi.fn();
const setSimSympathies = vi.fn();
const persist = vi.fn(() => Promise.resolve());
let updateResult: any = { data: [{ id: "v1" }], error: null };

vi.mock("@/contexts/UserContext", () => ({ useUser: () => ({ user: state.user, simActive: state.simActive }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));
vi.mock("@/hooks/useTranslationApp", () => ({
  useTranslationApp: () => ({ t: (k: string, o?: any) => (o?.club ? `${k}:${o.club}` : o?.count !== undefined ? `${k}:${o.count}` : k) }),
}));
vi.mock("@/lib/sim-fan", () => ({ setSimSympathies: (...a: any[]) => (setSimSympathies as any)(...a) }));
vi.mock("@/lib/search-clubs", async (orig) => ({
  ...(await orig<typeof import("@/lib/search-clubs")>()),
  persistClubsIfMissing: (...a: any[]) => (persist as any)(...a),
}));
const clubs: Record<string, any> = {
  goias: { id: "2", name: "Goiás", logo: "", location: "Goiânia", source: "local" },
  flamengo: { id: "3", name: "Flamengo", logo: "https://x.test/f.png", location: "Rio", source: "api", api_id: 127 },
  vila: { id: "1", name: "Vila Nova", logo: "", location: "Goiânia", source: "local" },
  invalido: { id: "9", name: "xx", logo: "", location: "", source: "local" },
};
vi.mock("@/components/entrar/ClubSearchBox", () => ({
  ResultsList: ({ onPick }: any) => (
    <div>
      {Object.entries(clubs).map(([k, c]) => (
        <button key={k} onClick={() => onPick(c)}>{`pick-${k}`}</button>
      ))}
    </div>
  ),
  useClubSearch: () => ({ query: "", setQuery: vi.fn(), results: [], loading: false, open: true, setOpen: vi.fn(), reset: vi.fn() }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({
                data: { id: "v1", sympathy_1: slots[0], sympathy_2: slots[1], sympathy_3: slots[2], sympathy_4: slots[3] },
                error: null,
              }),
          }),
        }),
      }),
      update: (patch: any) => {
        updateSpy(patch);
        return {
          eq: () => ({
            is: (col: string, val: any) => {
              isSpy(col, val);
              return { select: () => Promise.resolve(updateResult) };
            },
          }),
        };
      },
    }),
  },
}));

import SympathyAddCard from "./SympathyAddCard";

const setup = (sympathies: string[] = [], heart: string | null = "Vila Nova") => {
  const onChanged = vi.fn();
  render(<SympathyAddCard heartClubName={heart} sympathies={sympathies} onChanged={onChanged} />);
  return onChanged;
};

describe("SympathyAddCard — simpatias no painel, depois do voto", () => {
  beforeEach(() => {
    localStorage.clear();
    slots = [null, null, null, null];
    state.simActive = false;
    updateResult = { data: [{ id: "v1" }], error: null };
    [updateSpy, isSpy, toast, setSimSympathies, persist].forEach((m) => m.mockClear());
  });

  it("mostra o cartão simples com o título pedido quando ainda há vaga", () => {
    setup([]);
    expect(screen.getByTestId("sympathy-add-card")).toBeTruthy();
    expect(screen.getByText("sympathy_card.title")).toBeTruthy();
  });

  it("não aparece com as 4 simpatias já preenchidas, nem sem clube do coração", () => {
    const { unmount } = render(<SympathyAddCard heartClubName="Vila Nova" sympathies={["a", "b", "c", "d"]} onChanged={vi.fn()} />);
    expect(screen.queryByTestId("sympathy-add-card")).toBeNull();
    unmount();
    render(<SympathyAddCard heartClubName={null} sympathies={[]} onChanged={vi.fn()} />);
    expect(screen.queryByTestId("sympathy-add-card")).toBeNull();
  });

  it("time que já está na lista de simpatias: só avisa, não grava de novo", async () => {
    slots = ["Flamengo", null, "Goiás", null];
    const onChanged = setup(["Flamengo", "Goiás"]);
    fireEvent.click(screen.getByText("pick-goias"));
    await new Promise((r) => setTimeout(r, 20));
    expect(updateSpy).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith({ title: "sympathy_card.already" });
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("time novo: preenche a 1ª vaga vazia (sympathy_2) sem tocar nas outras", async () => {
    slots = ["Flamengo", null, "Goiás", null];
    // "Vila Nova" é o coração; usamos um clube que não está na lista
    clubs.novo = { id: "7", name: "Atlético Goianiense", logo: "", location: "Goiânia", source: "local" };
    const onChanged = setup(["Flamengo", "Goiás"]);
    fireEvent.click(screen.getByText("pick-novo"));
    await waitFor(() => expect(updateSpy).toHaveBeenCalledTimes(1));
    expect(updateSpy).toHaveBeenCalledWith({ sympathy_2: "Atlético Goianiense" });
    expect(isSpy).toHaveBeenCalledWith("sympathy_2", null); // atômico: só grava se continuar vazia
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(["Flamengo", "Goiás", "Atlético Goianiense"]));
    delete clubs.novo;
  });

  it("não deixa escolher o próprio clube do coração como simpatia", async () => {
    const onChanged = setup([]);
    fireEvent.click(screen.getByText("pick-vila"));
    await new Promise((r) => setTimeout(r, 20));
    expect(updateSpy).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith({ title: "sympathy_card.already" });
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("nome de clube inválido é ignorado", async () => {
    const onChanged = setup([]);
    fireEvent.click(screen.getByText("pick-invalido"));
    await new Promise((r) => setTimeout(r, 20));
    expect(updateSpy).not.toHaveBeenCalled();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("time vindo da API oficial é cadastrado na base de clubes depois de salvar", async () => {
    const onChanged = setup([]);
    fireEvent.click(screen.getByText("pick-flamengo"));
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(["Flamengo"]));
    expect(updateSpy).toHaveBeenCalledWith({ sympathy_1: "Flamengo" });
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it("se o banco não gravar (ex.: vaga já ocupada), mostra erro e NÃO muda a lista", async () => {
    updateResult = { data: [], error: null };
    const onChanged = setup([]);
    fireEvent.click(screen.getByText("pick-goias"));
    await waitFor(() => expect(toast).toHaveBeenCalledWith({ variant: "destructive", title: "sympathy_card.error" }));
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("teste do Master (simulação): guarda só na memória e nunca toca no banco", async () => {
    state.simActive = true;
    const onChanged = setup([]);
    fireEvent.click(screen.getByText("pick-goias"));
    await waitFor(() => expect(setSimSympathies).toHaveBeenCalledWith(["Goiás"]));
    expect(updateSpy).not.toHaveBeenCalled();
    expect(onChanged).toHaveBeenCalledWith(["Goiás"]);
  });

  it("'Agora não' esconde o cartão e lembra a escolha neste aparelho", () => {
    setup([]);
    fireEvent.click(screen.getByLabelText("sympathy_card.dismiss"));
    expect(screen.queryByTestId("sympathy-add-card")).toBeNull();
    expect(localStorage.getItem("hc_sympathy_card_dismissed_u1")).toBe("1");
  });
});
