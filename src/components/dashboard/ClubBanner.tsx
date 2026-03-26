/**
 * [CAMINHO/ARQUIVO]: src/components/dashboard/ClubBanner.tsx
 * [MÓDULO]: COMPONENTE GLOBAL DE BRANDING (BANNER + NAVBAR)
 * [STATUS]: PADRÃO VISUAL UNIFICADO (DASHBOARD/MAPA/STATS)
 */

/* [MÓDULO: IMPORTS] */
import { useNavigate, useLocation } from "react-router-dom";
import { Flame, BarChart3, Crown, Users, MapPin, Trophy, ShieldAlert } from "lucide-react";
import { ClubLogo } from "@/components/ClubLogo";
import { useUser } from "@/contexts/UserContext";
import { type TeamTheme, defaultTeamTheme } from "@/data/teamColors";

/* [MÓDULO: INTERFACE DE PROPS] */
interface ClubBannerProps {
  clubName: string | null;
  clubData: any;
  theme?: TeamTheme;
  profileName?: string | null;
  profileCity?: string | null;
  profileState?: string | null;
  ambassadorLevel?: string | null;
  pageLabel?: string;
  showProfileInfo?: boolean;
}

/* [MÓDULO: COMPONENTE PRINCIPAL] */
const ClubBanner = ({
  clubName,
  clubData,
  theme: themeProp,
  profileName,
  profileCity,
  profileState,
  ambassadorLevel = "Bronze",
  pageLabel,
  showProfileInfo = false,
}: ClubBannerProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();

  /* [MÓDULO: CONFIGURAÇÕES DE TEMA E SEGURANÇA] */
  const IS_MASTER = user?.email === "betoborelli9@gmail.com";
  const theme = themeProp || defaultTeamTheme;
  const bannerTextColor = theme.textClass === "text-black" ? "#1a1a1a" : "#ffffff";

  /* [MÓDULO: DEFINIÇÃO DE ITENS DA NAVBAR] */
  const NAV_ITEMS = [
    { label: "MAPA DE CALOR", icon: Flame, path: "/mapa-calor" },
    { label: "ESTATÍSTICAS", icon: BarChart3, path: "/estatisticas" },
    { label: "RANKING", icon: Crown, path: "/estatisticas#ranking" },
    { label: "EMBAIXADORES", icon: Users, path: "/embaixadores" },
  ];

  const isActive = (path: string) => location.pathname === path || location.pathname + location.hash === path;

  return (
    <div className="w-full space-y-0">
      {/* [MÓDULO: UI VISUAL DO BANNER] */}
      <section
        className="relative overflow-hidden rounded-t-[2.5rem] h-[180px] md:h-[240px] flex items-center shadow-2xl transition-colors duration-500"
        style={{ backgroundColor: theme.primaryHex }}
      >
        {/* CAMADA DE FAIXAS DIAGONAIS (OFICIAL) */}
        <div className="absolute inset-0 pointer-events-none opacity-30">
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(115deg, transparent 40%, ${theme.secondaryHex} 40%, ${theme.secondaryHex} 45%, transparent 45%, transparent 50%, ${theme.accentHex || theme.secondaryHex} 50%, ${theme.accentHex || theme.secondaryHex} 55%, transparent 55%)`,
              backgroundSize: "200% 100%",
            }}
          />
        </div>

        {/* [MÓDULO: CONTEÚDO DINÂMICO DO BANNER] */}
        <div className="relative z-10 flex items-center justify-between w-full px-6 md:px-12">
          <div className="flex items-center gap-6">
            {/* ESCUDO PADRONIZADO */}
            <div
              className="w-[102px] h-[102px] md:w-[166px] md:h-[166px] rounded-full bg-white flex items-center justify-center shadow-2xl border-4 border-white/10"
              style={{ boxShadow: `0 0 30px ${theme.primaryHex}66` }}
            >
              <ClubLogo
                src={clubData?.logoUrl || clubData?.logo}
                alt={clubName || ""}
                className="w-[85%] h-[85%] object-contain"
              />
            </div>

            {/* INFO DO USUÁRIO OU RÓTULO DA PÁGINA */}
            {showProfileInfo ? (
              <div className="flex flex-col">
                <h2
                  className="text-xl md:text-2xl font-black italic uppercase tracking-tight"
                  style={{ color: bannerTextColor }}
                >
                  {profileName}
                </h2>
                <div
                  className="flex items-center gap-1 text-xs font-bold opacity-70 uppercase"
                  style={{ color: bannerTextColor }}
                >
                  <MapPin size={12} /> {profileCity}
                  {profileState ? `, ${profileState}` : ""}
                </div>
                <div className="flex items-center gap-1 text-xs font-black text-[#ff6200] italic mt-1 uppercase">
                  <Trophy size={12} /> EMBAIXADOR {ambassadorLevel}
                </div>
              </div>
            ) : (
              <div className="flex flex-col">
                <p
                  className="text-[10px] md:text-xs font-black uppercase tracking-[0.4em] opacity-70"
                  style={{ color: bannerTextColor }}
                >
                  {pageLabel || "TERRITÓRIO DE EMBAIXADOR"}
                </p>
                <h1
                  className="text-3xl md:text-6xl font-black italic uppercase tracking-tighter leading-none"
                  style={{ color: bannerTextColor }}
                >
                  {clubName}
                </h1>
              </div>
            )}
          </div>

          {/* INDICADOR CLUBE DO CORAÇÃO (APENAS DASHBOARD) */}
          {showProfileInfo && (
            <div className="hidden md:flex flex-col items-end text-right">
              <span
                className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-50"
                style={{ color: bannerTextColor }}
              >
                Clube do Coração
              </span>
              <h1 className="text-4xl font-black italic uppercase" style={{ color: bannerTextColor }}>
                {clubName}
              </h1>
            </div>
          )}
        </div>
      </section>

      {/* [MÓDULO: NAVBAR INTEGRADA (BLOCO ÚNICO)] */}
      <nav className="flex items-center justify-center gap-1 bg-[#1a1a1a] border border-white/5 border-t-0 rounded-b-[1.5rem] px-2 py-3 shadow-xl">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all duration-300 ${isActive(item.path) ? "bg-[#ff6200] text-white shadow-[0_0_15px_rgba(255,98,0,0.3)]" : "text-white/40 hover:text-white hover:bg-white/5"}`}
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
 * STATUS: VERSÃO FINAL UNIFICADA.
 */
