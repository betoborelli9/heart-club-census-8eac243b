/**
 * src/components/InstallAppButton.tsx
 * Floating install prompt with Heart Club logo thumbnail.
 * - Android/Chrome: usa beforeinstallprompt + modal de alertas de dia de jogo.
 * - iOS: força exibição; Safari mostra passo a passo curto, outros navegadores
 *   redirecionam para x-web-search:// com o site pronto.
 */
import { useEffect, useState, useMemo } from "react";
import { Download, X, Share, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ensurePushSubscription } from "@/lib/push";

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "hc_install_dismissed_at";
const ALERTS_PREF_KEY = "hc_gameday_alerts_pref";
const SITE_URL = "votenoseuclube.com.br";

const isIOSDevice = () => {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent || "";
  const iOSUA = /iPhone|iPad|iPod/i.test(ua);
  const iPadOS =
    ua.includes("Mac") && typeof document !== "undefined" && "ontouchend" in document;
  return iOSUA || iPadOS;
};

const isSafariIOS = () => {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent || "";
  // Safari no iOS não contém CriOS (Chrome), FxiOS (Firefox), EdgiOS (Edge) etc.
  return (
    /iPhone|iPad|iPod/i.test(ua) &&
    /Safari/i.test(ua) &&
    !/CriOS|FxiOS|EdgiOS|OPiOS|Mercury/i.test(ua)
  );
};

const isStandaloneMode = () => {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
};

const InstallAppButton = () => {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [askAlerts, setAskAlerts] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [busy, setBusy] = useState(false);

  const safariIOS = useMemo(() => isSafariIOS(), []);

  useEffect(() => {
    if (isStandaloneMode()) return;

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < 1000 * 60 * 60 * 24 * 7) return;

    // iOS: mostra imediatamente (sem esperar beforeinstallprompt, que nunca dispara)
    if (isIOSDevice()) {
      setIsIOS(true);
      setVisible(true);
      return;
    }

    // Android/Chrome: aguarda beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const triggerNativeInstall = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } finally {
      setDeferred(null);
      setVisible(false);
      setAskAlerts(false);
      setBusy(false);
    }
  };

  const handleInstallClick = () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }
    if (!deferred) return;
    setAskAlerts(true);
  };

  const handleAlertsYes = async () => {
    setBusy(true);
    try {
      localStorage.setItem(ALERTS_PREF_KEY, "yes");
      try {
        await ensurePushSubscription();
      } catch {
        /* mantém fluxo mesmo se push falhar */
      }
    } finally {
      await triggerNativeInstall();
    }
  };

  const handleAlertsNo = async () => {
    setBusy(true);
    localStorage.setItem(ALERTS_PREF_KEY, "no");
    await triggerNativeInstall();
  };

  const handleIOSConfirm = () => {
    if (safariIOS) {
      setShowIOSGuide(false);
      return;
    }
    // Chrome/outros no iOS: abre o motor de busca nativo da Apple com o site
    window.location.href = `x-web-search://${SITE_URL}`;
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  if (!visible) return null;
  // Android exige o evento diferido; iOS ignora essa checagem
  if (!isIOS && !deferred) return null;

  return (
    <>
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
              {isIOS
                ? "Adicione à Tela de Início do seu iPhone"
                : "Acesso rápido na tela inicial do seu celular"}
            </p>
          </div>
          <button
            onClick={handleInstallClick}
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

      {/* Android: opt-in de alertas antes do install nativo */}
      <Dialog open={askAlerts} onOpenChange={(o) => !busy && setAskAlerts(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="italic">Alertas nos dias de jogo</DialogTitle>
            <DialogDescription>
              Quer receber alertas e notícias nos dias de jogos do seu time do coração?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={handleAlertsNo} disabled={busy}>
              Não
            </Button>
            <Button
              onClick={handleAlertsYes}
              disabled={busy}
              className="bg-[#ff6200] hover:bg-[#ff6200]/90 text-white"
            >
              Sim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* iOS: modal enxuto — Safari mostra 2 passos, outros navegadores redirecionam */}
      <Dialog open={showIOSGuide} onOpenChange={setShowIOSGuide}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="italic">
              {safariIOS ? "Adicionar à Tela de Início" : "Abrir no Safari"}
            </DialogTitle>
            <DialogDescription>
              {safariIOS
                ? "2 toques e pronto."
                : "Para instalar no iPhone, abra este site no Safari."}
            </DialogDescription>
          </DialogHeader>

          {safariIOS && (
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-black/40 p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white text-sm font-bold">
                  1
                </div>
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  Toque <Share className="w-4 h-4 text-primary" /> Compartilhar
                </p>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-black/40 p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white text-sm font-bold">
                  2
                </div>
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  Toque <Plus className="w-4 h-4 text-primary" /> Adicionar
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              onClick={handleIOSConfirm}
              className="bg-[#ff6200] hover:bg-[#ff6200]/90 text-white w-full"
            >
              {safariIOS ? "Entendi" : "Abrir no Safari"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InstallAppButton;
