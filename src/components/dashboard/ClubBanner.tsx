/**
 * [CAMINHO/ARQUIVO]: src/components/dashboard/ClubBanner.tsx
 * [MÓDULO]: COMPONENTE GLOBAL DE BRANDING (BANNER + NAVBAR PREMIUM)
 * [STATUS]: VERSÃO 18.0 - FIDELIDADE MÁXIMA (JERSEY REPLICA + TRICOLOR DIAGONAL)
 * [DESCRIÇÃO]: Replicagem exata da Imagem 2.
 * - Background tricolor diagonal dinâmico.
 * - Filtro SVG de dobras de tecido (Jersey Folds) para realismo têxtil.
 * - Navbar integrada com Glassmorphism e estados específicos (Votação/Master).
 */

/* [MÓDULO: IMPORTS] */
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Flame, BarChart3, Crown, Users, MapPin, Trophy, ShieldAlert, Vote, Bug } from "lucide-react";
import { ClubLogo } from "@/components/ClubLogo";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";

/* [MÓDULO: INTERFACE DE PROPS] */
interface ClubBannerProps {
  clubName: string | null;
  profileName?: string | null;
  profileCity?: string | null;
  profileState?: string | null;
  ambassadorLevel?: string | null;
  showProfileInfo?: boolean;
}

