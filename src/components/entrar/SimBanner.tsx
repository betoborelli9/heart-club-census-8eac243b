/** Faixa fixa no topo da simulação do Master: deixa claro que NADA é gravado. */
import { FlaskConical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { clearPendingVote } from "@/lib/entry-flow";
import { useTranslationApp } from "@/hooks/useTranslationApp";

export default function SimBanner() {
  const { t } = useTranslationApp();
  const navigate = useNavigate();
  return (
    <div className="sticky top-0 z-[70] flex items-center justify-center gap-3 bg-red-600 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-white">
      <FlaskConical className="h-4 w-4 shrink-0" />
      <span className="min-w-0 text-center">{t("entrar.sim_banner")}</span>
      <button
        onClick={() => {
          clearPendingVote();
          navigate("/dashboard");
        }}
        className="shrink-0 rounded-full bg-white/20 px-3 py-1 hover:bg-white/30"
      >
        {t("entrar.sim_exit")}
      </button>
    </div>
  );
}
