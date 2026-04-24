/**
 * [CAMINHO/ARQUIVO]: src/components/dashboard/ClubBanner.tsx
 * [MÓDULO]: COMPONENTE GLOBAL DE BRANDING (BANNER + NAVBAR)
 * [STATUS]: VERSÃO 17.0 (FLAG WAVE — TIPOGRAFIA DELICADA & TRICOLOR INTELIGENTE)
 * [DESCRIÇÃO]: Banner com bandeira tremulando em diagonais (tricolor/bicolor),
 *              cores buscadas em clubes_cache, círculo branco com escudo,
 *              tipografia proporcional mobile/desktop. Navbar inferior preservada.
 */

/* ═══════════════════════════════════════════════════════════
    MÓDULO: IMPORTS
   ═══════════════════════════════════════════════════════════ */
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Flame,
  BarChart3,
  Crown,
  Users,
  MapPin,
  Trophy,
  ShieldAlert,
  Vote,
  Bug,
} from "lucide-react";
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
  /* Props legadas mantidas para compatibilidade com Dashboard/Ambassadors */
  clubData?: any;
  theme?: any;
}

/* ═══════════════════════════════════════════════════════════
    MÓDULO: UTILITÁRIO — LUMINÂNCIA (definir cor mais forte)
   ═══════════════════════════════════════════════════════════ */
