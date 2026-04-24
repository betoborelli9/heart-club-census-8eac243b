/**
 * [CAMINHO/ARQUIVO]: src/components/dashboard/ClubBanner.tsx
 * [MÓDULO]: COMPONENTE GLOBAL DE BRANDING (BANNER + NAVBAR)
 * [STATUS]: VERSÃO 15.0 (FLAG WAVE AUTO-THEME)
 * [DESCRIÇÃO]: Banner completo com topo tremulando como bandeira
 *              e navbar integrada. Cores e escudo buscados do Supabase.
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
      MÓDULO: ESTADOS E CONFIGURAÇÕES DE TEMA
     ═══════════════════════════════════════════════════════════ */
  const [theme, setTheme] = useState({
    cor_primaria: "#1a1a1a",
    cor_secundaria: "#ffffff",
    cor_terciaria: "#ff0000",
    escudo_url: "",
  });

  const IS_MASTER = user?.email === "betoborelli9@gmail.com";

  /* ═══════════════════════════════════════════════════════════
      MÓDULO: BUSCA DE CORES NO SUPABASE
     ═══════════════════════════════════════════════════════════ */
  useEffect(() => {
    const fetchClubTheme = async () => {
      const { data } = await supabase
        .from("clubes_cache")
        .select("cor_primaria, cor_secundaria, cor_terciaria, escudo_url")
        .ilike("nome", `%${clubName}%`)
        .limit(1)
        .single();

      if (data) setTheme(data);
    };
    fetchClubTheme();
  }, [clubName]);

  /* ═══════════════════════════════════════════════════════════
      MÓDULO: DEFINIÇÃO DE ITENS DA NAVBAR
     ═══════════════════════════════════════════════════════════ */
  const NAV_ITEMS = [
    { label: "MAPA DE CALOR", icon: Flame, path: "/mapa-calor" },
    { label: "ESTATÍSTICAS", icon: BarChart3, path: "/estatisticas" },
    { label: "RANKING", icon: Crown, path: "/estatisticas#ranking" },
    { label: "EMBAIXADORES", icon: Users, path: "/embaixadores" },
  ];

  const isActive = (path: string) => location.pathname === path || location.pathname + location.hash === path;

  /* ═══════════════════════════════════════════════════════════
      MÓDULO: INTERFACE VISUAL DO TOPO (BANDEIRA TREMULANDO)
     ═══════════════════════════════════════════════════════════ */
  return (
    <div className="w-full space-y-0">
      <section
        className="relative overflow-hidden rounded-t-[2.5rem] h-[200px] md:h-[240px] flex items-center shadow-2xl"
        style={{
          background: `linear-gradient(90deg, ${theme.cor_primaria} 0%, ${theme.cor_secundaria} 50%, ${theme.cor_terciaria || theme.cor_secundaria} 100%)`,
          backgroundSize: "200% 200%",
          animation: "waveFlag 6s ease-in-out infinite",
        }}
      >
        <div className="relative z-10 flex items-center justify-between w-full px-6 md:px-12">
          <div className="flex items-center gap-6">
            <div
              className="w-[120px] h-[120px] md:w-[160px] md:h-[160px] rounded-full bg-white flex items-center justify-center shadow-2xl border-4 border-white/10"
              style={{ boxShadow: `0 0 30px ${theme.cor_primaria}66` }}
            >
              <ClubLogo src={theme.escudo_url} alt={clubName} className="w-[85%] h-[85%] object-contain" />
            </div>

            {showProfileInfo ? (
              <div className="flex flex-col">
                <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tight text-white">
                  {profileName}
                </h2>
                <div className="flex items-center gap-1 text-xs md:text-sm font-bold opacity-70 uppercase text-white">
                  <MapPin size={12} /> {profileCity}{profileState ? `, ${profileState}` : ""}
                </div>
                <div className="flex items-center gap-1 text-xs md:text-sm font-black text-[#ff6200] italic mt-1 uppercase">
                  <Trophy size={12} /> EMBAIXADOR {ambassadorLevel}
                </div>
              </div>
            ) : (
              <div className="flex flex-col">
                <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.4em] opacity-70 text-white">
                  {pageLabel || "TERRITÓRIO DE EMBAIXADOR"}
                </p>
                <h1 className="text-3xl md:text-6xl font-black italic uppercase tracking-tighter leading-none text-white">
                  {clubName}
                </h1>
              </div>
            )}
          </div>

          {showProfileInfo && (
            <div className="hidden md:flex flex-col items-end text-right">
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] opacity-50 text-white">
                Clube do Coração
              </span>
              <h1 className="text-4xl font-black italic uppercase text-white">
                {clubName}
              </h1>
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          MÓDULO: NAVBAR INTEGRADA (NÃO ALTERADA)
         ═══════════════════════════════════════════════════════════ */}
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

        {IS_MASTER && (
          <>
            <button
              onClick={() => navigate("/voting")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase text-[#ff6200] hover:bg-[#ff6200]/10 transition-all border border-[#ff6200]/20"
            >
              <Vote size={14} />
              <span className="hidden md:inline">VOTAÇÃO</span>
            </button>

            <button
              onClick={() => navigate("/debug-api")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase text-white/70 hover:text-white hover:bg-white/10 transition-all border border-white/20"
            >
              <Bug