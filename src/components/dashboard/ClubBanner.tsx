/**
 * [CAMINHO/ARQUIVO]: src/components/dashboard/ClubBannerTop.tsx
 * [MÓDULO]: COMPONENTE DE TOPO (BANDEIRA TREMULANDO)
 * [STATUS]: VERSÃO 15.0 (FLAG WAVE AUTO-THEME)
 * [DESCRIÇÃO]: Topo dinâmico com efeito de bandeira tremulando,
 *              aplicando cores e escudo do clube via Supabase.
 */

import { useEffect, useState } from "react";
import { MapPin, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ClubLogo } from "@/components/ClubLogo";

interface ClubBannerTopProps {
  clubName: string;
  profileName: string;
  profileCity: string;
  profileState?: string;
  ambassadorLevel?: string;
}

const ClubBannerTop = ({
  clubName,
  profileName,
  profileCity,
  profileState,
  ambassadorLevel = "Bronze",
}: ClubBannerTopProps) => {
  const [theme, setTheme] = useState({
    cor_primaria: "#1a1a1a",
    cor_secundaria: "#ffffff",
    cor_terciaria: "#ff0000",
    escudo_url: "",
  });

  /* ═══════════════════════════════════════════════════════════
      MÓDULO: BUSCA DE CORES E ESCUDO NO SUPABASE
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
      MÓDULO: INTERFACE VISUAL DO TOPO
     ═══════════════════════════════════════════════════════════ */
  return (
    <section
      className="relative overflow-hidden rounded-t-[2.5rem] h-[200px] md:h-[240px] flex items-center justify-between px-8 shadow-2xl"
      style={{
        background: `linear-gradient(90deg, ${theme.cor_primaria} 0%, ${theme.cor_secundaria} 50%, ${theme.cor_terciaria || theme.cor_secundaria} 100%)`,
        backgroundSize: "200% 200%",
        animation: "waveFlag 6s ease-in-out infinite",
      }}
    >
      {/* Emblema do Clube */}
      <div className="flex items-center gap-6 z-10">
        <div className="w-[120px] h-[120px] md:w-[160px] md:h-[160px] rounded-full bg-white flex items-center justify-center shadow-2xl border-4 border-white/10">
          <ClubLogo src={theme.escudo_url} alt={clubName} className="w-[85%] h-[85%] object-contain" />
        </div>

        {/* Informações do Perfil */}
        <div className="flex flex-col">
          <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tight text-white">{profileName}</h2>
          <div className="flex items-center gap-1 text-xs md:text-sm font-bold opacity-70 uppercase text-white">
            <MapPin size={12} /> {profileCity}
            {profileState ? `, ${profileState}` : ""}
          </div>
          <div className="flex items-center gap-1 text-xs md:text-sm font-black text-[#ff6200] italic mt-1 uppercase">
            <Trophy size={12} /> EMBAIXADOR {ambassadorLevel}
          </div>
        </div>
      </div>

      {/* Clube do Coração */}
      <div className="hidden md:flex flex-col items-end text-right z-10">
        <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] opacity-50 text-white">
          Clube do Coração
        </span>
        <h1 className="text-3xl md:text-5xl font-black italic uppercase text-white">{clubName}</h1>
      </div>
    </section>
  );
};

export default ClubBannerTop;

/**
 * [RODAPÉ TÉCNICO]
 * ARQUIVO: src/components/dashboard/ClubBannerTop.tsx
 * CORREÇÃO: Implementado efeito de bandeira tremulando via CSS animation.
 *           Gradiente dinâmico configurado com cores vindas do Supabase (clubes_cache).
 *           Ajustados tamanhos de fonte e emblema conforme referência visual.
 */
