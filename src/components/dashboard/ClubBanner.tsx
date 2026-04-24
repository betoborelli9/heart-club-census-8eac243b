/**
 * [CAMINHO]: src/components/dashboard/ClubBanner.tsx
 * [MÓDULO]: BRANDING GLOBAL (BANNER + NAVBAR)
 * [STATUS]: VERSÃO 25.0 - BUILD FIX & FIDELIDADE ABSOLUTA
 * [DESCRIÇÃO]: Replicagem da imagem 87d855.
 * - Correção de Build: Export default e imports compatíveis com Vite/React.
 * - Jersey Design: Filtro SVG de dobras de tecido e gradiente tricolor segmentado.
 * - Medidas: Altura 450px, Escudo 256px, Fonte 9xl.
 */

/* ═══════════════════════════════════════════════════════════
    MÓDULO: IMPORTS
   ═══════════════════════════════════════════════════════════ */
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Flame, BarChart3, Crown, Users, MapPin, Trophy, ShieldAlert, Vote, Bug } from "lucide-react";
import { motion } from "framer-motion";
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
}

/* ═══════════════════════════════════════════════════════════
    MÓDULO: COMPONENTE PRINCIPAL (EXPORT DEFAULT)
   ═══════════════════════════════════════════════════════════ */
const ClubBanner = ({
  clubName,
  profileName = "Beto Borelli",
  profileCity = "Goiânia",
  profileState = "GO",
  ambassadorLevel = "Bronze",
}: ClubBannerProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();

  const [theme, setTheme] = useState({
    cor_primaria: "transparent",
    cor_secundaria: "transparent",
    cor_terciaria: "transparent",
    escudo_url: "",
    loaded: false,
  });

  const IS_MASTER = user?.email === "betoborelli9@gmail.com";

  /* [MÓDULO: BUSCA DE TEMA NO SUPABASE] */
  useEffect(() => {
    const fetchTheme = async () => {
      if (!clubName) return;
      const { data } = await supabase
        .from("clubes_cache")
        .select("cor_primaria, cor_secundaria, cor_terciaria, escudo_url")
        .ilike("nome", `%${clubName}%`)
        .single();

      if (data) {
        setTheme({
          cor_primaria: data.cor_primaria,
          cor_secundaria: data.cor_secundaria,
          cor_terciaria: data.cor_terciaria,
          escudo_url: data.escudo_url,
          loaded: true,
        });
      }
    };
    fetchTheme();
  }, [clubName]);

  /* [MÓDULO: ESTILIZAÇÃO JERSEY (MEDIDAS IMAGEM 87d855)] */
  const bannerStyle = {
    background: theme.loaded
      ? `linear-gradient(110deg, 
          ${theme.cor_secundaria} 0%, 
          ${theme.cor_secundaria} 25%, 
          ${theme.cor_terciaria} 25%, 
          ${theme.cor_terciaria} 32%, 
          ${theme.cor_primaria} 32%, 
          ${theme.cor_primaria} 70%, 
          ${theme.cor_secundaria} 70%, 
          ${theme.cor_secundaria} 75%, 
          ${theme.cor_primaria} 75%, 
          ${theme.cor_primaria} 100%)`
      : "#111111",
  };

  const isActive = (path: string) => location.pathname === path || location.pathname + location.hash === path;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-7xl mx-auto p-4"
    >
      <section
        className="relative h-[300px] md:h-[450px] w-full rounded-[48px] md:rounded-[64px] overflow-hidden shadow-[0_45px_100px_-20px_rgba(0,0,0,0.8)] border border-white/5 group"
        style={bannerStyle}
      >
        {/* MÓDULO: TEXTURA E DOBRAS DE TECIDO (SVG JERSEY FILTER) */}
        <div className="absolute inset-0 pointer-events-none opacity-50 mix-blend-multiply">
          <svg width="100%" height="100%" className="absolute inset-0">
            <filter id="jerseyTextureFinal">
              <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="4" seed="5" />
              <feDisplacementMap in="SourceGraphic" scale="80" />
            </filter>
            <rect width="100%" height="100%" filter="url(#jerseyTextureFinal)" opacity="0.3" />
          </svg>
          <div className="absolute inset-0 bg-gradient-to-tr from-black/50 via-white/10 to-black/50" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-15 mix-blend-overlay" />
        </div>

        {/* MÓDULO: CONTEÚDO PRINCIPAL (LAYOUT 87d855) */}
        <div className="relative h-full w-full flex flex-col md:flex-row items-center justify-between px-10 md:px-24 py-12">
          <div className="flex items-center gap-6 md:gap-14">
            {/* ESCUDO (CÍRCULO BRANCO - MEDIDA 256px) */}
            <div className="relative shrink-0 transition-transform duration-1000 group-hover:scale-105">
              <div className="absolute -inset-8 bg-white/20 blur-[80px] rounded-full opacity-40" />
              <div className="w-32 h-32 md:w-64 md:h-64 bg-white rounded-full flex items-center justify-center border-[8px] border-white/10 shadow-2xl overflow-hidden">
                <ClubLogo src={theme.escudo_url} alt={clubName || ""} className="w-[75%] h-[75%] object-contain" />
              </div>
            </div>

            {/* INFO PERFIL (TEXT-7XL) */}
            <div className="flex flex-col text-white drop-shadow-[0_8px_8px_rgba(0,0,0,0.8)]">
              <h2 className="text-4xl md:text-7xl font-black italic uppercase tracking-tighter leading-none">
                {profileName}
              </h2>
              <div className="flex items-center gap-2 mt-3 text-sm md:text-xl font-bold uppercase italic opacity-90">
                <MapPin size={24} className="text-red-600 fill-red-600 drop-shadow-md" />
                <span>
                  {profileCity} - {profileState}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2 text-sm md:text-xl font-black text-orange-400 italic uppercase tracking-widest">
                <Trophy size={24} className="drop-shadow-md" />
                <span>EMBAIXADOR {ambassadorLevel}</span>
              </div>
            </div>
          </div>

          {/* CLUBE IMPACTANTE (TEXT-9XL) */}
          <div className="hidden lg:flex flex-col items-end text-white text-right drop-shadow-[0_15px_15px_rgba(0,0,0,0.7)]">
            <span className="text-sm font-black uppercase italic opacity-80 tracking-[0.5em] mb-[-12px]">
              CLUBE DO CORAÇÃO
            </span>
            <h1 className="text-8xl xl:text-9xl font-black italic uppercase tracking-tighter leading-none">
              {clubName}
            </h1>
          </div>
        </div>

        {/* MÓDULO: NAVBAR INFERIOR (PÍLULA ESCURA) */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[95%] md:w-auto">
          <nav className="flex items-center justify-center gap-2 md:gap-4 p-3 bg-black/80 backdrop-blur-3xl rounded-[32px] border border-white/10 shadow-2xl overflow-x-auto no-scrollbar">
            <NavBtn
              onClick={() => navigate("/mapa-calor")}
              active={isActive("/mapa-calor")}
              icon={<Flame size={18} />}
              label="MAPA"
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

            {/* VOTAÇÃO EM LARANJA */}
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
                  label="DEBUG"
                />
                {/* PAINEL MASTER PULSANTE */}
                <NavBtn
                  onClick={() => navigate("/admin")}
                  active={isActive("/admin")}
                  icon={<ShieldAlert size={18} />}
                  label="MASTER"
                  variant="danger"
                />
              </>
            )}
          </nav>
        </div>
      </section>
    </motion.div>
  );
};

/* ═══════════════════════════════════════════════════════════
    MÓDULO: COMPONENTE AUXILIAR (BOTÃO NAVBAR)
   ═══════════════════════════════════════════════════════════ */
const NavBtn = ({ icon, label, active, onClick, variant }: any) => {
  const baseClass =
    "flex items-center gap-2.5 px-5 md:px-7 py-3.5 rounded-2xl transition-all duration-500 whitespace-nowrap text-[10px] md:text-[12px] font-black italic uppercase tracking-widest group/btn";

  const getStyle = () => {
    if (variant === "orange")
      return "bg-[#ff6200] text-white shadow-[0_0_25px_rgba(255,98,0,0.6)] hover:scale-105 active:scale-95";
    if (variant === "danger")
      return "bg-red-600 text-white animate-pulse shadow-[0_0_20px_rgba(220,38,38,0.5)] hover:bg-red-500 active:scale-95";
    return active ? "bg-white/20 text-white shadow-xl scale-105" : "text-white/40 hover:text-white hover:bg-white/10";
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
 * Versão: 25.0
 * Caminho: src/components/dashboard/ClubBanner.tsx
 */
