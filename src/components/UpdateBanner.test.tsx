// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/hooks/useTranslationApp", () => ({ useTranslationApp: () => ({ t: (k: string) => k, language: "pt" }) }));

import UpdateBanner, { CHECK_EVERY_MS } from "./UpdateBanner";

const setLoaded = (src: string | null) => {
  document.head.innerHTML = src ? `<script type="module" src="${src}"></script>` : "";
};
const html = (src: string) => ({ ok: true, text: () => Promise.resolve(`<script type="module" src="${src}"></script>`) });
const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe("Aviso 'Nova versão disponível'", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.head.innerHTML = "";
  });

  it("versão publicada diferente da carregada: mostra o aviso com o botão Atualizar", async () => {
    setLoaded("/assets/index-VELHA.js");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(html("/assets/index-NOVA.js")));
    render(<UpdateBanner />);
    await flush();
    expect(screen.getByTestId("update-banner")).toBeTruthy();
    expect(screen.getByTestId("update-reload").textContent).toContain("update.action");
  });

  it("mesma versão: nada aparece", async () => {
    setLoaded("/assets/index-IGUAL.js");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(html("/assets/index-IGUAL.js")));
    render(<UpdateBanner />);
    await flush();
    expect(screen.queryByTestId("update-banner")).toBeNull();
  });

  it("sem versão publicada para comparar (desenvolvimento/teste): nem consulta o servidor", async () => {
    setLoaded(null);
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    render(<UpdateBanner />);
    await flush();
    expect(f).not.toHaveBeenCalled();
    expect(screen.queryByTestId("update-banner")).toBeNull();
  });

  it("janela que continua aberta: confere de novo a cada 5 minutos e avisa quando sai versão nova", async () => {
    setLoaded("/assets/index-A.js");
    const f = vi.fn().mockResolvedValue(html("/assets/index-A.js"));
    vi.stubGlobal("fetch", f);
    render(<UpdateBanner />);
    await flush();
    expect(screen.queryByTestId("update-banner")).toBeNull();
    f.mockResolvedValue(html("/assets/index-B.js")); // saiu uma publicação
    await act(async () => {
      vi.advanceTimersByTime(CHECK_EVERY_MS);
    });
    await flush();
    expect(screen.getByTestId("update-banner")).toBeTruthy();
  });

  it("o botão recarrega a página (e nada recarrega sozinho)", async () => {
    setLoaded("/assets/index-VELHA.js");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(html("/assets/index-NOVA.js")));
    const reload = vi.fn();
    const original = window.location;
    Object.defineProperty(window, "location", { configurable: true, value: { ...original, reload } });
    render(<UpdateBanner />);
    await flush();
    expect(reload).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("update-reload"));
    expect(reload).toHaveBeenCalledTimes(1);
    Object.defineProperty(window, "location", { configurable: true, value: original });
  });
});
