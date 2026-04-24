/**
 * [CAMINHO/ARQUIVO]: src/components/dashboard/ClubBanner.tsx
 * [MÓDULO]: BRANDING & DASHBOARD NAVIGATION
 * [STATUS]: VERSÃO 23.0 (CONTORNO DE PRECISÃO — NAVBAR COLOR SYNC)
 * [DESCRIÇÃO]: Banner e Navbar unificados com borda na cor exata da navegação.
 * - Borda: Contorno único em #1a1a1a para distinção limpa do fundo do site.
 * - Estética: Removidas bordas brancas/claras que causavam mistura visual.
 * - Diagonais: Mantido refinamento estreito (5%) e inclinação de 115 graus.
 * - Tipografia: Mantida delicada e proporcional.
 */

/* ═══════════════════════════════════════════════════════════
    MÓDULO: IMPORTS
   ═══════════════════════════════════════════════════════════ */
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
  clubName: string;
  profileName?: string;
  profileCity?: string;
  profileState?: string;
  ambassadorLevel?: string;
  pageLabel?: string;
  showProfileInfo?: boolean;
}

/* ═══════════════════════════════════════════════════════════
    MÓDULO: UTILITÁRIOS (LUMINÂNCIA PARA ORDENAÇÃO)
   ═══════════════════════════════════════════════════════════ */
