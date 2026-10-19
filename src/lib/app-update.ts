/**
 * [CAMINHO]: src/lib/app-update.ts
 * [MÓDULO]: Detecta que existe uma versão NOVA do site enquanto a janela/aplicativo continua aberto.
 * Sem isso, quem deixa o app aberto (janela do computador, aplicativo do celular) fica horas ou dias com a tela antiga.
 * A versão é o nome do arquivo principal publicado (index-XXXX.js): muda a cada publicação.
 */
const MAIN_RE = /\/assets\/index-[A-Za-z0-9_-]+\.js/;

/** Arquivo principal que ESTA janela carregou (null em testes/desenvolvimento). */
export function loadedBuild(doc: Document = document): string | null {
  const el = Array.from(doc.querySelectorAll("script[src]")).find((s) => MAIN_RE.test(s.getAttribute("src") || ""));
  const m = el ? MAIN_RE.exec(el.getAttribute("src") || "") : null;
  return m ? m[0] : null;
}

/** Arquivo principal da versão publicada agora (null se não conseguiu consultar). */
export async function latestBuild(fetchFn: typeof fetch = fetch): Promise<string | null> {
  try {
    const res = await fetchFn(`/?_v=${Date.now()}`, { cache: "no-store", headers: { Accept: "text/html" } });
    if (!res.ok) return null;
    const m = MAIN_RE.exec(await res.text());
    return m ? m[0] : null;
  } catch {
    return null;
  }
}

/** Existe versão nova? Só afirma quando as duas versões são conhecidas e diferentes. */
export const isNewVersion = (loaded: string | null, latest: string | null) => !!loaded && !!latest && loaded !== latest;
