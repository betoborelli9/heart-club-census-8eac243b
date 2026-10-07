// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

let answer: any = null;
let calls = 0;

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (fn: string, args: any) => {
      calls++;
      return Promise.resolve({ data: fn === "public_get_raio_x" ? answer(args.p_club) : null, error: null });
    },
  },
}));
vi.mock("@/hooks/useTranslationApp", () => ({
  useTranslationApp: () => ({
    t: (k: string, o?: any) => (o?.n !== undefined ? `${k}:${o.n}` : k),
  }),
}));
vi.mock("framer-motion", () => ({
  motion: { div: ({ children, initial, animate, transition, ...p }: any) => <div {...p}>{children}</div> },
}));

import RaioXTorcida from "./RaioXTorcida";

const poucas = { minimo: 30, total_votos: 10, genero: { resp: 10 }, idade: { resp: 10 }, profissoes: { resp: 1 }, cidades: { resp: 10 } };
const completo = {
  minimo: 30,
  total_votos: 120,
  genero: { resp: 100, homens: 60, mulheres: 38, outros: 2 },
  idade: { resp: 100, ate20: 10, f21_35: 40, f36_50: 35, f51: 15 },
  profissoes: { resp: 50, top: [{ nome: "Professor", n: 10 }, { nome: "Engenheiro", n: 5 }], outras: 35 },
  cidades: { resp: 100, top: [{ nome: "Goiânia", n: 55 }, { nome: "Anápolis", n: 20 }], outras: 25 },
};

describe("RaioXTorcida", () => {
  beforeEach(() => {
    calls = 0;
    answer = () => poucas;
  });

  it("clube com poucas respostas: mostra barra de progresso e 'Convocar a tropa', sem nenhum detalhe", async () => {
    const onRally = vi.fn();
    render(<RaioXTorcida clubName="Clube Pequeno" onRally={onRally} />);
    await waitFor(() => expect(screen.getAllByText("raiox.building").length).toBe(4));
    expect(screen.getAllByText("raiox.missing:20").length).toBeGreaterThan(0); // 30 - 10
    expect(screen.getAllByText("raiox.missing:29").length).toBeGreaterThan(0); // 30 - 1 (profissão)
    fireEvent.click(screen.getAllByText("raiox.rally")[0]);
    expect(onRally).toHaveBeenCalled();
    expect(screen.queryByText("raiox.men")).toBeNull();
  });

  it("clube com respostas suficientes: mostra porcentagens de gênero, idade, profissões e cidades", async () => {
    answer = () => completo;
    render(<RaioXTorcida clubName="Clube Grande" onRally={vi.fn()} />);
    expect(await screen.findByText("raiox.men")).toBeTruthy();
    expect(screen.getByText("60%")).toBeTruthy(); // homens
    expect(screen.getByText("38%")).toBeTruthy(); // mulheres
    expect(screen.getByText("Professor")).toBeTruthy();
    expect(screen.getByText("Goiânia")).toBeTruthy();
    expect(screen.getByText("55%")).toBeTruthy();
    expect(screen.getAllByText("raiox.age_21_35").length).toBe(2); // na lista e em "faixa dominante"
    expect(screen.queryByText("raiox.building")).toBeNull();
  });

  it("não quebra a página se o banco falhar: some sem erro", async () => {
    answer = () => null;
    const { container } = render(<RaioXTorcida clubName="Qualquer" />);
    await waitFor(() => expect(container.querySelector("section")).toBeNull());
  });

  it("sem clube em exibição não mostra nada e não consulta o banco", () => {
    const { container } = render(<RaioXTorcida clubName={null} />);
    expect(container.firstChild).toBeNull();
    expect(calls).toBe(0);
  });
});
