/**
 * [CAMINHO]: src/components/dashboard/ClubBanner.tsx
 * [MÓDULO]: COMPONENTE GLOBAL DE BRANDING (VISUAL PREMIUM REPLICADO)
 * [STATUS]: VERSÃO 13.0 - UPGRADE VISUAL (IMAGEM 2)
 * [DESCRIÇÃO]: Banner dinâmico com textura de tecido, gradiente diagonal e tipografia extra-bold italic.
 */

import { useNavigate, useLocation } from "react-router-dom";
import { Flame, BarChart3, Crown, Users, MapPin, Trophy, ShieldAlert, Vote, Bug } from "lucide-react";
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

  // Mapeamento de cores para o Gradiente Diagonal (Estilo Imagem 2)
  const primary = theme.primaryHex;
  const secondary = theme.secondaryHex;
  const tertiary = theme.accentHex || "#ffffff";

  const bannerStyle = {
    background: `linear-gradient(115deg, ${secondary} 0%, ${secondary} 35%, ${tertiary} 35%, ${tertiary} 42%, ${primary} 42%, ${primary} 100%)`,
  };

  const NAV_ITEMS = [
    { label: "MAPA DE CALOR", icon: Flame, path: "/mapa-calor" },
    { label: "ESTATÍSTICAS", icon: BarChart3, path: "/estatisticas" },
    { label: "RANKING", icon: Crown, path: "/estatisticas#ranking" },
    { label: "EMBAIXADORES", icon: Users, path: "/embaixadores" },
  ];

  const isActive = (path: string) => location.pathname === path || location.pathname + location.hash === path;

  return (
    <div className="w-full max-w-7xl mx-auto p-4 animate-in fade-in slide-in-from-top-4 duration-1000">
      <div
        className="relative h-[300px] md:h-[400px] w-full rounded-[48px] overflow-hidden shadow-[0_35px_60px_-15px_rgba(0,0,0,0.6)] border border-white/10 group"
        style={bannerStyle}
      >
        {/* [MÓDULO: TEXTURA DE TECIDO REALISTA] */}
        <div className="absolute inset-0 opacity-30 pointer-events-none mix-blend-overlay overflow-hidden">
          <svg width="100%" height="100%" className="absolute inset-0">
            <filter id="fabricTextureBanner">
              <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" stitchTiles="stitch" />
              <feDisplacementMap in="SourceGraphic" scale="20" />
            </filter>
            <rect width="100%" height="100%" filter="url(#fabricTextureBanner)" opacity="0.6" />
          </svg>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
        </div>

        {/* [MÓDULO: SOMBRAS DE PROFUNDIDADE] */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/40" />

        {/* [MÓDULO: CONTEÚDO PRINCIPAL] */}
        <div className="relative h-full w-full flex flex-col md:flex-row items-center justify-between px-8 md:px-16 py-10">
          {/* ESCUDO (Lado Esquerdo) */}
          <div className="flex items-center justify-center shrink-0">
            <div className="relative group-hover:scale-105 transition-transform duration-700 ease-out">
              <div
                className="absolute -inset-8 blur-3xl rounded-full opacity-30 group-hover:opacity-50 transition-opacity"
                style={{ backgroundColor: tertiary }}
              />
              <div className="w-32 h-32 md:w-56 md:h-56 flex items-center justify-center">
                <ClubLogo
                  src={clubData?.logoUrl || clubData?.logo}
                  alt={clubName || ""}
                  className="w-full h-full object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.6)]"
                />
              </div>
            </div>
          </div>

          {/* INFORMAÇÕES (Centro/Direita) */}
          <div className="flex flex-col items-center md:items-start text-white gap-1 z-10">
            {showProfileInfo ? (
              <>
                <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter drop-shadow-lg">
                  {profileName || "Beto Borelli"}
                </h2>
                <div className="flex flex-col md:flex-row items-center gap-2 md:gap-6 text-xs md:text-sm font-bold uppercase italic opacity-90">
                  <span className="flex items-center gap-1.5">
                    <MapPin size={16} />
                    {profileCity || "Goiânia"}, {profileState || "GO"}
                  </span>
                  <span className="flex items-center gap-1.5 text-orange-400 drop-shadow-md">
                    <Trophy size={16} />
                    EMBAIXADOR {ambassadorLevel}
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center md:text-left">
                <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.4em] opacity-70 mb-1">
                  {pageLabel || "TERRITÓRIO DE EMBAIXADOR"}
                </p>
                <h1 className="text-4xl md:text-7xl font-black italic uppercase tracking-tighter leading-none drop-shadow-xl">
                  {clubName}
                </h1>
              </div>
            )}
          </div>

          {/* IDENTIDADE DO CLUBE (Extrema Direita) */}
          {showProfileInfo && (
            <div className="hidden lg:flex flex-col items-end text-white text-right z-10">
              <span className="text-xs font-black uppercase italic opacity-80 tracking-[0.3em] mb-[-6px]">
                Clube do Coração
              </span>
              <h1 className="text-5xl lg:text-7xl font-black italic uppercase tracking-tighter leading-none drop-shadow-2xl">
                {clubName}
              </h1>
            </div>
          )}
        </div>

        {/* [MÓDULO: NAVBAR FLUTUANTE (BOTTOM)] */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[95%] md:w-auto">
          <nav className="flex items-center justify-center gap-1 md:gap-3 p-2 bg-black/50 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl overflow-x-auto no-scrollbar">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-500 whitespace-nowrap group/item
                  ${
                    isActive(item.path)
                      ? "bg-[#ff6200] text-white shadow-[0_0_20px_rgba(255,98,0,0.4)]"
                      : "text-white/50 hover:text-white hover:bg-white/10"
                  }`}
              >
                <item.icon
                  size={16}
                  className={isActive(item.path) ? "animate-pulse" : "group-hover/item:scale-110 transition-transform"}
                />
                <span className="text-[10px] font-black italic uppercase tracking-widest hidden md:block">
                  {item.label}
                </span>
              </button>
            ))}

            {/* LINKS ADMINISTRATIVOS */}
            {IS_MASTER && (
              <>
                <button
                  onClick={() => navigate("/voting")}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase text-[#ff6200] border border-[#ff6200]/30 hover:bg-[#ff6200]/10 transition-all"
                >
                  <Vote size={16} />
                  <span className="hidden md:block italic">VOTAÇÃO</span>
                </button>
                <button
                  onClick={() => navigate("/admin")}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase bg-red-600/80 text-white hover:bg-red-600 transition-all animate-pulse"
                >
                  <ShieldAlert size={16} />
                  <span className="hidden md:block italic">PAINEL</span>
                </button>
              </>
            )}
          </nav>
        </div>
      </div>
    </div>
  );
};

export default ClubBanner;

/**
 * [RODAPÉ TÉCNICO]
 * ARQUIVO: src/components/dashboard/ClubBanner.tsx
 * VERSÃO: 13.0 (IMAGEM 2 STYLE)
 * MODIFICAÇÕES:
 * - Fusão da estética Premium (gradiente 115deg, textura) com a lógica de props do sistema.
 * - Navbar integrada como barra flutuante interna ao banner.
 * - Suporte a cores dinâmicas via theme.primaryHex, secondaryHex e accentHex.
 */
