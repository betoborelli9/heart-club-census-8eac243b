/**
 * [CAMINHO/ARQUIVO]: src/components/dashboard/ClubBanner.tsx
 * [MÓDULO]: BRANDING & DASHBOARD NAVIGATION
 * [STATUS]: VERSÃO 30.0 (TEXT SHADOW REFINEMENT — ALIGNMENT SYNC)
 * [DESCRIÇÃO]: Banner unificado com layouts distintos e legibilidade blindada.
 * - Legibilidade: Adicionado contorno (text-shadow) em todos os textos para destaque em qualquer cor.
 * - Desktop: Identidade do clube movida para a base (inferior direito).
 * - Mobile: Perfil (Nome/Cidade/Nível) centralizado verticalmente com o emblema.
 * - Escala: Emblema 180px (Desktop) / 110px (Mobile).
 * - Borda: Contorno unificado em #1a1a1a.
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
  profileName = "",
  profileCity = "",
  profileState = "",
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

  // Estilo de contorno universal para os textos
  const textOutlineStyle = {
    textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 4px 8px rgba(0,0,0,0.5)",
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4">
      <style>{`
        @keyframes waveFlag {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>

      {/* ═══════ CONTAINER UNIFICADO (BANNER + NAVBAR) ═══════ */}
      <div className="overflow-hidden rounded-[2.5rem] border border-[#1a1a1a] shadow-2xl flex flex-col">
        {/* TOPO DO BANNER */}
        <section
          className="relative h-[240px] md:h-[220px] w-full flex items-center overflow-hidden"
          style={{
            background: buildFlagGradient(),
            backgroundSize: "200% 200%",
            animation: "waveFlag 30s ease-in-out infinite",
          }}
        >
          <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

          <div className="relative z-10 h-full w-full flex flex-row items-center justify-between px-6 md:px-16">
            {/* LADO ESQUERDO: ESCUDO + PERFIL (DESKTOP) */}
            <div className="flex items-center h-full shrink-0">
              <div className="w-[110px] h-[110px] md:w-[180px] md:h-[180px] rounded-full bg-white flex items-center justify-center shrink-0 shadow-xl border-4 border-white/10">
                <ClubLogo
                  src={theme.escudo_url}
                  alt={clubName}
                  className="w-[80%] h-[80%] object-contain drop-shadow-md"
                />
              </div>

              {/* BLOCO DE PERFIL (SOMENTE DESKTOP - CENTRALIZADO VERTICALMENTE) */}
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
                  <div
                    className="flex items-center gap-2 mt-2 text-xs font-black text-white italic uppercase tracking-widest"
                    style={textOutlineStyle}
                  >
                    <Trophy size={12} className="text-orange-500" />
                    <span>EMBAIXADOR {ambassadorLevel}</span>
                  </div>
                </div>
              )}
            </div>

            {/* LADO DIREITO: PERFIL (MOBILE) + CLUBE (AMBOS) */}
            <div className="flex-1 flex flex-col h-full items-end text-right py-4 md:py-6">
              {/* BLOCO DE PERFIL (SOMENTE MOBILE - CENTRALIZADO VERTICALMENTE COM EMBLEMA) */}
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
                  <div
                    className="flex items-center gap-1.5 mt-1 text-[9px] font-black text-white italic uppercase tracking-widest"
                    style={textOutlineStyle}
                  >
                    <Trophy size={12} className="text-orange-500" />
                    <span>EMBAIXADOR {ambassadorLevel}</span>
                  </div>
                </div>
              )}

              {/* IDENTIDADE DO CLUBE (ANCOTRADO NA BASE EM AMBOS OS LAYOUTS) */}
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

        {/* NAVBAR INFERIOR */}
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
 * VERSÃO: 30.0
 * CORREÇÕES:
 * - Legibilidade: Implementado 'textOutlineStyle' via text-shadow em todos os textos para garantir contraste sobre branco ou cores claras.
 * - Desktop Layout: Clube do Coração reposicionado para a base direita (mt-auto) para harmonia visual.
 * - Mobile Alinhamento: Perfil centralizado verticalmente no eixo do emblema (justify-center dentro de flex-1).
 * - Estética: Removido o glow dinâmico para manter o círculo branco chapado e profissional.
 */
