/**
 * Botãozinho discreto no canto (SÓ no teste do Master): permite sair da simulação.
 * Fica FORA do layout (posição fixa), então a tela é idêntica à que o torcedor vê.
 */
import { FlaskConical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { clearPendingVote } from "@/lib/entry-flow";
import { useTranslationApp } from "@/hooks/useTranslationApp";

export default function SimBanner() {
  const { t } = useTranslationApp();
  const navigate = useNavigate();
  return (
    <button
      onClick={() => {
        clearPendingVote();
        navigate("/dashboard");
      }}
      className="fixed bottom-3 left-3 z-[90] flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase text-white/50 backdrop-blur hover:bg-white/20 hover:text-white"
      title="Teste do Master — nada é gravado"
    >
      <FlaskConical className="h-3 w-3" />
      {t("entrar.sim_exit")}
    </button>
  );
}
