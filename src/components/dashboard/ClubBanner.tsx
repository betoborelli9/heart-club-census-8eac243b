/**
 * [CAMINHO/ARQUIVO]: src/components/dashboard/ClubBanner.tsx
 * [MÓDULO]: BRANDING & DASHBOARD NAVIGATION
 * [STATUS]: VERSÃO 18.0 (FLAG WAVE — REPLICA VISUAL PROPORCIONAL)
 * [DESCRIÇÃO]: Banner com fundo de bandeira diagonal (tricolor/bicolor) modularizado.
 * - Hierarquia de cores via luminância (cor mais forte no início).
 * - Tipografia delicada e proporcional conforme referências.
 * - Animação waveFlag e Navbar preservada.
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
    MÓDULO: UTILITÁRIOS (LUMINÂNCIA & LÓGICA VISUAL)
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
      MÓDULO: CONFIGURAÇÕES DE TEMA & BUSCA DE CORES
     ═══════════════════════════════════════════════════════════ */
  const [theme, setTheme] = useState({
    cor_primaria: "#1a1a1a",
    cor_secundaria: "#ffffff",
    cor_terciaria: "",
    escudo_url: "",
    loaded: false,
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
          loaded: true,
        });
      }
    };
    fetchTheme();
  }, [clubName]);

  /* ═══════════════════════════════════════════════════════════
      MÓDULO: LARGURA DAS DIAGONAIS (LOGICA DE FUNDO)
     ═══════════════════════════════════════════════════════════ */
  const getFlagBackground = (): string => {
    const colors = [theme.cor_primaria, theme.cor_secundaria, theme.cor_terciaria].filter(Boolean);
    // Ordena por luminância: a mais forte (escura) vem primeiro (menor valor)
    const ordered = [...colors].sort((a, b) => calculateLuminance(a) - calculateLuminance(b));

    if (ordered.length === 3) {
      return `linear-gradient(135deg, 
        ${ordered[0]} 0%, ${ordered[0]} 35%, 
        ${ordered[1]} 35%, ${ordered[1]} 65%, 
        ${ordered[2]} 65%, ${ordered[2]} 100%)`;
    }

    return `linear-gradient(135deg, 
      ${ordered[0]} 0%, ${ordered[0]} 50%, 
      ${ordered[1] || "#ffffff"} 50%, ${ordered[1] || "#ffffff"} 100%)`;
  };

  /* ═══════════════════════════════════════════════════════════
      MÓDULO: NAVBAR (ESTRUTURA PRESERVADA)
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
    <div className="w-full max-w-7xl mx-auto p-4 space-y-0">
      {/* CSS INLINE PARA ANIMAÇÃO WAVE */}
      <style>{`
        @keyframes waveFlag {
          0%, 100% { background-position: 0% 50%; transform: skewY(0deg); }
          50% { background-position: 100% 50%; transform: skewY(0.2deg); }
        }
      `}</style>

      {/* ═══════ TOPO DO BANNER (JERSEY / FLAG SECTION) ═══════ */}
      <section
        className="relative h-[200px] md:h-[280px] w-full rounded-t-[2.5rem] overflow-hidden flex items-center shadow-2xl"
        style={{
          background: getFlagBackground(),
          backgroundSize: "200% 200%",
          animation: "waveFlag 10s ease-in-out infinite",
        }}
      >
        {/* Overlay de Textura para Rugosidade de Tecido */}
        <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

        <div className="relative z-10 flex items-center justify-between w-full px-6 md:px-16">
          {/* LADO ESQUERDO: ESCUDO + INFO PERFIL */}
          <div className="flex items-center gap-4 md:gap-8">
            <div
              className="w-[120px] h-[120px] md:w-[160px] md:h-[160px] rounded-full bg-white flex items-center justify-center border-4 border-white/20 shadow-2xl transition-transform duration-500 hover:scale-105"
              style={{ boxShadow: `0 20px 40px -10px ${theme.cor_primaria}CC` }}
            >
              <ClubLogo
                src={theme.escudo_url}
                alt={clubName}
                className="w-[80%] h-[80%] object-contain drop-shadow-md"
              />
            </div>

            <div className="flex flex-col text-white">
              {showProfileInfo ? (
                <>
                  <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter drop-shadow-md">
                    {profileName}
                  </h2>
                  <div className="flex items-center gap-1.5 mt-1 text-[10px] md:text-sm font-bold uppercase opacity-90">
                    <MapPin size={14} className="text-white/70" />
                    <span>
                      {profileCity}
                      {profileState ? `, ${profileState}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-[10px] md:text-sm font-black text-[#ff6200] italic uppercase tracking-widest drop-shadow">
                    <Trophy size={14} />
                    <span>EMBAIXADOR {ambassadorLevel}</span>
                  </div>
                </>
              ) : (
                <>
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-70 mb-[-4px]">
                    {pageLabel || "TERRITÓRIO DE EMBAIXADOR"}
                  </span>
                  <h1 className="text-2xl md:text-4xl font-black italic uppercase tracking-tighter drop-shadow-lg">
                    {clubName}
                  </h1>
                </>
              )}
            </div>
          </div>

          {/* LADO DIREITO: CLUBE (SOMENTE SE PROFILE ESTIVER ATIVO) */}
          {showProfileInfo && (
            <div className="hidden lg:flex flex-col items-end text-white text-right drop-shadow-lg">
              <span className="text-[10px] font-black uppercase italic opacity-70 tracking-[0.3em] mb-[-6px]">
                CLUBE DO CORAÇÃO
              </span>
              <h1 className="text-2xl md:text-4xl font-black italic uppercase tracking-tighter">{clubName}</h1>
            </div>
          )}
        </div>
      </section>

      {/* ═══════ NAVBAR INFERIOR (PRESERVADA) ═══════ */}
      <nav className="flex items-center justify-center gap-1.5 bg-[#1a1a1a] border border-white/5 border-t-0 rounded-b-[2rem] px-4 py-3.5 shadow-2xl overflow-x-auto no-scrollbar">
        <NavItem icon={Flame} label="MAPA DE CALOR" path="/mapa-calor" active={isActive("/mapa-calor")} />
        <NavItem icon={BarChart3} label="ESTATÍSTICAS" path="/estatisticas" active={isActive("/estatisticas")} />
        <NavItem icon={Crown} label="RANKING" path="/estatisticas#ranking" active={isActive("/estatisticas#ranking")} />
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
  );
};

export default ClubBanner;

/**
 * [RODAPÉ TÉCNICO]
 * ARQUIVO: src/components/dashboard/ClubBanner.tsx
 * VERSÃO: 18.0
 * CORREÇÕES:
 * - Implementação de luminância para garantir cor mais forte no início (contraste do escudo).
 * - Diagonais secas (Hard Stops) em 135 graus: Tricolor (35/30/35) e Bicolor (50/50).
 * - Tipografia delicada: Nome Perfil (3xl), Nome Clube (4xl), Detalhes (sm).
 * - Navbar preservada com lógica IS_MASTER e estados ativos.
 * - Adicionada animação waveFlag suave sem quebrar o layout.
 */
