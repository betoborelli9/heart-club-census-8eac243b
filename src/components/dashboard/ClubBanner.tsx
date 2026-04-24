/**
 * [CAMINHO/ARQUIVO]: src/components/dashboard/ClubBanner.tsx
 * [MÓDULO]: COMPONENTE GLOBAL DE BRANDING (BANNER + NAVBAR PREMIUM)
 * [STATUS]: VERSÃO 20.0 - MEDIDAS REAIS (JERSEY REPLICA FINAL)
 * [DESCRIÇÃO]: Replicagem exata da Imagem 87d855 com medidas fixas de alta fidelidade.
 * - Sincronização de cores e escudo via Supabase (clubes_cache).
 */

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Flame, BarChart3, Crown, Users, MapPin, Trophy, ShieldAlert, Vote, Bug } from "lucide-react";
import { ClubLogo } from "@/components/ClubLogo";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";

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
  ambassadorLevel = "BRONZE",
  showProfileInfo = true,
}: ClubBannerProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();

  const [theme, setTheme] = useState({
    cor_primaria: "#FF0000",
    cor_secundaria: "#000000",
    cor_terciaria: "#FFFFFF",
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
          cor_primaria: data.cor_primaria || "#FF0000",
          cor_secundaria: data.cor_secundaria || "#000000",
          cor_terciaria: data.cor_terciaria || "#FFFFFF",
          escudo_url: data.escudo_url || "",
        });
      }
    };
    fetchClubTheme();
  }, [clubName]);

  // Medida: 110 graus de inclinação para as faixas diagonais
  const bannerStyle = {
    background: `linear-gradient(110deg, 
      ${theme.cor_secundaria} 0%, 
      ${theme.cor_secundaria} 25%, 
      ${theme.cor_primaria} 25%, 
      ${theme.cor_primaria} 32%, 
      ${theme.cor_terciaria} 32%, 
      ${theme.cor_terciaria} 40%, 
      ${theme.cor_secundaria} 40%, 
      ${theme.cor_secundaria} 48%, 
      ${theme.cor_primaria} 48%, 
      ${theme.cor_primaria} 100%)`,
  };

  const isActive = (path: string) => location.pathname === path || location.pathname + location.hash === path;

  return (
    <div className="w-full max-w-7xl mx-auto p-4 animate-in fade-in duration-1000">
      {/* SECTION: Altura fixa 450px para impacto visual premium */}
      <section
        className="relative h-[280px] md:h-[450px] w-full rounded-[48px] md:rounded-[64px] overflow-hidden shadow-[0_45px_100px_-20px_rgba(0,0,0,0.8)] border border-white/5 group"
        style={bannerStyle}
      >
        {/* MÓDULO: Efeito de Tecido (Medida de Deslocamento: 80) */}
        <div className="absolute inset-0 pointer-events-none opacity-60 mix-blend-multiply overflow-hidden">
          <svg width="100%" height="100%" className="absolute inset-0">
            <filter id="jerseyFoldsMedidas">
              <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="4" seed="10" />
              <feDisplacementMap in="SourceGraphic" scale="80" />
            </filter>
            <rect width="100%" height="100%" filter="url(#jerseyFoldsMedidas)" opacity="0.3" />
          </svg>
          <div className="absolute inset-0 bg-gradient-to-tr from-black/50 via-white/10 to-black/50" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-15 mix-blend-overlay" />
        </div>

        {/* CONTEÚDO PRINCIPAL: Alinhamento centralizado com padding 24 (96px) */}
        <div className="relative h-full w-full flex flex-col md:flex-row items-center justify-between px-10 md:px-24 py-12">
          {/* LADO ESQUERDO: Escudo em Círculo Branco (Medida: w-64 / 256px) */}
          <div className="flex items-center gap-6 md:gap-14">
            <div className="relative shrink-0 transition-transform duration-1000 group-hover:scale-105">
              <div className="absolute -inset-8 bg-white/20 blur-[80px] rounded-full opacity-40" />
              <div className="w-36 h-36 md:w-64 md:h-64 bg-white rounded-full flex items-center justify-center border-[8px] border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.6)]">
                <ClubLogo src={theme.escudo_url} alt={clubName || ""} className="w-[75%] h-[75%] object-contain" />
              </div>
            </div>

            {/* INFOS PERFIL: text-7xl (72px) para o Nome */}
            <div className="flex flex-col text-white drop-shadow-[0_8px_8px_rgba(0,0,0,0.8)]">
              <h2 className="text-4xl md:text-7xl font-black italic uppercase tracking-tighter leading-none mb-1">
                {profileName || "BETO BORELLI"}
              </h2>
              <div className="flex items-center gap-2 mt-2 text-sm md:text-xl font-bold uppercase italic opacity-90">
                <MapPin size={24} className="text-red-600 fill-red-600 drop-shadow-md" />
                <span>
                  {profileCity || "GOIÂNIA"} - {profileState || "GO"}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2 text-sm md:text-xl font-black text-orange-400 italic uppercase tracking-widest">
                <Trophy size={24} className="drop-shadow-md" />
                <span>EMBAIXADOR {ambassadorLevel}</span>
              </div>
            </div>
          </div>

          {/* LADO DIREITO: Nome do Clube (Medida: text-9xl / 128px) */}
          <div className="hidden lg:flex flex-col items-end text-white text-right drop-shadow-[0_15px_15px_rgba(0,0,0,0.7)]">
            <span className="text-sm font-black uppercase italic opacity-80 tracking-[0.5em] mb-[-12px]">
              CLUBE DO CORAÇÃO
            </span>
            <h1 className="text-8xl xl:text-9xl font-black italic uppercase tracking-tighter leading-none">
              {clubName || "SANTA CRUZ"}
            </h1>
          </div>
        </div>

        {/* NAVBAR: Glassmorphism profundo com padding lateral 28 (112px) */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[95%] md:w-auto">
          <nav className="flex items-center justify-center gap-2 md:gap-5 p-3 bg-black/80 backdrop-blur-3xl rounded-[32px] border border-white/10 shadow-[0_25px_50px_rgba(0,0,0,0.6)] overflow-x-auto no-scrollbar">
            <NavBtn
              onClick={() => navigate("/mapa-calor")}
              active={isActive("/mapa-calor")}
              icon={<Flame size={18} />}
              label="MAPA DE CALOR"
            />
            <NavBtn
              onClick={() => navigate("/estatisticas")}
              active={isActive("/estatisticas")}
              icon={<BarChart3 size={18} />}
              label="ESTATÍSTICAS"
            />
            <NavBtn
              onClick={() => navigate("/estatisticas#ranking")}
              active={isActive("/estatisticas#ranking")}
              icon={<Crown size={18} />}
              label="RANKING"
            />
            <NavBtn
              onClick={() => navigate("/embaixadores")}
              active={isActive("/embaixadores")}
              icon={<Users size={18} />}
              label="EMBAIXADORES"
            />

            <div className="w-[1px] h-8 bg-white/10 mx-1 hidden md:block" />

            <NavBtn
              onClick={() => navigate("/voting")}
              active={isActive("/voting")}
              icon={<Vote size={18} />}
              label="VOTAÇÃO"
              variant="orange"
            />

            {IS_MASTER && (
              <>
                <NavBtn
                  onClick={() => navigate("/debug-api")}
                  active={isActive("/debug-api")}
                  icon={<Bug size={18} />}
                  label="DEBUG API"
                />
                <NavBtn
                  onClick={() => navigate("/admin")}
                  active={isActive("/admin")}
                  icon={<ShieldAlert size={18} />}
                  label="PAINEL MASTER"
                  variant="danger"
                />
              </>
            )}
          </nav>
        </div>
      </section>
    </div>
  );
};

