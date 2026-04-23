/**
 * [CAMINHO]: src/components/dashboard/ClubBanner.tsx
 * [MÓDULO]: BANNER UNIFICADO DO CLUBE (TRICOLOR DIAGONAL + NAVBAR)
 * [STATUS]: VERSÃO 15.0 — Layout fiel à descrição (faixas diagonais, escudo em círculo,
 *           identidade do torcedor à esquerda, "CLUBE DO CORAÇÃO" à direita,
 *           navbar inferior com Mapa/Stats/Ranking/Embaixadores + extras Master).
 * [REGRA]: Não altera contrato público — apenas adiciona props opcionais (clubData, theme,
 *          pageLabel) para compatibilidade com Dashboard.tsx e Ambassadors.tsx.
 */

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Flame,
  BarChart3,
  Crown,
  Users,
  MapPin,
  Trophy,
  ShieldAlert,
  Vote,
  Bug,
} from "lucide-react";
import { ClubLogo } from "@/components/ClubLogo";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";

/* ═══════════════════════════════════════════════════════════
    MÓDULO: INTERFACE DE PROPS
   ═══════════════════════════════════════════════════════════ */
interface ClubBannerProps {
  clubName: string | null;
  profileName?: string | null;
  profileCity?: string | null;
  profileState?: string | null;
  ambassadorLevel?: string | null;
  showProfileInfo?: boolean;
  /** Compat: dados do clube vindos do contexto/CLUBS_DATA (não obrigatório) */
  clubData?: any;
  /** Compat: tema externo (sobrescreve cores do Supabase quando fornecido) */
  theme?: {
    primaryHex?: string;
    secondaryHex?: string;
    accentHex?: string;
  } | null;
  /** Compat: rótulo opcional da página (Embaixadores, etc.) */
  pageLabel?: string;
}

