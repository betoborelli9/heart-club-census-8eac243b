/**
 * [CAMINHO/ARQUIVO]: src/components/dashboard/ClubBanner.tsx
 * [MÓDULO]: BRANDING & DASHBOARD NAVIGATION
 * [STATUS]: VERSÃO 37.0 (BICOLOR TRIPLE-STRIPE PRECISION — SLIM PROFILE)
 * [DESCRIÇÃO]: Banner unificado com correção nas diagonais de clubes bicolores.
 * - Bicolores: Cor forte (ex: Vermelho/Verde) nas pontas e 3 faixas diagonais brancas centralizadas.
 * - Tricolores: Mantida lógica de alternância cromática nas diagonais.
 * - Perfil Slim: Altura de 240px e Emblema de 210px (Desktop) para elegância.
 * - Legibilidade: Mantido contorno 'enuviado' (soft shadow).
 */

/* ═══════════════════════════════════════════════════════════
    MÓDULO: IMPORTS
   ═══════════════════════════════════════════════════════════ */
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Flame, BarChart3, Crown, Users, MapPin, Trophy, ShieldAlert, Vote, Bug, Palette } from "lucide-react";
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
  ambassadorLevel?: string | null;
  pageLabel?: string;
  showProfileInfo?: boolean;
  clubData?: unknown;
  theme?: unknown;
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
  profileName = "",
  profileCity = "",
  profileState = "",
  ambassadorLevel = null,
  pageLabel,
  showProfileInfo = false,
}: ClubBannerProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();

  const [theme, setTheme] = useState({
    cor_primaria: "#1a1a1a",
    cor_secundaria: "#ffffff",
    cor_terciaria: "",
    escudo_url: "",
  });

  const IS_MASTER = user?.email === "betoborelli9@gmail.com";

  const hasLevel = ambassadorLevel && ambassadorLevel.toUpperCase() !== "NONE";
  const canSeeAmbassador = hasLevel || IS_MASTER;
  const displayLevel = IS_MASTER ? "DIAMANTE" : ambassadorLevel || "BRONZE";

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
      MÓDULO: LARGURA DAS COLUNAS (DIAGONAIS SÓLIDAS)
     ═══════════════════════════════════════════════════════════ */
  const buildFlagGradient = (): string => {
    const colors = [theme.cor_primaria, theme.cor_secundaria, theme.cor_terciaria].filter(Boolean);
    const sorted = [...colors].sort((a, b) => calculateLuminance(a) - calculateLuminance(b));

    // TRICOLOR (São Paulo, Santa Cruz)
    // Estrutura: Cor 1 | Cor 2 | Cor 3 | Cor 1 | Cor 2
    if (sorted.length === 3) {
      return `linear-gradient(115deg, 
        ${sorted[0]} 0%, ${sorted[0]} 34%, 
        ${sorted[1]} 34%, ${sorted[1]} 38%, 
        ${sorted[2]} 38%, ${sorted[2]} 42%, 
        ${sorted[0]} 42%, ${sorted[0]} 46%, 
        ${sorted[1]} 46%, ${sorted[1]} 100%)`;
    }

    // BICOLOR (Vila Nova, Palmeiras)
    // Estrutura: Cor Forte | Faixa Fraca | Forte | Faixa Fraca | Forte | Faixa Fraca | Forte
    const strong = sorted[0];
    const light = sorted[1] || "#ffffff";
    return `linear-gradient(115deg, 
      ${strong} 0%, ${strong} 34%, 
      ${light} 34%, ${light} 38%, 
      ${strong} 38%, ${strong} 39%, 
      ${light} 39%, ${light} 43%, 
      ${strong} 43%, ${strong} 44%, 
      ${light} 44%, ${light} 48%, 
      ${strong} 48%, ${strong} 100%)`;
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

  const textOutlineStyle = {
    textShadow: "0 0 10px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.8)",
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4">
      <style>{`
        @keyframes waveFlag {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>

      <div className="overflow-hidden rounded-[2.5rem] border border-[#1a1a1a] shadow-2xl flex flex-col">
        {/* TOPO DO BANNER - ALTURA SLIM (240px) */}
        <section
          className="relative h-[240px] md:h-[240px] w-full flex items-center overflow-hidden"
          style={{
            background: buildFlagGradient(),
            backgroundSize: "200% 200%",
            animation: "waveFlag 30s ease-in-out infinite",
          }}
        >
          <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

          <div className="relative z-10 h-full w-full flex flex-row items-center justify-between px-6 md:px-16">
            <div className="flex items-center h-full shrink-0">
              {/* EMBLEMA EQUILIBRADO (210px) */}
              <div className="w-[110px] h-[110px] md:w-[210px] md:h-[210px] rounded-full bg-white flex items-center justify-center shrink-0 shadow-xl border-4 border-white/10">
                <ClubLogo
                  src={theme.escudo_url}
                  alt={clubName}
                  className="w-[82%] h-[82%] object-contain drop-shadow-md"
                />
              </div>

              {/* PERFIL DESKTOP (CENTRALIZADO VERTICALMENTE) */}
              {showProfileInfo && (
                <div className="hidden md:flex flex-col text-white ml-8 h-full justify-center">
                  <h2
                    className="text-3xl font-black italic uppercase tracking-tighter leading-none mb-2"
                    style={textOutlineStyle}
                  >
                    {profileName || "CARREGANDO..."}
                  </h2>
                  <div
                    className="flex items-center gap-2 text-xs font-bold uppercase opacity-90 italic"
                    style={textOutlineStyle}
                  >
                    <MapPin size={12} className="text-white/70" />
                    <span>
                      {profileCity}
                      {profileState ? `, ${profileState}` : ""}
                    </span>
                  </div>
                  {canSeeAmbassador && (
                    <div
                      className="flex items-center gap-2 mt-2 text-xs font-black italic uppercase tracking-widest"
                      style={textOutlineStyle}
                    >
                      <Trophy size={14} className={IS_MASTER ? "text-cyan-400 animate-pulse" : "text-orange-500"} />
                      <span className={IS_MASTER ? "text-cyan-200" : "text-white"}>EMBAIXADOR {displayLevel}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col h-full items-end text-right py-4 md:py-6">
              {/* PERFIL MOBILE */}
              {showProfileInfo && (
                <div className="flex-1 md:hidden flex flex-col justify-center items-end text-white">
                  <h2
                    className="text-xl font-black italic uppercase tracking-tighter leading-none mb-1"
                    style={textOutlineStyle}
                  >
                    {profileName || "CARREGANDO..."}
                  </h2>
                  <div
                    className="flex items-center gap-1.5 text-[9px] font-bold uppercase opacity-90 italic"
                    style={textOutlineStyle}
                  >
                    <MapPin size={12} className="text-white/70" />
                    <span>
                      {profileCity}
                      {profileState ? `, ${profileState}` : ""}
                    </span>
                  </div>
                  {canSeeAmbassador && (
                    <div
                      className="flex items-center gap-1.5 mt-1 text-[9px] font-black text-white italic uppercase tracking-widest"
                      style={textOutlineStyle}
                    >
                      <Trophy size={12} className={IS_MASTER ? "text-cyan-400 animate-pulse" : "text-orange-500"} />
                      <span>EMBAIXADOR {ambassadorLevel || "BRONZE"}</span>
                    </div>
                  )}
                </div>
              )}

              {/* CLUBE DO CORAÇÃO (ANCORADO NA BASE) */}
              <div className="flex flex-col items-end justify-end text-white mt-auto">
                <span
                  className="text-[8px] md:text-[9px] font-black uppercase italic opacity-70 tracking-[0.3em] mb-[-4px]"
                  style={textOutlineStyle}
                >
                  Clube do Coração
                </span>
                <h1
                  className="text-xl md:text-4xl font-black italic uppercase tracking-tighter leading-none"
                  style={textOutlineStyle}
                >
                  {clubName}
                </h1>
              </div>
            </div>
          </div>
        </section>

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
 * VERSÃO: 37.0
 * CORREÇÕES:
 * - Lógica Bicolor: Ajustada para garantir cor forte nas extremidades e 3 listras brancas nítidas no centro (34% a 48%), separadas por finas linhas da cor principal.
 * - Alinhamento: Mantida a simetria com os clubes tricolores para consistência visual.
 * - Perfil Slim: Banner mantido em 240px para elegância.
 */
