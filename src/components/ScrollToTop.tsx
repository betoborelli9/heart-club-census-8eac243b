/**
 * [CAMINHO]: src/components/ScrollToTop.tsx
 * [MÓDULO]: TODA página do Heart Club abre no TOPO. Num site de página única, o navegador mantém a rolagem da tela anterior
 * quando o torcedor muda de página (ex.: estava no meio do Ranking e abre os Jogos). Aqui a rolagem volta ao topo a cada troca
 * de página, inclusive ao voltar. Links com âncora (#...) mantêm o comportamento normal da âncora.
 */
import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname, search, hash } = useLocation();

  // O navegador não deve "lembrar" a rolagem sozinho (ele a restaura no lugar errado em páginas que carregam depois)
  useLayoutEffect(() => {
    try {
      if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
    } catch {
      /* navegador sem suporte: segue só com o scrollTo abaixo */
    }
  }, []);

  useLayoutEffect(() => {
    if (hash) return; // âncora (#secao): deixa o navegador levar até o ponto
    window.scrollTo({ top: 0, left: 0 });
    // contêineres que rolam no lugar da janela (alguns navegadores de aplicativo)
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname, search, hash]);

  return null;
}
