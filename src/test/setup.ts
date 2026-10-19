import "@testing-library/jest-dom";
import { configure } from "@testing-library/react";

// Máquina ocupada (suíte inteira rodando) deixa alguns testes lentos: dá mais tempo para esperar a tela
configure({ asyncUtilTimeout: 10000 });

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// jsdom não implementa window.scrollTo (a página Jogos volta ao topo ao abrir)
Object.defineProperty(window, "scrollTo", { writable: true, value: () => {} });
