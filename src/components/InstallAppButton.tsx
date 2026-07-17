/**
 * src/components/InstallAppButton.tsx
 * Floating install prompt with Heart Club logo thumbnail.
 */
import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "hc_install_dismissed_at";

const InstallAppButton = () => {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) return;

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < 1000 * 60 * 60 * 24 * 7) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setVisible(false);
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  if (!visible || !deferred) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9998] w-[92%] max-w-sm">
      <div className="glass-card rounded-2xl px-3 py-3 flex items-center gap-3 shadow-2xl border border-primary/40">
        <img
          src="/apple-touch-icon.png"
          alt="Heart Club"
          className="w-11 h-11 rounded-full object-cover ring-2 ring-primary shrink-0 bg-black"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground leading-tight">
            Instalar App do Heart Club
          </p>
          <p className="text-xs text-muted-foreground truncate">
            Acesso rápido na tela inicial do seu celular
          </p>
        </div>
        <button
          onClick={install}
          className="btn-orange-gradient rounded-full px-3 py-2 text-xs flex items-center gap-1 shrink-0"
          aria-label="Instalar"
        >
          <Download className="w-3.5 h-3.5" />
          Instalar
        </button>
        <button
          onClick={dismiss}
          className="text-muted-foreground hover:text-foreground p-1 shrink-0"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default InstallAppButton;
