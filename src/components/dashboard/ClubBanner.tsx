/**
 * ARQUIVO: src/components/dashboard/ClubBanner.tsx
 * MÓDULO: BANNER MESTRE IMUTÁVEL (CORES DINÂMICAS + FAIXAS)
 * STATUS: PADRÃO GLOBAL ATIVADO (API FOOTBALL COMPATIBLE)
 */

import { useNavigate, useLocation } from "react-router-dom";
import { Flame, BarChart3, Trophy, Users, ShieldAlert, LayoutGrid } from "lucide-react";
import { ClubLogo } from "@/components/ClubLogo";
import { useUser } from "@/contexts/UserContext";
import { type TeamTheme, defaultTeamTheme } from "@/data/teamColors";

interface ClubBannerProps {
  clubName: string | null;
  clubData: any;
  theme: TeamTheme;
}

const ClubBanner = ({ clubName, clubData, theme = defaultTeamTheme }: ClubBannerProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();

  const IS_MASTER = user?.email === "betoborelli9@gmail.com";
  const isActive = (path: string) => location.pathname === path;

  // MÓDULO: NAVEGAÇÃO PADRONIZADA
  const NAV_ITEMS = [
    { label: "MAPA DE CALOR", icon: Flame, path: "/mapa-calor" },
    { label: "ESTATÍSTICAS", icon: BarChart3, path: "/estatisticas" },
    { label: "RANKING EMBAIXADOR", icon: Trophy, path: "/embaixadores" },
    { label: "CLUBES", icon: LayoutGrid, path: "/dashboard" },
  ];

  return (
    <div className="w-full space-y-0">
      {/* [MÓDULO VISUAL: BANNER DINÂMICO] */}
      <section
        className="relative overflow-hidden rounded-t-[2.5rem] h-[180px] md:h-[220px] flex items-center shadow-2xl transition-colors duration-500"
        style={{ backgroundColor: theme.primaryHex }}
      >
        {/* CAMADA DE FAIXAS DIAGONAIS (AUTOMÁTICO) */}
        <div className="absolute inset-0 pointer-events-none opacity-30">
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(115deg, transparent 40%, ${theme.secondaryHex} 40%, ${theme.secondaryHex} 45%, transparent 45%, transparent 50%, ${theme.accentHex || theme.secondaryHex} 50%, ${theme.accentHex || theme.secondaryHex} 55%, transparent 55%)`,
              backgroundSize: "200% 100%",
            }}
          />
        </div>

        {/* CONTEÚDO */}
        <div className="relative z-10 flex items-center justify-between w-full px-6 md:px-12">
          <div className="flex items-center gap-6">
            {/* ESCUDO COM GLOW DINÂMICO */}
            <div
              className="w-24 h-24 md:w-36 md:h-36 rounded-full bg-white flex items-center justify-center border-4 border-white/20 shadow-2xl"
              style={{ boxShadow: `0 0 30px ${theme.primaryHex}66` }}
            >
              <ClubLogo
                src={clubData?.logoUrl || clubData?.logo}
                alt={clubName || ""}
                className="w-[80%] h-[80%] object-contain"
              />
            </div>

            <div className="flex flex-col">
              <h1
                className={`text-3xl md:text-6xl font-black italic uppercase tracking-tighter leading-none ${theme.textClass}`}
              >
                {clubName || "CADASTRANDO..."}
              </h1>
              <p
                className={`text-[10px] md:text-xs font-bold uppercase tracking-[0.4em] mt-2 opacity-70 ${theme.textClass}`}
              >
                Território de Embaixador
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* [MÓDULO: NAVBAR UNIFICADA] */}
      <nav className="flex items-center justify-center gap-1 bg-[#151515] border border-white/5 border-t-0 rounded-b-[1.5rem] px-2 py-3 shadow-xl">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all duration-300 ${
              isActive(item.path)
                ? "bg-[#ff6200] text-white shadow-[0_0_15px_rgba(255,98,0,0.3)]"
                : "text-white/40 hover:text-white hover:bg-white/5"
            }`}
          >
            <item.icon size={14} />
            <span className="hidden md:inline">{item.label}</span>
          </button>
        ))}

        {IS_MASTER && (
          <button
            onClick={() => navigate("/admin")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase bg-red-600 text-white animate-pulse"
          >
            <ShieldAlert size={14} />
            <span className="hidden md:inline">PAINEL MASTER</span>
          </button>
        )}
      </nav>
    </div>
  );
};

export default ClubBanner;

/**
 * [RODAPÉ TÉCNICO]
 * ARQUIVO: src/components/dashboard/ClubBanner.tsx
 * MÓDULO: BANNER MESTRE IMUTÁVEL
 * VERIFICAÇÃO: SE VOCÊ ESTÁ VENDO ISSO, O ARQUIVO ESTÁ COMPLETO.
 */
