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

createRoot(document.getElementById("root")!).render(<App />);
