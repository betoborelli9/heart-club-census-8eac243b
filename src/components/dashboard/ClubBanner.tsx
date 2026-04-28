/**
 * [CAMINHO/ARQUIVO]: src/components/dashboard/ClubBanner.tsx
 * [MÓDULO]: BRANDING & DASHBOARD NAVIGATION
 * [STATUS]: VERSÃO 39.0 (HYBRID FIXED MEASURES — RESPONSIVE)
 * [DESCRIÇÃO]:
 * - Desktop: Mantido em 150px (Círculo) e 115px (Emblema).
 * - Mobile: Restaurado para 110px (Círculo) e 90px (Emblema) para manter a forma redonda.
 * - Correção: Adicionado prefixo md: na altura para evitar achatamento no celular.
 */

/* ═══════════════════════════════════════════════════════════
    MÓDULO: IMPORTS
   ═══════════════════════════════════════════════════════════ */
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Flame, BarChart3, Crown, Users, MapPin, Trophy, ShieldAlert, Vote, FlaskConical } from "lucide-react";
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
    MÓDULO: UTILITÁRIOS
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
  showProfileInfo = false,
}: ClubBannerProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();

  // Fallback oficial: NUNCA cinza. Camisa Vermelho/Preto/Branco.
  const FALLBACK_THEME = {
    cor_primaria: "#e11d48",
    cor_secundaria: "#000000",
    cor_terciaria: "#ffffff",
    cor_quarta: "",
    escudo_url: "",
  };
  const [theme, setTheme] = useState(FALLBACK_THEME);

  const IS_MASTER = user?.email === "betoborelli9@gmail.com";
  const hasLevel = ambassadorLevel && ambassadorLevel.toUpperCase() !== "NONE";
  const canSeeAmbassador = hasLevel || IS_MASTER;
  const displayLevel = IS_MASTER ? "DIAMANTE" : ambassadorLevel || "BRONZE";

  useEffect(() => {
    if (!clubName || clubName === "SELECIONE SEU CLUBE") {
      setTheme(FALLBACK_THEME);
      return;
    }
    let cancelled = false;

    const SELECT = "cor_primaria, cor_secundaria, cor_terciaria, cor_quarta, escudo_url, nome, nome_curto";

    const fetchTheme = async () => {
      const term = clubName.trim();
      console.log("[ClubBanner] Buscando clube:", term);

      // 1) Match exato case-insensitive em `nome` ou `nome_curto`
      let { data, error } = await supabase
        .from("clubes_cache")
        .select(SELECT)
        .or(`nome.ilike.${term},nome_curto.ilike.${term}`)
        .limit(1)
        .maybeSingle();

      // 2) Match parcial com wildcards (cobre "Vila Nova FC" vs "Vila Nova")
      if (!data) {
        const partial = await supabase
          .from("clubes_cache")
          .select(SELECT)
          .ilike("nome", `%${term}%`)
          .order("nome", { ascending: true })
          .limit(1)
          .maybeSingle();
        data = partial.data;
        error = partial.error;
      }

      // 3) Última tentativa: primeira palavra significativa
      if (!data && term.includes(" ")) {
        const firstWord = term.split(" ").find((w) => w.length > 2) ?? term.split(" ")[0];
        const retry = await supabase
          .from("clubes_cache")
          .select(SELECT)
          .ilike("nome", `%${firstWord}%`)
          .limit(1)
          .maybeSingle();
        data = retry.data;
        error = retry.error;
      }

      console.log("[ClubBanner] Retorno do Supabase:", { data, error });
      if (cancelled) return;

      if (data) {
        setTheme({
          cor_primaria: data.cor_primaria || FALLBACK_THEME.cor_primaria,
          cor_secundaria: data.cor_secundaria || FALLBACK_THEME.cor_secundaria,
          cor_terciaria: data.cor_terciaria || FALLBACK_THEME.cor_terciaria,
          cor_quarta: (data as any).cor_quarta || "",
          escudo_url: data.escudo_url || "",
        });
      } else {
        setTheme(FALLBACK_THEME);
      }
    };

    fetchTheme();
    return () => { cancelled = true; };
  }, [clubName]);

  const buildFlagGradient = (): string => {
    const colors = [theme.cor_primaria, theme.cor_secundaria, theme.cor_terciaria, theme.cor_quarta].filter(Boolean);
    const sorted = [...colors].sort((a, b) => calculateLuminance(a) - calculateLuminance(b));

    if (sorted.length === 4) {
      return `linear-gradient(115deg, ${sorted[0]} 0%, ${sorted[0]} 34%, ${sorted[1]} 34%, ${sorted[1]} 38%, ${sorted[2]} 38%, ${sorted[2]} 42%, ${sorted[3]} 42%, ${sorted[3]} 46%, ${sorted[0]} 46%, ${sorted[0]} 100%)`;
    }

    if (sorted.length === 3) {
      return `linear-gradient(115deg, ${sorted[0]} 0%, ${sorted[0]} 34%, ${sorted[1]} 34%, ${sorted[1]} 38%, ${sorted[2]} 38%, ${sorted[2]} 42%, ${sorted[0]} 42%, ${sorted[0]} 46%, ${sorted[1]} 46%, ${sorted[1]} 100%)`;
    }

    const strong = sorted[0];
    const light = sorted[1] || "#ffffff";
    return `linear-gradient(115deg, ${strong} 0%, ${strong} 34%, ${light} 34%, ${light} 38%, ${strong} 38%, ${strong} 39%, ${light} 39%, ${light} 43%, ${strong} 43%, ${strong} 44%, ${light} 44%, ${light} 48%, ${strong} 48%, ${strong} 100%)`;
  };

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
        {/* BANNER (ALTURA 180px) */}
        <section
          className="relative h-[180px] md:h-[180px] w-full flex items-center overflow-hidden"
          style={{
            background: buildFlagGradient(),
            backgroundSize: "200% 200%",
            animation: "waveFlag 30s ease-in-out infinite",
          }}
        >
          <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

          <div className="relative z-10 h-full w-full flex flex-row items-center justify-between px-6 md:px-16">
            <div className="flex items-center h-full shrink-0">
              {/* ═══════════════════════════════════════════════════════════
                  MÓDULO: TAMANHO DO CÍRCULO (BADGE)
                  - Mobile: 110px x 110px (Restaurado)
                  - Desktop: 120px x 120px (Excelente)
                 ═══════════════════════════════════════════════════════════ */}
              <div className="w-[110px] h-[110px] md:w-[120px] md:h-[120px] rounded-full bg-white flex items-center justify-center shrink-0 shadow-xl border-4 border-white/10 transition-all duration-500">
                {/* ═══════════════════════════════════════════════════════════
                    MÓDULO: TAMANHO DO EMBLEMA (PIXELS)
                    - Mobile: 90px (Equivalente a 82% de 110px)
                    - Desktop: 115px (Excelente)
                   ═══════════════════════════════════════════════════════════ */}
                <ClubLogo
                  src={theme.escudo_url}
                  alt={clubName}
                  className="w-[90px] h-[90px] md:w-[115px] md:h-[115px] object-contain drop-shadow-md"
                />
              </div>

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
              <NavItem icon={FlaskConical} label="TESTAR CLUBE" path="/voting?test=1" variant="orange" />
              <NavItem icon={ShieldAlert} label="PAINEL MASTER" path="/admin" variant="danger" />
            </>
          )}
        </nav>
      </div>
    </div>
  );
};

export default ClubBanner;
