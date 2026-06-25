/**
 * [CAMINHO]: src/components/MasterTestPanel.tsx
 * [MÓDULO]: Painel flutuante exclusivo do Master Admin para disparar,
 *           sob demanda, os "containers de primeira vez" (votação,
 *           identidade, endereço do Mapa de Calor, censo de Embaixador).
 * [REGRA]: Visível APENAS para betoborelli9@gmail.com. Não interfere
 *          em nenhum fluxo do torcedor comum.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FlaskConical, Vote, Map as MapIcon, Users, BarChart3, UserCog, X, ChevronUp } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { isMasterEmail } from "@/lib/master";

const ITEMS = [
  { label: "Editar meus dados (cidade, bairro…)", icon: UserCog, to: "/master/perfil" },
  { label: "Testar Votação (1ª vez)", icon: Vote, to: "/voting?test=1" },
  { label: "Testar Mapa de Calor (1ª vez)", icon: MapIcon, to: "/mapa-calor?force_onboarding=1" },
  { label: "Testar Embaixador (1ª vez)", icon: Users, to: "/embaixadores?force_onboarding=1" },
  { label: "Testar Ranking (1ª vez)", icon: BarChart3, to: "/ranking?force_onboarding=1" },
];

export default function MasterTestPanel() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!isMasterEmail(user?.email)) return null;

  return (
    <div className="fixed bottom-24 right-4 z-[200] md:bottom-20 md:right-6 print:hidden">
      {open ? (
        <div className="w-72 rounded-2xl border border-[#ff6200]/40 bg-black/90 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
            <div className="flex items-center gap-2 text-[#ff6200]">
              <FlaskConical className="w-4 h-4" />
              <span className="text-[11px] font-black italic uppercase tracking-widest">
                Master · Modo Teste
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/60 hover:text-white"
              aria-label="Fechar painel de testes"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <ul className="p-2 space-y-1">
            {ITEMS.map(({ label, icon: Icon, to }) => (
              <li key={to}>
                <button
                  onClick={() => {
                    setOpen(false);
                    navigate(to);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs italic font-bold text-white/90 hover:bg-[#ff6200]/15 hover:text-white"
                >
                  <Icon className="w-4 h-4 text-[#ff6200] shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="px-3 pb-3 text-[10px] italic text-white/40 leading-snug">
            Disparos manuais. Seu voto e seu perfil não são alterados.
          </p>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-full bg-[#ff6200] text-black shadow-xl hover:brightness-110"
          aria-label="Abrir painel de testes master"
        >
          <FlaskConical className="w-4 h-4" />
          <span className="text-[10px] font-black italic uppercase tracking-widest">Master</span>
          <ChevronUp className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
