/**
 * [CAMINHO/ARQUIVO]: src/components/dashboard/ClubBanner.tsx
 * [MÓDULO]: COMPONENTE GLOBAL DE BRANDING (BANNER TRICOLOR + NAVBAR)
 * [STATUS]: UPGRADE VISUAL: BANDEIRA TREMULANTE (IMAGEM 2)
 * [DESCRIÇÃO]: Banner com gradiente diagonal tricolor segmentado,
 * textura de tecido e efeito de distorção de bandeira.
 */

/* [MÓDULO: IMPORTS] */
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Flame, BarChart3, Crown, Users, MapPin, Trophy, ShieldAlert, Vote, Bug } from "lucide-react";
import { ClubLogo } from "@/components/ClubLogo";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
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

  /* [MÓDULO: CONFIGURAÇÕES DE TEMA E IA SYNC] */
  const IS_MASTER = user?.email === "betoborelli9@gmail.com";
  const [dbColors, setDbColors] = useState({
    p: "#1a1a1a",
    s: "#ffffff",
    t: "#ff6200",
  });

  // Busca as 3 cores oficiais para o efeito tricolor diagonal
  useEffect(() => {
    const fetchColors = async () => {
      if (!clubName) return;
      const { data } = await supabase
        .from("clubes_cache")
        .select("cor_primaria, cor_secundaria, cor_terciaria")
        .ilike("nome", `%${clubName}%`)
        .single();

      if (data) {
        setDbColors({
          p: data.cor_primaria || "#1a1a1a",
          s: data.cor_secundaria || "#ffffff",
          t: data.cor_terciaria || "#ff6200",
        });
      }
    };
    fetchColors();
  }, [clubName]);

  const bannerTextColor = "#ffffff";

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
      {/* [MÓDULO: IDENTIDADE VISUAL - BANDEIRA TREMULANTE] 
          Aparência baseada na Imagem 2 com gradiente diagonal segmentado.
      */}
      <section
        className="relative overflow-hidden rounded-t-[2.5rem] h-[220px] md:h-[280px] flex items-center shadow-2xl"
        style={{
          background: `linear-gradient(115deg, 
            ${dbColors.p} 0%, 
            ${dbColors.p} 35%, 
            ${dbColors.s} 35%, 
            ${dbColors.s} 42%, 
            ${dbColors.t} 42%, 
            ${dbColors.t} 100%)`,
        }}
      >
        {/* Camada de Textura de Tecido e Efeito Tremulante */}
        <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-soft-light">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <filter id="wavingFlag">
              <feTurbulence type="fractalNoise" baseFrequency="0.01 0.02" numOctaves="3" seed="2">
                <animate attributeName="seed" from="1" to="100" dur="20s" repeatCount="indefinite" />
              </feTurbulence>
              <feDisplacementMap in="SourceGraphic" scale="30" />
            </filter>
            <rect width="100%" height="100%" filter="url(#wavingFlag)" fill="transparent" />
          </svg>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
        </div>

        <div className="relative z-10 flex items-center justify-between w-full px-6 md:px-12">
          <div className="flex items-center gap-6">
            {/* ESCUDO EM CÍRCULO BRANCO (Conforme Imagem 2) */}
            <div className="w-[110px] h-[110px] md:w-[180px] md:h-[180px] rounded-full bg-white flex items-center justify-center shadow-[0_15px_40px_rgba(0,0,0,0.5)] border-4 border-white/20 transition-transform duration-500 hover:scale-105">
              <ClubLogo
                src={clubData?.logoUrl || clubData?.logo}
                alt={clubName || ""}
                className="w-[80%] h-[80%] object-contain drop-shadow-xl"
              />
            </div>

            {/* INFOS DO PERFIL */}
            {showProfileInfo ? (
              <div className="flex flex-col drop-shadow-lg">
                <h2
                  className="text-2xl md:text-5xl font-black italic uppercase tracking-tighter leading-none mb-1"
                  style={{ color: bannerTextColor }}
                >
                  {profileName}
                </h2>
                <div
                  className="flex items-center gap-2 text-xs md:text-sm font-bold opacity-90 uppercase italic"
                  style={{ color: bannerTextColor }}
                >
                  <MapPin size={16} className="text-red-600 fill-red-600" /> {profileCity}
                  {profileState ? `, ${profileState}` : ""}
                </div>
                <div className="flex items-center gap-2 text-xs md:text-sm font-black text-orange-400 italic mt-2 uppercase">
                  <Trophy size={18} /> EMBAIXADOR {ambassadorLevel}
                </div>
              </div>
            ) : (
              <div className="flex flex-col drop-shadow-lg">
                <p
                  className="text-[10px] md:text-xs font-black uppercase tracking-[0.4em] opacity-70 mb-1"
                  style={{ color: bannerTextColor }}
                >
                  {pageLabel || "TERRITÓRIO DE EMBAIXADOR"}
                </p>
                <h1
                  className="text-4xl md:text-7xl font-black italic uppercase tracking-tighter leading-none"
                  style={{ color: bannerTextColor }}
                >
                  {clubName}
                </h1>
              </div>
            )}
          </div>

          {/* LADO DIREITO: NOME DO CLUBE IMPACTANTE */}
          {showProfileInfo && (
            <div className="hidden lg:flex flex-col items-end text-right drop-shadow-2xl">
              <span
                className="text-xs font-black uppercase tracking-[0.4em] opacity-70 italic mb-[-8px]"
                style={{ color: bannerTextColor }}
              >
                Clube do Coração
              </span>
              <h1
                className="text-6xl xl:text-8xl font-black italic uppercase tracking-tighter"
                style={{ color: bannerTextColor }}
              >
                {clubName}
              </h1>
            </div>
          )}
        </div>
      </section>

      {/* [MÓDULO: NAVBAR INTEGRADA - INTACTA CONFORME SOLICITADO] */}
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
          <>
            <button
              onClick={() => navigate("/voting")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase text-[#ff6200] hover:bg-[#ff6200]/10 transition-all border border-[#ff6200]/20"
            >
              <Vote size={14} />
              <span className="hidden md:inline">VOTAÇÃO</span>
            </button>

            <button
              onClick={() => navigate("/debug-api")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase text-white/70 hover:text-white hover:bg-white/10 transition-all border border-white/20"
            >
              <Bug size={14} />
              <span className="hidden md:inline">DEBUG API</span>
            </button>

            <button
              onClick={() => navigate("/admin")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase bg-red-600 text-white animate-pulse"
            >
              <ShieldAlert size={14} />
              <span className="hidden md:inline">PAINEL MASTER</span>
            </button>
          </>
        )}
      </nav>
    </div>
  );
};

export default ClubBanner;

/**
 * [RODAPÉ TÉCNICO]
 * ARQUIVO: src/components/dashboard/ClubBanner.tsx
 * VERSÃO: 17.0 (TRICOLOR WAVING FLAG)
 * MODIFICAÇÕES:
 * - Implementado gradiente diagonal segmentado (115deg) usando cor_primaria, cor_secundaria e cor_terciaria.
 * - Adicionado filtro SVG de turbulência com animação sutil para simular movimento de bandeira.
 * - Escudo centralizado em círculo branco (moldura de camisa oficial).
 * - Navbar preservada com todas as rotas administrativas e de votação.
 */