const ClubBanner = ({
  clubName,
  profileName,
  profileCity,
  profileState,
  ambassadorLevel = "Bronze",
  showProfileInfo = true,
  clubData,
  theme: externalTheme,
  pageLabel,
}: ClubBannerProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();

  /* ═══════════════════════════════════════════════════════════
      MÓDULO: ESTADO DE TEMA (Supabase clubes_cache)
     ═══════════════════════════════════════════════════════════ */
  const [theme, setTheme] = useState({
    cor_primaria: "#c8102e", // vermelho fallback
    cor_secundaria: "#0a0a0a", // preto
    cor_terciaria: "#ffffff", // branco
    escudo_url: "",
  });

  const IS_MASTER = user?.email === "betoborelli9@gmail.com";

  useEffect(() => {
    const fetchClubTheme = async () => {
      if (!clubName) return;

      const { data, error } = await supabase
        .from("clubes_cache")
        .select("cor_primaria, cor_secundaria, cor_terciaria, escudo_url")
        .ilike("nome", `%${clubName}%`)
        .limit(1)
        .single();

      if (!error && data) {
        setTheme({
          cor_primaria: externalTheme?.primaryHex || data.cor_primaria || "#c8102e",
          cor_secundaria: externalTheme?.secondaryHex || data.cor_secundaria || "#0a0a0a",
          cor_terciaria: externalTheme?.accentHex || data.cor_terciaria || "#ffffff",
          escudo_url: data.escudo_url || clubData?.logoUrl || clubData?.logo || "",
        });
      } else if (externalTheme) {
        setTheme((t) => ({
          ...t,
          cor_primaria: externalTheme.primaryHex || t.cor_primaria,
          cor_secundaria: externalTheme.secondaryHex || t.cor_secundaria,
          cor_terciaria: externalTheme.accentHex || t.cor_terciaria,
          escudo_url: clubData?.logoUrl || clubData?.logo || t.escudo_url,
        }));
      }
    };
    fetchClubTheme();
  }, [clubName, externalTheme, clubData]);

  /* ═══════════════════════════════════════════════════════════
      MÓDULO: ESTILIZAÇÃO — FAIXAS DIAGONAIS TRICOLOR
     ═══════════════════════════════════════════════════════════ */
  const bannerStyle = {
    background: `linear-gradient(115deg,
      ${theme.cor_primaria} 0%,
      ${theme.cor_primaria} 30%,
      ${theme.cor_secundaria} 30%,
      ${theme.cor_secundaria} 55%,
      ${theme.cor_terciaria} 55%,
      ${theme.cor_terciaria} 62%,
      ${theme.cor_primaria} 62%,
      ${theme.cor_primaria} 100%)`,
  };

  /* ═══════════════════════════════════════════════════════════
      MÓDULO: NAV ITEMS
     ═══════════════════════════════════════════════════════════ */
  const NAV_ITEMS = [
    { label: "MAPA DE CALOR", icon: Flame, path: "/mapa-calor" },
    { label: "ESTATÍSTICAS", icon: BarChart3, path: "/estatisticas" },
    { label: "RANKING", icon: Crown, path: "/estatisticas#ranking" },
    { label: "EMBAIXADORES", icon: Users, path: "/embaixadores" },
  ];

  const isActive = (path: string) =>
    location.pathname === path || location.pathname + location.hash === path;

  return (
    <div className="w-full max-w-7xl mx-auto p-4 animate-in fade-in slide-in-from-top-4 duration-1000">
      <div
        className="relative h-[340px] md:h-[440px] w-full rounded-[40px] overflow-hidden shadow-[0_35px_60px_-15px_rgba(0,0,0,0.7)] border border-white/10 group"
        style={bannerStyle}
      >
        {/* [MÓDULO: TEXTURA TÊXTIL] */}
        <div className="absolute inset-0 opacity-30 pointer-events-none mix-blend-overlay overflow-hidden">
          <svg width="100%" height="100%" className="absolute inset-0">
            <filter id="fabricTextureBanner">
              <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" stitchTiles="stitch" />
              <feDisplacementMap in="SourceGraphic" scale="20" />
            </filter>
            <rect width="100%" height="100%" filter="url(#fabricTextureBanner)" opacity="0.5" />
          </svg>
        </div>

        {/* SOMBRAS DE PROFUNDIDADE */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/50 pointer-events-none" />

        {/* [MÓDULO: CONTEÚDO PRINCIPAL] */}
        <div className="relative h-full w-full flex flex-col md:flex-row items-center justify-between px-6 md:px-16 pt-10 pb-28">
          {/* ESCUDO EM CÍRCULO BRANCO (Esquerda) */}
          <div className="flex items-center gap-5 md:gap-8 shrink-0">
            <div className="relative">
              <div
                className="absolute -inset-6 blur-[60px] rounded-full opacity-50"
                style={{ backgroundColor: theme.cor_terciaria }}
              />
              <div className="relative w-28 h-28 md:w-44 md:h-44 rounded-full bg-white border-[6px] border-white shadow-[0_15px_40px_rgba(0,0,0,0.5)] flex items-center justify-center overflow-hidden">
                <ClubLogo
                  src={theme.escudo_url}
                  alt={clubName || ""}
                  className="w-[80%] h-[80%] object-contain"
                />
              </div>
            </div>

            {/* INFORMAÇÕES DO PERFIL */}
            {showProfileInfo && (
              <div className="flex flex-col text-white gap-1.5 z-10">
                <h2 className="text-2xl md:text-4xl font-black italic uppercase tracking-tight leading-none drop-shadow-[0_4px_4px_rgba(0,0,0,0.7)]">
                  {profileName || "Beto Borelli"}
                </h2>
                <span className="flex items-center gap-1.5 text-xs md:text-sm font-bold uppercase italic">
                  <MapPin size={16} className="text-red-500 drop-shadow" />
                  {(profileCity || "Goiânia").toUpperCase()} - {(profileState || "GO").toUpperCase()}
                </span>
                <span className="flex items-center gap-1.5 text-xs md:text-sm font-black uppercase italic text-amber-400 drop-shadow">
                  <Trophy size={16} className="text-amber-400" />
                  EMBAIXADOR {(ambassadorLevel || "BRONZE").toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* IDENTIDADE DO CLUBE (Direita) */}
          <div className="hidden md:flex flex-col items-end text-white text-right z-10">
            <span className="text-[10px] md:text-xs font-black uppercase italic opacity-80 tracking-[0.4em]">
              {pageLabel ? pageLabel : "Clube do Coração"}
            </span>
            <h1 className="text-4xl md:text-7xl font-black italic uppercase tracking-tighter leading-none drop-shadow-[0_15px_15px_rgba(0,0,0,0.7)]">
              {clubName}
            </h1>
          </div>
        </div>

        {/* [MÓDULO: NAVBAR INFERIOR] */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[96%] md:w-auto">
          <nav className="flex items-center justify-center gap-1.5 md:gap-2 p-2 bg-black/75 backdrop-blur-3xl rounded-2xl border border-white/10 shadow-2xl overflow-x-auto no-scrollbar">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-2 px-3 md:px-4 py-2.5 rounded-xl transition-all duration-300 whitespace-nowrap group/item
                  ${
                    isActive(item.path)
                      ? "bg-[#ff6200] text-white shadow-[0_0_20px_rgba(255,98,0,0.5)]"
                      : "text-white/60 hover:text-white hover:bg-white/10"
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

            {/* VOTAÇÃO — destaque laranja */}
            <button
              onClick={() => navigate("/voting")}
              className="flex items-center gap-2 px-3 md:px-4 py-2.5 rounded-xl text-[10px] font-black italic uppercase text-[#ff6200] border border-[#ff6200]/40 hover:bg-[#ff6200]/10 transition-all whitespace-nowrap"
            >
              <Vote size={16} />
              <span className="hidden md:block tracking-widest">VOTAÇÃO</span>
            </button>

            {/* LINKS ADMINISTRATIVOS — Master Only */}
            {IS_MASTER && (
              <>
                <button
                  onClick={() => navigate("/debug-api")}
                  className="flex items-center gap-2 px-3 md:px-4 py-2.5 rounded-xl text-[10px] font-black italic uppercase text-white/70 border border-white/10 hover:bg-white/10 transition-all whitespace-nowrap"
                >
                  <Bug size={16} />
                  <span className="hidden md:block tracking-widest">DEBUG API</span>
                </button>
                <button
                  onClick={() => navigate("/admin")}
                  className="flex items-center gap-2 px-3 md:px-4 py-2.5 rounded-xl text-[10px] font-black italic uppercase bg-red-600 text-white hover:bg-red-700 transition-all animate-pulse whitespace-nowrap shadow-[0_0_20px_rgba(220,38,38,0.5)]"
                >
                  <ShieldAlert size={16} />
                  <span className="hidden md:block tracking-widest">PAINEL MASTER</span>
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
 * VERSÃO: 15.0
 * MUDANÇAS:
 *  - Layout fiel à descrição: escudo em círculo branco à esquerda + nome/cidade/embaixador,
 *    "CLUBE DO CORAÇÃO" + nome do clube à direita, navbar inferior com Mapa, Stats,
 *    Ranking, Embaixadores, Votação (laranja) e Painel Master (vermelho pulsante).
 *  - Faixas diagonais tricolor parametrizadas pelas cores do clubes_cache.
 *  - Props clubData/theme/pageLabel adicionadas como opcionais (corrige build).
 */
