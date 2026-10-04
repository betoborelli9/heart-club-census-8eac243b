/**
 * Botãozinho discreto no canto (SÓ no teste do Master, em qualquer página): sai do modo "torcedor novo".
 * Fica FORA do layout (posição fixa), então as telas são idênticas às que o torcedor vê.
 */
import { FlaskConical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { stopSim } from "@/lib/sim-fan";

export default function SimBanner() {
  const navigate = useNavigate();
  const { simActive } = useUser();
  if (!simActive) return null;
  return (
    <button
      onClick={() => {
        stopSim();
        navigate("/dashboard");
      }}
      className="fixed bottom-3 left-3 z-[2000] flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase text-white/50 backdrop-blur hover:bg-white/20 hover:text-white"
      title="Teste do Master — nada é gravado. Clique para voltar ao seu painel."
    >
      <FlaskConical className="h-3 w-3" />
      Sair do teste
    </button>
  );
}
