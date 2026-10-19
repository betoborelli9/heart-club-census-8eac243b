// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { isNewVersion, latestBuild, loadedBuild } from "./app-update";

const docWith = (src: string | null) => {
  document.head.innerHTML = src ? `<script type="module" crossorigin src="${src}"></script><script src="/outro.js"></script>` : "";
  return document;
};

describe("aviso de nova versão", () => {
  it("lê qual versão esta janela carregou (arquivo principal index-XXXX.js)", () => {
    expect(loadedBuild(docWith("/assets/index-d3CT1C7A.js"))).toBe("/assets/index-d3CT1C7A.js");
    expect(loadedBuild(docWith(null))).toBeNull(); // desenvolvimento e testes
  });

  it("lê a versão publicada agora no HTML do site", async () => {
    const f = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('<script type="module" src="/assets/index-NOVA123.js"></script>') });
    expect(await latestBuild(f as any)).toBe("/assets/index-NOVA123.js");
    expect(f.mock.calls[0][1]).toMatchObject({ cache: "no-store" }); // nunca usa cópia guardada
  });

  it("falha de rede ou resposta estranha não vira aviso falso", async () => {
    expect(await latestBuild(vi.fn().mockRejectedValue(new Error("off")) as any)).toBeNull();
    expect(await latestBuild(vi.fn().mockResolvedValue({ ok: false }) as any)).toBeNull();
    expect(await latestBuild(vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve("<html>sem script</html>") }) as any)).toBeNull();
  });

  it("só avisa quando as duas versões são conhecidas e diferentes", () => {
    expect(isNewVersion("/assets/index-A.js", "/assets/index-B.js")).toBe(true);
    expect(isNewVersion("/assets/index-A.js", "/assets/index-A.js")).toBe(false);
    expect(isNewVersion(null, "/assets/index-B.js")).toBe(false);
    expect(isNewVersion("/assets/index-A.js", null)).toBe(false);
  });
});
