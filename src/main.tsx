import { createRoot } from "react-dom/client";
import "./i18n";
import App from "./App.tsx";
import "./index.css";

// Registro incondicional do Service Worker — só habilita instalabilidade
// PWA e deixa pronto para push; não pede permissão nem cacheia nada (ver
// public/sw.js). Sem isso, a maioria dos visitantes nunca registra o SW,
// já que hoje ele só é chamado ao ativar notificações.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

// Depois de uma publicação, a janela antiga pode tentar abrir uma tela cujo arquivo já foi trocado: recarrega uma vez para pegar a versão nova
window.addEventListener("vite:preloadError", () => {
  try {
    if (sessionStorage.getItem("hc-preload-reload")) return; // nunca em loop
    sessionStorage.setItem("hc-preload-reload", "1");
  } catch {
    /* sem armazenamento: recarrega mesmo assim, uma vez por abertura */
  }
  window.location.reload();
});

createRoot(document.getElementById("root")!).render(<App />);
