import "@testing-library/jest-dom";
import { configure } from "@testing-library/react";

// Máquina ocupada (suíte inteira rodando) deixa alguns testes lentos: dá mais tempo para esperar a tela
configure({ asyncUtilTimeout: 4000 });

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
