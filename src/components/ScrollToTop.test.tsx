// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";

import ScrollToTop from "./ScrollToTop";

let go: (to: string | number) => void = () => {};
function Nav() {
  const nav = useNavigate();
  go = (to) => nav(to as any);
  return null;
}
const renderApp = (initial = "/ranking") =>
  render(
    <MemoryRouter initialEntries={[initial]}>
      <ScrollToTop />
      <Nav />
      <Routes>
        <Route path="*" element={<div />} />
      </Routes>
    </MemoryRouter>,
  );

describe("Toda página abre no topo", () => {
  let spy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    spy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    document.documentElement.scrollTop = 500;
    document.body.scrollTop = 500;
  });

  it("ao abrir qualquer página começa no topo", () => {
    renderApp("/jogos");
    expect(spy).toHaveBeenCalledWith({ top: 0, left: 0 });
  });

  it("ao trocar de página (Ranking → Jogos → Mapa), volta ao topo a cada troca", () => {
    renderApp("/ranking");
    spy.mockClear();
    act(() => go("/jogos"));
    expect(spy).toHaveBeenCalledTimes(1);
    act(() => go("/mapa"));
    expect(spy).toHaveBeenCalledTimes(2);
    expect(document.documentElement.scrollTop).toBe(0);
    expect(document.body.scrollTop).toBe(0);
  });

  it("ao voltar (botão voltar), também começa no topo", () => {
    renderApp("/ranking");
    act(() => go("/jogos"));
    spy.mockClear();
    act(() => go(-1));
    expect(spy).toHaveBeenCalledWith({ top: 0, left: 0 });
  });

  it("de um clube para outro (muda o endereço): volta ao topo", () => {
    renderApp("/clube/142?liga=72&temp=2026&aba=chances");
    spy.mockClear();
    act(() => go("/clube/151?liga=72&temp=2026&aba=chances"));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("link com âncora (#secao) não é puxado para o topo", () => {
    renderApp("/termos");
    spy.mockClear();
    act(() => go("/termos#privacidade"));
    expect(spy).not.toHaveBeenCalled();
  });

  it("impede o navegador de restaurar a rolagem antiga sozinho", () => {
    // o ambiente de teste não tem essa propriedade do navegador: simula como ela é num navegador de verdade ("auto")
    Object.defineProperty(window.history, "scrollRestoration", { value: "auto", writable: true, configurable: true });
    renderApp("/");
    expect(window.history.scrollRestoration).toBe("manual");
  });
});