const calculateLuminance = (hex: string): number => {
  if (!hex) return 1;
  const c = hex.replace("#", "");
  if (c.length !== 6) return 1;
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/* ═══════════════════════════════════════════════════════════
    MÓDULO: COMPONENTE PRINCIPAL
   ═══════════════════════════════════════════════════════════ */
const ClubBanner = ({
  clubName,
  profileName = "BETO BORELLI",
  profileCity = "GOIÂNIA",
  profileState = "GO",
  ambassadorLevel = "BRONZE",
  pageLabel,
  showProfileInfo = false,
}: ClubBannerProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();

  /* ═══════════════════════════════════════════════════════════
      MÓDULO: ESTADO E TEMA
     ═══════════════════════════════════════════════════════════ */
  const [theme, setTheme] = useState({
    cor_primaria: "#1a1a1a",
    cor_secundaria: "#ffffff",
    cor_terciaria: "",
    escudo_url: "",
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
          cor_primaria: data.cor_primaria || "#1a1a1a",
          cor_secundaria: data.cor_secundaria || "#ffffff",
          cor_terciaria: data.cor_terciaria || "",
          escudo_url: data.escudo_url || "",
        });
      }
    };
    fetchTheme();
  }, [clubName]);

  /* ═══════════════════════════════════════════════════════════
      MÓDULO: LARGURA DAS COLUNAS (NARROW PRECISION)
     ═══════════════════════════════════════════════════════════ */
  const buildFlagGradient = (): string => {
    const colors = [theme.cor_primaria, theme.cor_secundaria, theme.cor_terciaria].filter(Boolean);
    const sorted = [...colors].sort((a, b) => calculateLuminance(a) - calculateLuminance(b));

    if (sorted.length === 3) {
      return `linear-gradient(115deg, 
        ${sorted[0]} 0%, ${sorted[0]} 36%, 
        ${sorted[1]} 36%, ${sorted[1]} 41%, 
        ${sorted[2]} 41%, ${sorted[2]} 46%, 
        ${sorted[0]} 46%, ${sorted[0]} 51%, 
        ${sorted[1]} 51%, ${sorted[1]} 100%)`;
    }

    return `linear-gradient(115deg, 
      ${sorted[0]} 0%, ${sorted[0]} 45%, 
      ${sorted[1] || "#ffffff"} 45%, ${sorted[1] || "#ffffff"} 50%, 
      ${sorted[1] || "#ffffff"} 50%, ${sorted[1] || "#ffffff"} 55%, 
      ${sorted[0]} 55%, ${sorted[0]} 100%)`;
  };

  /* ═══════════════════════════════════════════════════════════
      MÓDULO: NAVBAR (ESTRUTURA ORIGINAL PRESERVADA)
     ═══════════════════════════════════════════════════════════ */
  const isActive = (path: string) => location.pathname === path || location.pathname + location.hash === path;

  const NavItem = ({ icon: Icon, label, path, active, variant }: any) => (
    <button
      onClick={() => navigate(path)}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 text-[10px] font-black uppercase italic ${
        variant === "danger"
          ? "bg-red-600 text-white animate-pulse"
          : variant === "orange"
            ? "text-[#ff6200] border border-[#ff6200]/20 hover:bg-[#ff6200]/10"
            : active
              ? "bg-[#ff6200] text-white shadow-[0_0_15px_rgba(255,98,0,0.3)]"
              : "text-white/40 hover:text-white hover:bg-white/5"
      }`}
    >
      <Icon size={14} />
      <span className="hidden md:inline">{label}</span>
    </button>
  );

  return (
    <div className="w-full max-w-7xl mx-auto p-4">
      <style>{`
        @keyframes waveFlag {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>

      {/* ═══════ CONTAINER UNIFICADO (BANNER + NAVBAR) ═══════ */}
      {/* Borda definida em #1a1a1a para evitar misturas de cores */}
      <div className="overflow-hidden rounded-[2.5rem] border border-[#1a1a1a] shadow-2xl flex flex-col">
        {/* TOPO DO BANNER */}
        <section
          className="relative h-[180px] md:h-[220px] w-full flex items-center overflow-hidden"
          style={{
            background: buildFlagGradient(),
            backgroundSize: "200% 200%",
            animation: "waveFlag 25s ease-in-out infinite",
          }}
        >
          {/* Overlay de Textura Jersey */}
          <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

          <div className="relative z-10 flex items-center justify-between w-full px-6 md:px-16">
            <div className="flex items-center gap-4 md:gap-8">
              {/* ESCUDO (CHAPADO) */}
              <div className="w-[110px] h-[110px] md:w-[140px] md:h-[140px] rounded-full bg-white flex items-center justify-center border-2 border-black/5 shrink-0">
                <ClubLogo
                  src={theme.escudo_url}
                  alt={clubName}
                  className="w-[80%] h-[80%] object-contain drop-shadow-md"
                />
              </div>

              {/* TIPOGRAFIA */}
              <div className="flex flex-col text-white">
                {showProfileInfo ? (
                  <>
                    <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter drop-shadow-md leading-none">
                      {profileName}
                    </h2>
                    <div className="flex items-center gap-1.5 mt-1.5 text-[9px] md:text-xs font-bold uppercase opacity-90 italic">
                      <MapPin size={12} className="text-white/70" />
                      <span>
                        {profileCity}
                        {profileState ? `, ${profileState}` : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-[9px] md:text-xs font-black text-[#ff6200] italic uppercase tracking-widest drop-shadow">
                      <Trophy size={12} />
                      <span>EMBAIXADOR {ambassadorLevel}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-[9px] font-black uppercase tracking-[0.4em] opacity-70 mb-1">
                      {pageLabel || "TERRITÓRIO DE EMBAIXADOR"}
                    </span>
                    <h1 className="text-xl md:text-3xl font-black italic uppercase tracking-tighter leading-none drop-shadow-lg">
                      {clubName}
                    </h1>
                  </>
                )}
              </div>
            </div>

            {/* LADO DIREITO (CLUBE) */}
            {showProfileInfo && (
              <div className="hidden lg:flex flex-col items-end text-white text-right drop-shadow-lg">
                <span className="text-[9px] font-black uppercase italic opacity-70 tracking-[0.3em] mb-[-4px]">
                  CLUBE DO CORAÇÃO
                </span>
                <h1 className="text-xl md:text-3xl font-black italic uppercase tracking-tighter leading-none">
                  {clubName}
                </h1>
              </div>
            )}
          </div>
        </section>

        {/* NAVBAR INFERIOR (INTEGRADA NO CONTAINER) */}
        <nav className="flex items-center justify-center gap-1.5 bg-[#1a1a1a] px-4 py-3.5 overflow-x-auto no-scrollbar">
          <NavItem icon={Flame} label="MAPA DE CALOR" path="/mapa-calor" active={isActive("/mapa-calor")} />
          <NavItem icon={BarChart3} label="ESTATÍSTICAS" path="/estatisticas" active={isActive("/estatisticas")} />
          <NavItem
            icon={Crown}
            label="RANKING"
            path="/estatisticas#ranking"
            active={isActive("/estatisticas#ranking")}
          />
          <NavItem icon={Users} label="EMBAIXADORES" path="/embaixadores" active={isActive("/embaixadores")} />

          <div className="w-[1px] h-6 bg-white/10 mx-2 hidden md:block" />

          <NavItem icon={Vote} label="VOTAÇÃO" path="/voting" variant="orange" />

          {IS_MASTER && (
            <>
              <NavItem icon={Bug} label="DEBUG API" path="/debug-api" />
              <NavItem icon={ShieldAlert} label="PAINEL MASTER" path="/admin" variant="danger" />
            </>
          )}
        </nav>
      </div>
    </div>
  );
};

export default ClubBanner;

/**
 * [RODAPÉ TÉCNICO]
 * ARQUIVO: src/components/dashboard/ClubBanner.tsx
 * VERSÃO: 23.0
 * CORREÇÕES:
 * - Ajuste de Borda: Contorno agora utiliza a cor sólida #1a1a1a (cor da navbar).
 * - Estética: Removido o border-white/10 que causava misturas indesejadas com as cores do banner.
 * - Bug Fix: Corrigida função calculateLuminance que apresentava erro de sintaxe.
 * - Refinamento: Borda do escudo reduzida para border-black/5 para um visual mais limpo.
 */
