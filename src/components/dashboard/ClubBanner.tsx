/**
 * ═══════════════════════════════════════════════════════════════════
 * [CAMINHO]: src/components/dashboard/ClubBanner.tsx
 * [MÓDULO]: BRANDING & NAVIGATION
 * [STATUS]: PRODUÇÃO — VERSÃO 41.0 (ULTRA PREMIUM RESTORATION)
 * [DESCRIÇÃO]:
 * - Reconstrução do visual "Jersey" com faixas sólidas (Zero Blending).
 * - Filtro de textura de tecido avançado (Rugosidade & Dobras).
 * - Lógica de cores blindada: busca exata no 'clubes_cache'.
 * ═══════════════════════════════════════════════════════════════════
 */

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Flame, BarChart3, Crown, MapPin, Trophy, Vote, Settings, Activity } from "lucide-react";
import { ClubLogo } from "@/components/ClubLogo";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";

interface ClubBannerProps {
  clubName: string;
  profileName?: string;
  profileCity?: string;
  profileState?: string;
  ambassadorLevel?: string | null;
}

const ClubBanner = ({
  clubName,
  profileName = "Beto Borelli",
  profileCity = "Goiânia",
  profileState = "GO",
  ambassadorLevel = "BRONZE",
}: ClubBannerProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();

  const [theme, setTheme] = useState({
    cor_primaria: "#000000",
    cor_secundaria: "#e11d48",
    cor_terciaria: "#ffffff",
    escudo_url: "",
    loading: true,
  });

  const IS_MASTER = user?.email === "betoborelli9@gmail.com";

  useEffect(() => {
    if (!clubName) return;
    const fetchTheme = async () => {
      const { data } = await supabase
        .from("clubes_cache")
        .select("cor_primaria, cor_secundaria, cor_terciaria, escudo_url")
        .ilike("nome", `%${clubName}%`)
        .maybeSingle();

      if (data) {
        setTheme({
          cor_primaria: data.cor_primaria || "#000000",
          cor_secundaria: data.cor_secundaria || "#e11d48",
          cor_terciaria: data.cor_terciaria || "#ffffff",
          escudo_url: data.escudo_url || "",
          loading: false,
        });
      }
    };
    fetchTheme();
  }, [clubName]);

  /**
   * [ENGENHARIA DE CORES - JERSEY STRIPES]
   * Aplica 5 faixas sólidas sem transição (Hard Stops).
   */
  const buildBannerGradient = () => {
    const cp = theme.cor_primaria; // Fundo Escudo (Lado esquerdo)
    const ct = theme.cor_terciaria; // Faixa Central
    const cs = theme.cor_secundaria; // Cor Principal (Lado direito)

    return `linear-gradient(110deg, 
      ${cp} 0%, ${cp} 25%, 
      ${ct} 25%, ${ct} 32%, 
      ${cs} 32%, ${cs} 70%, 
      ${cp} 70%, ${cp} 75%, 
      ${cs} 75%, ${cs} 100%
    )`;
  };

  const textOutline = {
    textShadow: "0 10px 20px rgba(0,0,0,0.6), 0 0 40px rgba(0,0,0,0.4)",
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 animate-in fade-in zoom-in duration-1000">
      <div
        className="relative h-[450px] w-full rounded-[64px] overflow-hidden shadow-[0_45px_100px_-20px_rgba(0,0,0,0.8)] border border-white/10 group transition-all duration-700"
        style={{ background: buildBannerGradient() }}
      >
        {/* Camada 1: Filtro de Tecido (Rugosidade) */}
        <div className="absolute inset-0 opacity-30 pointer-events-none mix-blend-overlay">
          <svg width="100%" height="100%">
            <filter id="jerseyTexture">
              <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="3" stitchTiles="stitch" />
              <feColorMatrix type="saturate" values="0" />
              <feComponentTransfer>
                <feFuncR type="linear" slope="0.3" />
                <feFuncG type="linear" slope="0.3" />
                <feFuncB type="linear" slope="0.3" />
              </feComponentTransfer>
            </filter>
            <rect width="100%" height="100%" filter="url(#jerseyTexture)" />
          </svg>
        </div>

        {/* Camada 2: Textura de Fibra de Carbono */}
        <div className="absolute inset-0 opacity-15 pointer-events-none mix-blend-multiply bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

        {/* Conteúdo Principal */}
        <div className="relative z-10 h-full w-full flex flex-col md:flex-row items-center justify-between px-10 md:px-24 py-12">
          {/* Badge do Escudo (Círculo Branco Perfeito) */}
          <div className="flex items-center justify-center shrink-0">
            <div className="w-56 h-56 md:w-72 md:h-72 rounded-full bg-white flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-[12px] border-black/5 group-hover:scale-105 transition-transform duration-700">
              <ClubLogo
                src={theme.escudo_url}
                alt={clubName}
                className="w-[78%] h-[78%] object-contain drop-shadow-[0_15px_15px_rgba(0,0,0,0.3)]"
              />
            </div>
          </div>

          {/* Identidade do Torcedor */}
          <div className="flex flex-col items-center md:items-start text-white text-center md:text-left gap-1">
            <h2
              className="text-5xl md:text-8xl font-black italic uppercase tracking-tighter leading-none"
              style={textOutline}
            >
              {profileName}
            </h2>
            <div
              className="flex flex-col md:flex-row items-center gap-2 md:gap-8 text-sm font-bold uppercase italic opacity-90 mt-2"
              style={textOutline}
            >
              <span className="flex items-center gap-2">
                <MapPin size={18} className="text-white" />
                {profileCity}, {profileState}
              </span>
              <span className="flex items-center gap-2 text-orange-400">
                <Trophy size={18} />
                Embaixador {IS_MASTER ? "DIAMANTE" : ambassadorLevel}
              </span>
            </div>
          </div>

          {/* Branding do Clube */}
          <div className="hidden xl:flex flex-col items-end text-white text-right">
            <span
              className="text-sm font-black uppercase italic opacity-60 tracking-[0.4em] mb-[-8px]"
              style={textOutline}
            >
              Manto Sagrado
            </span>
            <h1
              className="text-7xl xl:text-9xl font-black italic uppercase tracking-tighter leading-none"
              style={textOutline}
            >
              {clubName || "LEALDADE"}
            </h1>
          </div>
        </div>

        {/* Barra de Navegação (The Master Pill) */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-max max-w-[95vw] z-[100]">
          <nav className="flex items-center justify-center gap-2 md:gap-6 p-2.5 bg-black/80 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <NavItem
              icon={<Flame size={20} />}
              label="Mapa de Calor"
              active={location.pathname === "/mapa-calor"}
              onClick={() => navigate("/mapa-calor")}
            />
            <NavItem
              icon={<BarChart3 size={20} />}
              label="Estatísticas"
              active={location.pathname === "/estatisticas"}
              onClick={() => navigate("/estatisticas")}
            />
            <NavItem icon={<Crown size={20} />} label="Ranking" onClick={() => navigate("/estatisticas#ranking")} />
            <NavItem icon={<Vote size={20} />} label="Votar" variant="orange" onClick={() => navigate("/voting")} />
            {IS_MASTER && (
              <NavItem
                icon={<Settings size={20} />}
                label="Master"
                variant="danger"
                onClick={() => navigate("/admin/global")}
              />
            )}
          </nav>
        </div>
      </div>
    </div>
  );
};

const NavItem = ({ icon, label, active, variant, onClick }: any) => (
  <button
    onClick={onClick}
    className={`
      flex items-center gap-2.5 px-6 py-3.5 rounded-[1.5rem] transition-all duration-500 whitespace-nowrap group/nav
      ${
        variant === "orange"
          ? "text-[#ff6200] border border-[#ff6200]/40 shadow-[0_0_15px_rgba(255,98,0,0.2)] hover:bg-[#ff6200]/10"
          : variant === "danger"
            ? "bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] animate-pulse"
            : active
              ? "bg-white/10 text-white border border-white/20"
              : "text-white/40 hover:text-white hover:bg-white/5"
      }
    `}
  >
    <span className="group-hover/nav:scale-110 transition-transform">{icon}</span>
    <span className="text-[11px] font-black italic uppercase tracking-[0.2em] hidden lg:block">{label}</span>
  </button>
);

export default ClubBanner;
