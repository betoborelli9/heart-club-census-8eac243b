/**
 * [CAMINHO]&#58; src/components/dashboard/ClubBanner.tsx
 * [MÓDULO]&#58; COMPONENTE GLOBAL DE BRANDING (VISUAL PREMIUM REPLICADO)
 * [STATUS]&#58; VERSÃO 15.0 - FLAG MOTION REALISTA
 */

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Flame, BarChart3, Crown, Users, MapPin, Trophy, ShieldAlert, Vote } from "lucide-react";
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
  ambassadorLevel = "Bronze",
  showProfileInfo = true,
}: ClubBannerProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();

  const [theme, setTheme] = useState({
    cor_primaria: "#1a1a1a",
    cor_secundaria: "#111111",
    cor_terciaria: "#ffffff",
    escudo_url: "",
  });

  const IS_MASTER = user?.email === "betoborelli9@gmail.com";

  useEffect(() => {
    const fetchClubTheme = async () => {
      if (!clubName) return;

      const { data } = await supabase
        .from("clubes_cache")
        .select("cor_primaria, cor_secundaria, cor_terciaria, escudo_url")
        .ilike("nome", `%${clubName}%`)
        .limit(1)
        .single();

      if (data) {
        setTheme({
          cor_primaria: data.cor_primaria || "#ff6200",
          cor_secundaria: data.cor_secundaria || "#1a1a1a",
          cor_terciaria: data.cor_terciaria || "#ffffff",
          escudo_url: data.escudo_url || "",
        });
      }
    };

    fetchClubTheme();
  }, [clubName]);

  const bannerStyle = {
    background: `linear-gradient(115deg,
      ${theme.cor_secundaria} 0%,
      ${theme.cor_secundaria} 35%,
      ${theme.cor_terciaria} 35%,
      ${theme.cor_terciaria} 42%,
      ${theme.cor_primaria} 42%,
      ${theme.cor_primaria} 100%)`,
  };

  const NAV_ITEMS = [
    { label: "MAPA DE CALOR", icon: Flame, path: "/mapa-calor" },
    { label: "ESTATÍSTICAS", icon: BarChart3, path: "/estatisticas" },
    { label: "RANKING", icon: Crown, path: "/estatisticas#ranking" },
    { label: "EMBAIXADORES", icon: Users, path: "/embaixadores" },
  ];

  const isActive = (path: string) => location.pathname === path || location.pathname + location.hash === path;

  return (
    <div className="w-full max-w-7xl mx-auto p-4">
      <div className="relative h-[320px] md:h-[420px] w-full rounded-[48px] overflow-hidden shadow-2xl border border-white/10">
        {/* 🔥 FUNDO BASE */}
        <div className="absolute inset-0" style={bannerStyle} />

        {/* 🔥 ONDA DE BANDEIRA */}
        <div className="absolute inset-0 animate-[wave_6s_ease-in-out_infinite]" />

        {/* 🔥 LUZ DINÂMICA */}
        <div
          className="absolute inset-0 mix-blend-overlay animate-[light_4s_ease-in-out_infinite]"
          style={{
            background: "linear-gradient(120deg, rgba(255,255,255,0.15), transparent 60%)",
          }}
        />

        {/* 🔥 TEXTURA REALISTA */}
        <div className="absolute inset-0 opacity-30 mix-blend-overlay">
          <svg width="100%" height="100%">
            <filter id="fabric">
              <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="6" />
              <feDisplacementMap in="SourceGraphic" scale="35" />
            </filter>
            <rect width="100%" height="100%" filter="url(#fabric)" />
          </svg>
        </div>

        {/* CONTEÚDO */}
        <div className="relative h-full flex items-center justify-between px-12">
          {/* ESCUDO */}
          <div className="w-40 h-40 md:w-64 md:h-64">
            <ClubLogo src={theme.escudo_url} alt={clubName || ""} className="w-full h-full object-contain" />
          </div>

          {/* INFO */}
          <div className="text-white">
            <h2 className="text-5xl font-black italic uppercase">{profileName || "Beto Borelli"}</h2>

            <div className="flex gap-4 mt-2 text-sm font-bold italic">
              <span className="flex items-center gap-1">
                <MapPin size={16} /> {profileCity}, {profileState}
              </span>
              <span className="flex items-center gap-1 text-orange-400">
                <Trophy size={16} /> EMBAIXADOR {ambassadorLevel}
              </span>
            </div>
          </div>

          {/* CLUBE */}
          <div className="text-white text-right">
            <span className="text-xs uppercase opacity-70">Clube do Coração</span>
            <h1 className="text-6xl font-black italic uppercase">{clubName}</h1>
          </div>
        </div>

        {/* NAVBAR */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
          <div className="flex gap-3 bg-black/60 backdrop-blur-xl p-3 rounded-2xl">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase ${
                  isActive(item.path) ? "bg-[#ff6200] text-white" : "text-white/50 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}

            {IS_MASTER && (
              <>
                <button onClick={() => navigate("/voting")} className="text-orange-400 px-3 text-xs font-bold">
                  VOTAÇÃO
                </button>
                <button
                  onClick={() => navigate("/admin")}
                  className="bg-red-600 text-white px-4 rounded-xl text-xs font-bold animate-pulse"
                >
                  PAINEL MASTER
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClubBanner;

/**
 * [RODAPÉ TÉCNICO]
 * ARQUIVO: src/components/dashboard/ClubBanner.tsx
 * VERSÃO: 14.0 (AUTO-SYNC THEME)
 * MODIFICAÇÕES:
 * - Sincronização automática com a tabela 'clubes_cache' via useEffect.
 * - Replicado layout exato da Imagem 2 (Diagonal 115deg).
 * - Adicionada textura de tecido via SVG Turbulence Filter para realismo de camisa.
 * - Tipografia extra-bold italic (black italic) em todos os títulos.
 */