const luminance = (hex: string): number => {
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
  profileName,
  profileCity,
  profileState,
  ambassadorLevel = "Bronze",
  pageLabel,
  showProfileInfo = false,
}: ClubBannerProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();

  /* ═══════════════════════════════════════════════════════════
      MÓDULO: ESTADO DE TEMA DO CLUBE
     ═══════════════════════════════════════════════════════════ */
  const [clubTheme, setClubTheme] = useState({
    cor_primaria: "#1a1a1a",
    cor_secundaria: "#ffffff",
    cor_terciaria: "",
    escudo_url: "",
  });

  const IS_MASTER = user?.email === "betoborelli9@gmail.com";

  /* ═══════════════════════════════════════════════════════════
      MÓDULO: BUSCA DE CORES NO SUPABASE (clubes_cache)
     ═══════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!clubName) return;
    const fetchClubTheme = async () => {
      const { data } = await supabase
        .from("clubes_cache")
        .select("cor_primaria, cor_secundaria, cor_terciaria, escudo_url")
        .ilike("nome", `%${clubName}%`)
        .limit(1)
        .maybeSingle();

      if (data) {
        setClubTheme({
          cor_primaria: data.cor_primaria || "#1a1a1a",
          cor_secundaria: data.cor_secundaria || "#ffffff",
          cor_terciaria: data.cor_terciaria || "",
          escudo_url: data.escudo_url || "",
        });
      }
    };
    fetchClubTheme();
  }, [clubName]);

  /* ═══════════════════════════════════════════════════════════
      MÓDULO: MONTAGEM DO GRADIENTE (BANDEIRA DIAGONAL)
      Regra: cor mais forte (menor luminância) ocupa o primeiro
      espaço do banner para realçar o círculo branco com o escudo.
     ═══════════════════════════════════════════════════════════ */
  const buildFlagGradient = (): string => {
    const c1 = clubTheme.cor_primaria;
    const c2 = clubTheme.cor_secundaria;
    const c3 = clubTheme.cor_terciaria;

    if (c3) {
      // Tricolor — ordena por luminância (mais escura primeiro)
      const ordered = [c1, c2, c3].sort((a, b) => luminance(a) - luminance(b));
      return `linear-gradient(135deg,
        ${ordered[0]} 0%,
        ${ordered[0]} 32%,
        ${ordered[1]} 33%,
        ${ordered[1]} 65%,
        ${ordered[2]} 66%,
        ${ordered[2]} 100%)`;
    }

    // Bicolor — fecha sempre com a segunda cor mais forte
    const ordered = [c1, c2].sort((a, b) => luminance(a) - luminance(b));
    return `linear-gradient(135deg,
      ${ordered[0]} 0%,
      ${ordered[0]} 50%,
      ${ordered[1]} 51%,
      ${ordered[1]} 100%)`;
  };

  /* ═══════════════════════════════════════════════════════════
      MÓDULO: ITENS DA NAVBAR
     ═══════════════════════════════════════════════════════════ */
  const NAV_ITEMS = [
    { label: "MAPA DE CALOR", icon: Flame, path: "/mapa-calor" },
    { label: "ESTATÍSTICAS", icon: BarChart3, path: "/estatisticas" },
    { label: "RANKING", icon: Crown, path: "/estatisticas#ranking" },
    { label: "EMBAIXADORES", icon: Users, path: "/embaixadores" },
  ];

  const isActive = (path: string) =>
    location.pathname === path || location.pathname + location.hash === path;

  /* ═══════════════════════════════════════════════════════════
      MÓDULO: RENDER
     ═══════════════════════════════════════════════════════════ */
  return (
    <div className="w-full space-y-0">
      {/* Keyframes inline da bandeira tremulando */}
      <style>{`
        @keyframes waveFlag {
          0%   { background-position: 0% 50%; transform: skewY(0deg); }
          25%  { background-position: 50% 40%; transform: skewY(-0.4deg); }
          50%  { background-position: 100% 50%; transform: skewY(0deg); }
          75%  { background-position: 50% 60%; transform: skewY(0.4deg); }
          100% { background-position: 0% 50%; transform: skewY(0deg); }
        }
      `}</style>

      {/* ═══════ TOPO DO BANNER (BANDEIRA DIAGONAL TREMULANDO) ═══════ */}
      <section
        className="relative overflow-hidden rounded-t-[2.5rem] h-[180px] md:h-[240px] flex items-center shadow-2xl"
        style={{
          background: buildFlagGradient(),
          backgroundSize: "300% 300%",
          animation: "waveFlag 8s ease-in-out infinite",
        }}
      >
        {/* Sombra de tecido para profundidade */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 20% 30%, rgba(255,255,255,0.08), transparent 60%), radial-gradient(ellipse at 80% 70%, rgba(0,0,0,0.25), transparent 60%)",
          }}
        />

        <div className="relative z-10 flex items-center justify-between w-full px-4 md:px-12">
          {/* ESQUERDA — Escudo + Identidade */}
          <div className="flex items-center gap-4 md:gap-6">
            <div
              className="w-[120px] h-[120px] md:w-[160px] md:h-[160px] rounded-full bg-white flex items-center justify-center shadow-2xl border-4 border-white/20 shrink-0"
              style={{ boxShadow: `0 0 30px ${clubTheme.cor_primaria}99` }}
            >
              <ClubLogo
                src={clubTheme.escudo_url}
                alt={clubName}
                className="w-[85%] h-[85%] object-contain"
              />
            </div>

            {showProfileInfo ? (
              <div className="flex flex-col">
                <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tight text-white drop-shadow-lg">
                  {profileName}
                </h2>
                <div className="flex items-center gap-1 text-xs md:text-sm font-bold opacity-80 uppercase text-white mt-1">
                  <MapPin size={12} /> {profileCity}
                  {profileState ? `, ${profileState}` : ""}
                </div>
                <div className="flex items-center gap-1 text-xs md:text-sm font-black text-[#ff6200] italic mt-1 uppercase drop-shadow">
                  <Trophy size={12} /> EMBAIXADOR {ambassadorLevel}
                </div>
              </div>
            ) : (
              <div className="flex flex-col">
                <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.4em] opacity-80 text-white">
                  {pageLabel || "TERRITÓRIO DE EMBAIXADOR"}
                </p>
                <h1 className="text-2xl md:text-4xl font-black italic uppercase tracking-tighter leading-none text-white drop-shadow-lg">
                  {clubName}
                </h1>
              </div>
            )}
          </div>

          {/* DIREITA — Clube do Coração */}
          {showProfileInfo && (
            <div className="flex flex-col items-end text-right shrink-0">
              <span className="text-[9px] md:text-xs font-bold uppercase tracking-[0.3em] opacity-70 text-white">
                Clube do Coração
              </span>
              <h1 className="text-2xl md:text-4xl font-black italic uppercase text-white drop-shadow-lg">
                {clubName}
              </h1>
            </div>
          )}
        </div>
      </section>

      {/* ═══════ NAVBAR INFERIOR (PRESERVADA) ═══════ */}
      <nav className="flex items-center justify-center gap-1 bg-[#1a1a1a] border border-white/5 border-t-0 rounded-b-[1.5rem] px-2 py-3 shadow-xl">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all duration-300 ${
              isActive(item.path)
                ? "bg-[#ff6200] text-white shadow-[0_0_15px_rgba(255,98,0,0.3)]"
                : "text-white/40 hover:text-white hover:bg-white/5"
            }`}
          >
            <item.icon size={14} />
            <span className="hidden md:inline">{item.label}</span>
          </button>
        ))}

        {/* LINK DE VOTAÇÃO - ROTA CORRIGIDA PARA /voting */}
        {IS_MASTER && (
          <button
            onClick={() => navigate("/voting")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase text-[#ff6200] hover:bg-[#ff6200]/10 transition-all border border-[#ff6200]/20"
          >
            <Vote size={14} />
            <span className="hidden md:inline">VOTAÇÃO</span>
          </button>
        )}

        {IS_MASTER && (
          <button
            onClick={() => navigate("/debug-api")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase text-white/70 hover:text-white hover:bg-white/10 transition-all border border-white/20"
          >
            <Bug size={14} />
            <span className="hidden md:inline">DEBUG API</span>
          </button>
        )}

        {IS_MASTER && (
          <button
            onClick={() => navigate("/admin")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase bg-red-600 text-white animate-pulse"
          >
            <ShieldAlert size={14} />
            <span className="hidden md:inline">PAINEL MASTER</span>
          </button>
        )}
      </nav>
    </div>
  );
};

export default ClubBanner;

/**
 * [RODAPÉ TÉCNICO]
 * ARQUIVO: src/components/dashboard/ClubBanner.tsx
 * VERSÃO: 17.0
 * CORREÇÕES:
 *  - Gradiente diagonal tricolor/bicolor com cor mais forte no início.
 *  - Animação waveFlag (bandeira tremulando) via @keyframes inline.
 *  - Tipografia proporcional mobile/desktop (delicada e elegante).
 *  - Navbar inferior preservada integralmente.
 *  - Props clubData/theme mantidas como opcionais (compat. Dashboard/Ambassadors).
 */
