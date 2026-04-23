/**
 * [CAMINHO]: src/components/dashboard/ClubBanner.tsx
 * [MÓDULO]: COMPONENTE GLOBAL DE BRANDING (VISUAL PREMIUM REPLICADO)
 * [STATUS]: VERSÃO 14.0 - TRICOLOR AUTO-THEME + TECIDO (IMAGEM 2)
 * [DESCRIÇÃO]: Banner dinâmico com busca de cores no Supabase, textura de tecido realista
 * e layout diagonal baseado na referência visual de alta performance.
 */

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Flame, BarChart3, Crown, Users, MapPin, Trophy, ShieldAlert, Vote, Bug } from "lucide-react";
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
}

const ClubBanner = ({
  clubName,
  profileName,
  profileCity,
  profileState,
  ambassadorLevel = "Bronze",
  showProfileInfo = true,
}: ClubBannerProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();

  /* ═══════════════════════════════════════════════════════════
      MÓDULO: ESTADOS E CONFIGURAÇÕES DE TEMA
     ═══════════════════════════════════════════════════════════ */
  const [theme, setTheme] = useState({
    cor_primaria: "#1a1a1a",
    cor_secundaria: "#111111",
    cor_terciaria: "#ffffff",
    escudo_url: "",
  });

  const IS_MASTER = user?.email === "betoborelli9@gmail.com";

  /* ═══════════════════════════════════════════════════════════
      MÓDULO: BUSCA DE CORES NO SUPABASE (AUTO-THEME)
     ═══════════════════════════════════════════════════════════ */
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
          cor_primaria: data.cor_primaria || "#ff6200",
          cor_secundaria: data.cor_secundaria || "#1a1a1a",
          cor_terciaria: data.cor_terciaria || "#ffffff",
          escudo_url: data.escudo_url || "",
        });
      }
    };
    fetchClubTheme();
  }, [clubName]);

  /* ═══════════════════════════════════════════════════════════
      MÓDULO: ESTILIZAÇÃO DINÂMICA (GRADIENTE DIAGONAL)
     ═══════════════════════════════════════════════════════════ */
  const bannerStyle = {
    background: `linear-gradient(115deg, ${theme.cor_secundaria} 0%, ${theme.cor_secundaria} 35%, ${theme.cor_terciaria} 35%, ${theme.cor_terciaria} 42%, ${theme.cor_primaria} 42%, ${theme.cor_primaria} 100%)`,
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
        className="relative h-[320px] md:h-[420px] w-full rounded-[48px] overflow-hidden shadow-[0_35px_60px_-15px_rgba(0,0,0,0.7)] border border-white/10 group"
        style={bannerStyle}
      >
        {/* [MÓDULO: TEXTURA DE TECIDO REALISTA - SVG FILTER] */}
        <div className="absolute inset-0 opacity-40 pointer-events-none mix-blend-overlay overflow-hidden">
          <svg width="100%" height="100%" className="absolute inset-0">
            <filter id="fabricTextureBanner">
              <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" stitchTiles="stitch" />
              <feDisplacementMap in="SourceGraphic" scale="25" />
            </filter>
            <rect width="100%" height="100%" filter="url(#fabricTextureBanner)" opacity="0.6" />
          </svg>
          {/* Overlay de micro-trama para aspecto têxtil */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
        </div>

        {/* SOMBRAS DE PROFUNDIDADE */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-transparent to-black/50" />

        {/* [MÓDULO: CONTEÚDO PRINCIPAL] */}
        <div className="relative h-full w-full flex flex-col md:flex-row items-center justify-between px-10 md:px-20 py-12">
          {/* ESCUDO (Lado Esquerdo - Com Brilho Atmosférico) */}
          <div className="flex items-center justify-center shrink-0">
            <div className="relative group-hover:scale-110 transition-transform duration-1000 ease-out">
              <div
                className="absolute -inset-10 blur-[80px] rounded-full opacity-40 group-hover:opacity-60 transition-opacity"
                style={{ backgroundColor: theme.cor_terciaria }}
              />
              <div className="w-40 h-40 md:w-64 md:h-64 flex items-center justify-center">
                <ClubLogo
                  src={theme.escudo_url}
                  alt={clubName || ""}
                  className="w-full h-full object-contain drop-shadow-[0_35px_45px_rgba(0,0,0,0.8)]"
                />
              </div>
            </div>
          </div>

          {/* INFORMAÇÕES (Centro - Tipografia Premium) */}
          <div className="flex flex-col items-center md:items-start text-white gap-1 z-10">
            {showProfileInfo ? (
              <>
                <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter drop-shadow-[0_4px_4px_rgba(0,0,0,0.6)]">
                  {profileName || "Beto Borelli"}
                </h2>
                <div className="flex flex-col md:flex-row items-center gap-2 md:gap-6 text-sm font-bold uppercase italic opacity-90">
                  <span className="flex items-center gap-1.5">
                    <MapPin size={18} className="text-white" />
                    {profileCity || "Goiânia"}, {profileState || "GO"}
                  </span>
                  <span className="flex items-center gap-1.5 text-orange-400 drop-shadow-md">
                    <Trophy size={18} />
                    EMBAIXADOR {ambassadorLevel}
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center md:text-left">
                <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.4em] opacity-70 mb-1">
                  TERRITÓRIO DE EMBAIXADOR
                </p>
                <h1 className="text-5xl md:text-8xl font-black italic uppercase tracking-tighter leading-none drop-shadow-[0_10px_10px_rgba(0,0,0,0.6)]">
                  {clubName}
                </h1>
              </div>
            )}
          </div>

          {/* IDENTIDADE DO CLUBE (Extrema Direita) */}
          {showProfileInfo && (
            <div className="hidden lg:flex flex-col items-end text-white text-right z-10">
              <span className="text-sm font-black uppercase italic opacity-80 tracking-[0.4em] mb-[-8px]">
                Clube do Coração
              </span>
              <h1 className="text-6xl lg:text-8xl font-black italic uppercase tracking-tighter leading-none drop-shadow-[0_15px_15px_rgba(0,0,0,0.7)]">
                {clubName}
              </h1>
            </div>
          )}
        </div>

        {/* [MÓDULO: NAVBAR FLUTUANTE (BOTTOM)] */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[95%] md:w-auto">
          <nav className="flex items-center justify-center gap-2 md:gap-4 p-2.5 bg-black/60 backdrop-blur-3xl rounded-3xl border border-white/10 shadow-2xl overflow-x-auto no-scrollbar">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl transition-all duration-500 whitespace-nowrap group/item
                  ${
                    isActive(item.path)
                      ? "bg-[#ff6200] text-white shadow-[0_0_25px_rgba(255,98,0,0.5)]"
                      : "text-white/40 hover:text-white hover:bg-white/10"
                  }`}
              >
                <item.icon
                  size={18}
                  className={isActive(item.path) ? "animate-pulse" : "group-hover/item:scale-110 transition-transform"}
                />
                <span className="text-[11px] font-black italic uppercase tracking-widest hidden md:block">
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
                  <Vote size={18} />
                  <span className="hidden md:block italic">VOTAÇÃO</span>
                </button>
                <button
                  onClick={() => navigate("/admin")}
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl text-[11px] font-black uppercase bg-red-600 text-white hover:bg-red-700 transition-all animate-pulse"
                >
                  <ShieldAlert size={18} />
                  <span className="hidden md:block italic">PAINEL MASTER</span>
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
 * VERSÃO: 14.0 (AUTO-SYNC THEME)
 * MODIFICAÇÕES:
 * - Sincronização automática com a tabela 'clubes_cache' via useEffect.
 * - Replicado layout exato da Imagem 2 (Diagonal 115deg).
 * - Adicionada textura de tecido via SVG Turbulence Filter para realismo de camisa.
 * - Tipografia extra-bold italic (black italic) em todos os títulos.
 */
