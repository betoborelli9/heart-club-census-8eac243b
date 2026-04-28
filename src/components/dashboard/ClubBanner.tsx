/**
 * ═══════════════════════════════════════════════════════════════════
 * [CAMINHO]: src/components/dashboard/ClubBanner.tsx
 * [MÓDULO]: BRANDING & NAVIGATION
 * [STATUS]: PRODUÇÃO — VERSÃO 40.0 (PREMIUM RESTORATION)
 * [DESCRIÇÃO]:
 * - Restauração do visual de "Camisa" com gradientes diagonais nítidos.
 * - Correção da lógica de cores: Fallbacks robustos para evitar o cinza.
 * - Navbar flutuante integrada com estilos específicos (Orange Glow / Red Pulse).
 * ═══════════════════════════════════════════════════════════════════
 */

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Flame, BarChart3, Crown, Users, MapPin, Trophy, ShieldAlert, Vote, Settings, Heart } from "lucide-react";
import { ClubLogo } from "@/components/ClubLogo";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";

interface ClubBannerProps {
  clubName: string;
  profileName?: string;
  profileCity?: string;
  profileState?: string;
  ambassadorLevel?: string | null;
  showProfileInfo?: boolean;
}

const ClubBanner = ({
  clubName,
  profileName = "Beto Borelli",
  profileCity = "Goiânia",
  profileState = "GO",
  ambassadorLevel = "BRONZE",
  showProfileInfo = true,
}: ClubBannerProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();

  const [theme, setTheme] = useState({
    cor_primaria: "#e11d48", // Vermelho padrão
    cor_secundaria: "#ffffff", // Branco
    cor_terciaria: "#000000", // Preto
    escudo_url: "",
  });

  const IS_MASTER = user?.email === "betoborelli9@gmail.com";

  // Busca de Cores e Escudo no Banco
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
          cor_primaria: data.cor_primaria || "#e11d48",
          cor_secundaria: data.cor_secundaria || "#ffffff",
          cor_terciaria: data.cor_terciaria || "#000000",
          escudo_url: data.escudo_url || "",
        });
      }
    };
    fetchTheme();
  }, [clubName]);

  // Lógica de Gradiente Diagonal (Stripe Jersey Style)
  const buildBannerGradient = () => {
    const p = theme.cor_primaria;
    const s = theme.cor_secundaria;
    const t = theme.cor_terciaria;
    // Hard stops para garantir que as cores não se misturem (Estética Imagem 233df1)
    return `linear-gradient(115deg, ${t} 0%, ${t} 35%, ${s} 35%, ${s} 42%, ${p} 42%, ${p} 100%)`;
  };

  const textOutline = {
    textShadow: "0 4px 10px rgba(0,0,0,0.5), 0 0 20px rgba(0,0,0,0.3)",
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 animate-in fade-in duration-700">
      <div
        className="relative h-[420px] w-full rounded-[64px] overflow-hidden shadow-[0_35px_60px_-15px_rgba(0,0,0,0.7)] border border-white/10 group"
        style={{ background: buildBannerGradient() }}
      >
        {/* Camada de Textura de Tecido */}
        <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

        <div className="relative z-10 h-full w-full flex flex-col md:flex-row items-center justify-between px-10 md:px-20 py-12">
          {/* Lado Esquerdo: Badge do Escudo */}
          <div className="flex items-center justify-center shrink-0">
            <div className="w-48 h-48 md:w-64 md:h-64 rounded-full bg-white flex items-center justify-center shadow-2xl border-8 border-black/5 group-hover:scale-105 transition-transform duration-500">
              <ClubLogo
                src={theme.escudo_url}
                alt={clubName}
                className="w-[75%] h-[75%] object-contain drop-shadow-2xl"
              />
            </div>
          </div>

          {/* Centro: Identidade Visual */}
          <div className="flex flex-col items-center md:items-start text-white text-center md:text-left gap-1">
            <h2
              className="text-4xl md:text-7xl font-black italic uppercase tracking-tighter leading-none"
              style={textOutline}
            >
              {profileName}
            </h2>
            <div
              className="flex flex-col md:flex-row items-center gap-2 md:gap-6 text-sm font-bold uppercase italic opacity-90"
              style={textOutline}
            >
              <span className="flex items-center gap-1.5">
                <MapPin size={16} className="text-white" />
                {profileCity}, {profileState}
              </span>
              <span className="flex items-center gap-1.5 text-orange-400">
                <Trophy size={16} />
                Embaixador {IS_MASTER ? "DIAMANTE" : ambassadorLevel}
              </span>
            </div>
          </div>

          {/* Lado Direito: Nome do Clube */}
          <div className="hidden lg:flex flex-col items-end text-white text-right">
            <span
              className="text-xs font-black uppercase italic opacity-70 tracking-[0.3em] mb-[-4px]"
              style={textOutline}
            >
              Clube do Coração
            </span>
            <h1
              className="text-6xl xl:text-8xl font-black italic uppercase tracking-tighter leading-none"
              style={textOutline}
            >
              {clubName || "SELECIONE"}
            </h1>
          </div>
        </div>

        {/* Floating Navigation Pill */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-max max-w-[95vw]">
          <nav className="flex items-center justify-center gap-2 md:gap-4 p-2 bg-black/60 backdrop-blur-3xl rounded-[2rem] border border-white/10 shadow-2xl overflow-x-auto no-scrollbar">
            <NavItem
              icon={<Flame size={18} />}
              label="Mapa de Calor"
              active={location.pathname === "/mapa-calor"}
              onClick={() => navigate("/mapa-calor")}
            />
            <NavItem
              icon={<BarChart3 size={18} />}
              label="Estatísticas"
              active={location.pathname === "/estatisticas"}
              onClick={() => navigate("/estatisticas")}
            />
            <NavItem icon={<Crown size={18} />} label="Ranking" onClick={() => navigate("/estatisticas#ranking")} />
            <NavItem icon={<Vote size={18} />} label="Votação" variant="orange" onClick={() => navigate("/voting")} />
            {IS_MASTER && (
              <NavItem
                icon={<Settings size={18} />}
                label="Painel Master"
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
      flex items-center gap-2 px-5 py-3 rounded-2xl transition-all duration-300 whitespace-nowrap
      ${
        variant === "orange"
          ? "text-[#ff6200] border border-[#ff6200]/30 hover:bg-[#ff6200]/10"
          : variant === "danger"
            ? "bg-red-600 text-white animate-pulse"
            : active
              ? "bg-white/10 text-white border border-white/20"
              : "text-white/40 hover:text-white hover:bg-white/5"
      }
    `}
  >
    {icon}
    <span className="text-[10px] font-black italic uppercase tracking-widest hidden md:block">{label}</span>
  </button>
);

export default ClubBanner;