/* [MÓDULO: COMPONENTE PRINCIPAL] */
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

  /* [MÓDULO: ESTADOS E TEMA IA-SYNC] */
  const [theme, setTheme] = useState({
    cor_primaria: "#FF0000",
    cor_secundaria: "#000000",
    cor_terciaria: "#FFFFFF",
    escudo_url: "",
  });

  const IS_MASTER = user?.email === "betoborelli9@gmail.com";

  /* [MÓDULO: BUSCA DE CORES NO SUPABASE] */
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

  /* [MÓDULO: ESTILIZAÇÃO DO BANNER (TRICOLOR DIAGONAL)] */
  const bannerStyle = {
    background: `linear-gradient(115deg, 
      ${theme.cor_secundaria} 0%, 
      ${theme.cor_secundaria} 28%, 
      ${theme.cor_terciaria} 28%, 
      ${theme.cor_terciaria} 32%, 
      ${theme.cor_secundaria} 32%, 
      ${theme.cor_secundaria} 42%, 
      ${theme.cor_terciaria} 42%, 
      ${theme.cor_terciaria} 50%, 
      ${theme.cor_primaria} 50%, 
      ${theme.cor_primaria} 100%)`,
  };

  const isActive = (path: string) => location.pathname === path || location.pathname + location.hash === path;

  return (
    <div className="w-full max-w-7xl mx-auto p-4 animate-in fade-in duration-700">
      {/* [MÓDULO: UI VISUAL DO BANNER] */}
      <section
        className="relative h-[280px] md:h-[420px] w-full rounded-[48px] md:rounded-[64px] overflow-hidden shadow-[0_30px_90px_-20px_rgba(0,0,0,0.8)] border border-white/5 group"
        style={bannerStyle}
      >
        {/* [MÓDULO: EFEITO DE TECIDO E DOBRAS (JERSEY REPLICA)] */}
        <div className="absolute inset-0 pointer-events-none opacity-50 mix-blend-multiply overflow-hidden">
          <svg width="100%" height="100%" className="absolute inset-0">
            <filter id="fabricFolds">
              <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="4" seed="5" />
              <feDisplacementMap in="SourceGraphic" scale="100" />
            </filter>
            <rect width="100%" height="100%" filter="url(#fabricFolds)" opacity="0.4" />
          </svg>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay" />
          <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-white/10 to-black/40" />
        </div>

        {/* CONTEÚDO DO BANNER */}
        <div className="relative h-full w-full flex flex-col md:flex-row items-center justify-between px-8 md:px-20 py-10">
          {/* LADO ESQUERDO: ESCUDO EM CÍRCULO BRANCO */}
          <div className="flex items-center gap-6 md:gap-12">
            <div className="relative shrink-0 transition-transform duration-700 group-hover:scale-105">
              <div className="absolute -inset-6 bg-white/20 blur-3xl rounded-full opacity-40" />
              <div className="w-32 h-32 md:w-64 md:h-64 bg-white rounded-full flex items-center justify-center border-[8px] border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                <ClubLogo src={theme.escudo_url} alt={clubName || ""} className="w-[78%] h-[78%] object-contain" />
              </div>
            </div>

            {/* INFORMAÇÕES DO PERFIL */}
            <div className="flex flex-col text-white drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]">
              <h2 className="text-3xl md:text-6xl font-black italic uppercase tracking-tighter leading-none mb-1">
                {profileName || "BETO BORELLI"}
              </h2>
              <div className="flex items-center gap-2 mt-2 text-xs md:text-lg font-bold uppercase italic opacity-90">
                <MapPin size={22} className="text-red-600 fill-red-600 drop-shadow-md" />
                <span>
                  {profileCity || "GOIÂNIA"}, {profileState || "GO"}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2 text-xs md:text-lg font-black text-orange-400 italic uppercase tracking-wide">
                <Trophy size={22} className="drop-shadow-md" />
                <span>EMBAIXADOR {ambassadorLevel}</span>
              </div>
            </div>
          </div>

          {/* LADO DIREITO: CLUBE DO CORAÇÃO */}
          <div className="hidden lg:flex flex-col items-end text-white text-right drop-shadow-[0_15px_15px_rgba(0,0,0,0.6)]">
            <span className="text-sm font-black uppercase italic opacity-80 tracking-[0.5em] mb-[-12px]">
              CLUBE DO CORAÇÃO
            </span>
            <h1 className="text-7xl xl:text-9xl font-black italic uppercase tracking-tighter leading-none">
              {clubName || "SANTA CRUZ"}
            </h1>
          </div>
        </div>

        {/* [MÓDULO: NAVBAR INTEGRADA (GLASSMORPISM)] */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[95%] md:w-auto">
          <nav className="flex items-center justify-center gap-1.5 md:gap-4 p-2.5 bg-black/70 backdrop-blur-3xl rounded-[32px] border border-white/10 shadow-2xl overflow-x-auto no-scrollbar">
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

            <div className="w-[1px] h-8 bg-white/10 mx-2 hidden md:block" />

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

/* [MÓDULO: COMPONENTE AUXILIAR DE BOTÃO NAVBAR] */
const NavBtn = ({ icon, label, active, onClick, variant }: any) => {
  const baseClass =
    "flex items-center gap-2.5 px-4 md:px-6 py-3 rounded-2xl transition-all duration-500 whitespace-nowrap text-[10px] md:text-[12px] font-black italic uppercase tracking-widest group/btn";

  const getStyle = () => {
    if (variant === "orange") return "bg-[#ff6200] text-white shadow-[0_0_25px_rgba(255,98,0,0.6)] hover:scale-105";
    if (variant === "danger")
      return "bg-red-600 text-white animate-pulse shadow-[0_0_20px_rgba(220,38,38,0.5)] hover:bg-red-500";
    return active ? "bg-white/15 text-white shadow-lg scale-105" : "text-white/40 hover:text-white hover:bg-white/5";
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
 * VERSÃO: 18.0 (JERSEY REPLICA FINAL)
 * MODIFICAÇÕES:
 * - Implementado filtro SVG fractalNoise + feDisplacementMap para simular dobras reais de camisa.
 * - Gradiente diagonal tricolor segmentado dinâmico (Tricolor Auto-Theme).
 * - Escudo em Moldura Circular Branca (Pixel-Perfect conforme Imagem 2).
 * - Navbar com Glassmorphism profundo, botão de votação em laranja fixo e painel master pulsante.
 */
