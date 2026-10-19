/**
 * [CAMINHO]: src/components/UpdateBanner.tsx
 * [MÓDULO]: Aviso discreto "Nova versão disponível" com botão Atualizar. Confere ao abrir a janela, quando o torcedor volta para ela
 * e a cada 5 minutos. Nunca recarrega sozinho (não interrompe votação nem formulário): só atualiza quando o torcedor toca no botão.
 */
import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useTranslationApp } from "@/hooks/useTranslationApp";
import { isNewVersion, latestBuild, loadedBuild } from "@/lib/app-update";

export const CHECK_EVERY_MS = 5 * 60 * 1000;

export default function UpdateBanner() {
  const { t } = useTranslationApp();
  const [available, setAvailable] = useState(false);
  const mine = useRef<string | null>(null);

  useEffect(() => {
    mine.current = loadedBuild();
    if (!mine.current) return; // desenvolvimento/teste: não há versão publicada para comparar
    let alive = true;
    const check = async () => {
      const latest = await latestBuild();
      if (alive && isNewVersion(mine.current, latest)) setAvailable(true);
    };
    void check();
    const id = setInterval(() => {
      if (!document.hidden) void check();
    }, CHECK_EVERY_MS);
    const onVisible = () => {
      if (!document.hidden) void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);

  if (!available) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[1000] flex justify-center px-4" data-testid="update-banner">
      <div className="pointer-events-auto flex max-w-md items-center gap-3 rounded-full border border-[#ff6200]/60 bg-black/95 py-2 pl-4 pr-2 text-white shadow-[0_8px_30px_rgba(255,98,0,0.35)]">
        <span className="text-[12px] font-semibold leading-tight">{t("update.available")}</span>
        <button
          onClick={() => window.location.reload()}
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-[#ff6200] px-4 text-[12px] font-black uppercase text-black active:scale-95"
          data-testid="update-reload"
        >
          <RefreshCw className="h-4 w-4" /> {t("update.action")}
        </button>
      </div>
    </div>
  );
}
