/**
 * [CAMINHO/ARQUIVO]: src/components/dashboard/ClubBanner.tsx
 * [MÓDULO]: COMPONENTE GLOBAL DE BRANDING (BANNER + NAVBAR PREMIUM)
 * [STATUS]: VERSÃO 21.0 - FIDELIDADE TOTAL (JERSEY REPLICA + AUTO-SYNC)
 * [DESCRIÇÃO]: Replicagem exata da Imagem 87d855.
 * - Busca dinâmica de cores e escudo no Supabase (clubes_cache).
 * - Estado inicial neutro para evitar flicker de cores erradas.
 * - Navbar com Votação (Laranja) e Painel Master (Vermelho Pulsante).
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

  // Módulo de Estado Inicial Neutro (Anti-Flicker)
  const [theme, setTheme] = useState({
    cor_primaria: "transparent",
    cor_secundaria: "transparent",
    cor_terciaria: "transparent",
    escudo_url: "",
    loaded: false,
  });

  const IS_MASTER = user?.email === "betoborelli9@gmail.com";

  /* [MÓDULO: SINCRONIZAÇÃO COM CLUBES CACHE] */
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
          cor_primaria: data.cor_primaria,
          cor_secundaria: data.cor_secundaria,
          cor_terciaria: data.cor_terciaria,
          escudo_url: data.escudo_url,
          loaded: true,
        });
      }
    };
    fetchClubTheme();
  }, [clubName]);

  /* [MÓDULO: MEDIDAS E GRADIENTE DIAGONAL (REFERÊNCIA 87d855)] */
  const bannerStyle = {
    background: theme.loaded
      ? `linear-gradient(110deg, 
          ${theme.cor_secundaria} 0%, 
          ${theme.cor_secundaria} 25%, 
          ${theme.cor_primaria} 25%, 
          ${theme.cor_primaria} 32%, 
          ${theme.cor_terciaria} 32%, 
          ${theme.cor_terciaria} 40%, 
          ${theme.cor_secundaria} 40%, 
          ${theme.cor_secundaria} 48%, 
          ${theme.cor_primaria} 48%, 
          ${theme.cor_primaria} 100%)`
      : "#111111", // Fundo neutro enquanto carrega
  };

  const isActive = (path: string) => location.pathname === path || location.pathname + location.hash === path;

  return (
    <div className="w-full max-w-7xl mx-auto p-4 animate-in fade-in duration-1000">
      {/* [MÓDULO: UI VISUAL DO BANNER - ALTURA 450px] */}
      <section
        className="relative h-[280px] md:h-[450px] w-full rounded-[48px] md:rounded-[64px] overflow-hidden shadow-[0_45px_100px_-20px_rgba(0,0,0,0.8)] border border-white/5 group transition-all duration-500"
        style={bannerStyle}
      >
        {/* TEXTURA DE CAMISA (JERSEY TEXTURE + FOLDS) */}
        <div className="absolute inset-0 pointer-events-none opacity-60 mix-blend-multiply overflow-hidden">
          <svg width="100%" height="100%" className="absolute inset-0">
            <filter id="jerseyFoldsFinal">
              <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="4" seed="10" />
              <feDisplacementMap in="SourceGraphic" scale="80" />
            </filter>
            <rect width="100%" height="100%" filter="url(#jerseyFoldsFinal)" opacity="0.3" />
          </svg>
          <div className="absolute inset-0 bg-gradient-to-tr from-black/50 via-white/10 to-black/50" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-15 mix-blend-overlay" />
        </div>

        {/* CONTEÚDO PRINCIPAL (PADDING 24) */}
        <div className="relative h-full w-full flex flex-col md:flex-row items-center justify-between px-10 md:px-24 py-12">
          {/* LADO ESQUERDO: ESCUDO EM CÍRCULO BRANCO (MEDIDA 256px) */}
          <div className="flex items-center gap-6 md:gap-14">
            <div className="relative shrink-0 transition-transform duration-1000 group-hover:scale-105">
              <div className="absolute -inset-8 bg-white/20 blur-[80px] rounded-full opacity-40" />
              <div className="w-32 h-32 md:w-64 md:h-64 bg-white rounded-full flex items-center justify-center border-[8px] border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.6)]">
                <ClubLogo src={theme.escudo_url} alt={clubName || ""} className="w-[75%] h-[75%] object-contain" />
              </div>
            </div>

            {/* INFO PERFIL (TEXT-7XL / 72px) */}
            <div className="flex flex-col text-white drop-shadow-[0_8px_8px_rgba(0,0,0,0.8)]">
              <h2 className="text-3xl md:text-7xl font-black italic uppercase tracking-tighter leading-none mb-1">
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

          {/* LADO DIREITO: CLUBE (TEXT-9XL / 128px) */}
          <div className="hidden lg:flex flex-col items-end text-white text-right drop-shadow-[0_15px_15px_rgba(0,0,0,0.7)]">
            <span className="text-sm font-black uppercase italic opacity-80 tracking-[0.5em] mb-[-12px]">
              CLUBE DO CORAÇÃO
            </span>
            <h1 className="text-8xl xl:text-9xl font-black italic uppercase tracking-tighter leading-none">
              {clubName || "SANTA CRUZ"}
            </h1>
          </div>
        </div>

        {/* [MÓDULO: BARRA INFERIOR (NAVBAR) - FAIXA ESCURA COM BOTÕES] */}
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

            {/* VOTAÇÃO (DESTAQUE EM LARANJA) */}
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

                {/* PAINEL MASTER (BOTÃO VERMELHO PULSANTE) */}
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

/* [MÓDULO: COMPONENTE AUXILIAR DE BOTÃO NAVBAR] */
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
 * VERSÃO: 21.0 (FIDELIDADE TOTAL)
 * - Removido estado inicial tricolor (Preto/Branco/Vermelho) para evitar erro visual em outros clubes.
 * - Sincronia real com 'clubes_cache' via useEffect.
 * - Navbar rigorosamente conforme descrição: Votação (Laranja), Painel Master (Vermelho Pulsante).
 * - Proporções de texto (7xl/9xl) e escudo (256px) conforme Imagem 87d855.
 */
