/**
 * [CAMINHO/ARQUIVO]: src/components/dashboard/ClubBanner.tsx
 * Componente reutilizável de Banner + NavBar do clube.
 * Usado em Dashboard, Stats e Ambassadors.
 */

/* [MÓDULO: IMPORTS] */
import { useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Flame, BarChart3, Crown, Users, MapPin, Trophy } from "lucide-react";
import { ClubLogo } from "@/components/ClubLogo";
import { type TeamTheme, defaultTeamTheme } from "@/data/teamColors";
import type { ClubData } from "@/clubes-data";

/* [MÓDULO: TIPOS] */
interface ClubBannerProps {
  clubName: string | null;
  clubData: ClubData | null;
  /** Tema dinâmico vindo do hook useClubTheme */
  theme?: TeamTheme;
  profileName?: string | null;
  profileCity?: string | null;
  profileState?: string | null;
  ambassadorLevel?: string | null;
  pageLabel?: string;
  showProfileInfo?: boolean;
}

/* [MÓDULO: NAV ITEMS] */
const NAV_ITEMS = [
  { label: "MAPA DE CALOR", icon: Flame, path: "/mapa-calor" },
  { label: "ESTATÍSTICAS", icon: BarChart3, path: "/estatisticas" },
  { label: "RANKING", icon: Crown, path: "/estatisticas#ranking" },
  { label: "EMBAIXADORES", icon: Users, path: "/embaixadores" },
];

/* [MÓDULO: BUILD MARKER] */
const BUILD_SYNC_TAG = "2026-03-23-clubbanner-sync-01";

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

  /* [MÓDULO: ESTILIZAÇÃO DINÂMICA] */
  const theme = useMemo(() => getTeamTheme(clubName), [clubName]);
  const bannerTextColor = theme.textClass === "text-black" ? "#1a1a1a" : "#ffffff";

  const isActive = (path: string) => {
    if (path.includes("#")) {
      return location.pathname + location.hash === path;
    }
    return location.pathname === path;
  };

  return (
    <div data-build={BUILD_SYNC_TAG}>
      {/* [MÓDULO: UI DO BANNER] */}
      <section
        className="relative overflow-hidden rounded-t-[2.5rem] rounded-b-none h-[180px] sm:h-[200px] md:h-[240px] shadow-2xl flex items-center"
        style={{ backgroundColor: theme.primaryHex }}
      >
        {/* Faixas diagonais */}
        <div className="absolute inset-0 pointer-events-none">
          {theme.stripeColors.map((color, ci) => {
            const baseLeft = 50 + ci * 14;
            return (
              <div key={ci}>
                <div
                  className="absolute top-[-30%] h-[160%] rotate-[20deg]"
                  style={{ backgroundColor: color, opacity: 0.4, left: `${baseLeft}%`, width: "4px" }}
                />
                <div
                  className="absolute top-[-30%] h-[160%] rotate-[20deg]"
                  style={{ backgroundColor: color, opacity: 0.25, left: `${baseLeft + 2}%`, width: "14px" }}
                />
                <div
                  className="absolute top-[-30%] h-[160%] rotate-[20deg]"
                  style={{ backgroundColor: color, opacity: 0.14, left: `${baseLeft + 5}%`, width: "36px" }}
                />
              </div>
            );
          })}
        </div>

        {/* Conteúdo */}
        <div className="relative z-10 flex items-center justify-between w-full px-4 sm:px-6 md:px-12">
          {/* ESQUERDA: Escudo */}
          <div className="flex items-center gap-3 sm:gap-4 md:gap-6">
            <div
              className="w-[102px] h-[102px] sm:w-[134px] sm:h-[134px] md:w-[166px] md:h-[166px] rounded-full shadow-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: theme.secondaryHex, boxShadow: `0 0 24px ${theme.glow}` }}
            >
              <ClubLogo
                src={clubData?.logoUrl}
                alt={clubName || ""}
                className="w-[98%] h-[98%] object-contain rounded-full"
              />
            </div>

            {/* Info do torcedor (modo Dashboard) */}
            {showProfileInfo && (
              <div className="flex flex-col gap-0.5 sm:gap-1">
                <h2 className="font-semibold uppercase italic tracking-tight text-sm sm:text-base md:text-lg" style={{ color: bannerTextColor }}>
                  {profileName}
                </h2>
                <div className="flex items-center gap-1 text-[9px] sm:text-[10px] md:text-xs font-medium uppercase tracking-wider opacity-80" style={{ color: bannerTextColor }}>
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span>{profileCity}{profileState ? `, ${profileState}` : ""}</span>
                </div>
                <span className="flex items-center gap-1 text-[9px] sm:text-[10px] md:text-xs font-bold text-[#ff6200] uppercase italic">
                  <Trophy className="w-3 h-3" /> Embaixador {ambassadorLevel}
                </span>
              </div>
            )}

            {/* Page label mode (Stats, Ambassadors) */}
            {!showProfileInfo && (
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.26em] sm:text-xs" style={{ color: bannerTextColor }}>
                  {pageLabel || "HEART CLUB"}
                </p>
                <h1 className="max-w-[44vw] text-2xl font-black italic uppercase leading-none sm:text-3xl md:max-w-none md:text-5xl" style={{ color: bannerTextColor }}>
                  {clubName || "Clube não identificado"}
                </h1>
              </div>
            )}
          </div>

          {/* DIREITA: Nome do clube (modo Dashboard) */}
          {showProfileInfo && (
            <div className="text-right flex flex-col items-end">
              <span className="text-[8px] sm:text-[9px] md:text-[11px] font-bold uppercase tracking-[0.3em] opacity-60" style={{ color: bannerTextColor }}>
                Clube do Coração
              </span>
              <h1 className="font-black italic uppercase tracking-tight text-xl sm:text-2xl md:text-5xl leading-none mt-1" style={{ color: bannerTextColor }}>
                {clubName}
              </h1>
            </div>
          )}
        </div>
      </section>

      {/* [MÓDULO: NAVBAR — colada ao banner] */}
      <nav className="flex items-center justify-center gap-1 sm:gap-2 bg-[#1a1a1a] border border-white/5 border-t-0 rounded-t-none rounded-b-2xl px-2 sm:px-6 py-2.5 shadow-lg backdrop-blur-md">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className={`inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 rounded-xl text-[9px] sm:text-[11px] font-black uppercase tracking-wider transition-all duration-200 ${
              isActive(item.path)
                ? "bg-[#ff6200] text-white"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            <item.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default ClubBanner;