const NavBtn = ({ icon, label, active, onClick, variant }: any) => {
  const baseClass =
    "flex items-center gap-3 px-5 md:px-7 py-3.5 rounded-2xl transition-all duration-500 whitespace-nowrap text-[10px] md:text-[12px] font-black italic uppercase tracking-widest group/btn";

  const getStyle = () => {
    if (variant === "orange")
      return "bg-[#ff6200] text-white shadow-[0_0_25px_rgba(255,98,0,0.6)] hover:scale-105 active:scale-95";
    if (variant === "danger")
      return "bg-red-600 text-white animate-pulse shadow-[0_0_20px_rgba(220,38,38,0.5)] hover:bg-red-500 active:scale-95";
    return active
      ? "bg-white/20 text-white shadow-xl scale-105"
      : "text-white/40 hover:text-white hover:bg-white/10 active:scale-95";
  };

  return (
    <button onClick={onClick} className={`${baseClass} ${getStyle()}`}>
      <span className={active ? "animate-pulse" : "group-hover/btn:scale-125 transition-transform"}>{icon}</span>
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
};

export default ClubBanner;

/**
 * [RODAPÉ TÉCNICO]
 * ARQUIVO: src/components/dashboard/ClubBanner.tsx
 * VERSÃO: 20.0 (JERSEY REPLICA - FINAL FIDELITY)
 * - Proporção de 450px de altura para Desktop.
 * - Medida do Escudo: 256px (w-64) com logo interna de 75%.
 * - Font-size para Títulos: text-7xl e text-9xl (Extra Impacto).
 * - Sincronia de cores dinâmica via Supabase.
 */
