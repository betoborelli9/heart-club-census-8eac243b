/**
 * [CAMINHO/ARQUIVO]: src/components/dashboard/ClubBanner.tsx
 * [MÓDULO]: COMPONENTE GLOBAL DE BRANDING (BANNER + NAVBAR)
 * [STATUS]: VERSÃO 15.0 (FLAG WAVE AUTO-THEME)
 * [DESCRIÇÃO]: Banner com efeito de bandeira tremulando,
 *              aplicando cores dinâmicas do clube via Supabase.
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ClubLogo } from "@/components/ClubLogo";

interface ClubBannerProps {
  clubName: string;
  clubData?: any;
  theme?: any;
  pageLabel?: string;
  ambassadorLevel?: string;
  profileName?: string;
  profileCity?: string;
  profileState?: string;
  showProfileInfo?: boolean;
}

const ClubBanner = ({ clubName }: ClubBannerProps) => {
  const [theme, setTheme] = useState({
    cor_primaria: "#1a1a1a",
    cor_secundaria: "#ffffff",
    cor_terciaria: "#ff0000",
    escudo_url: "",
  });

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

  return (
    <section
      className="relative overflow-hidden rounded-t-[2.5rem] h-[200px] flex items-center justify-between px-8 shadow-2xl"
      style={{
        background: `linear-gradient(90deg, ${theme.cor_primaria} 0%, ${theme.cor_secundaria} 50%, ${theme.cor_terciaria} 100%)`,
        backgroundSize: "200% 200%",
        animation: "waveFlag 6s ease-in-out infinite",
      }}
    >
      <div className="flex items-center gap-6 z-10">
        <div className="w-[120px] h-[120px] rounded-full bg-white flex items-center justify-center shadow-2xl border-4 border-white/10">
          <ClubLogo src={theme.escudo_url} alt={clubName} className="w-[85%] h-[85%] object-contain" />
        </div>
        <h1 className="text-4xl font-black italic uppercase text-white drop-shadow-lg">{clubName}</h1>
      </div>
    </section>
  );
};

export default ClubBanner;

/**
 * [RODAPÉ TÉCNICO]
 * ARQUIVO: src/components/dashboard/ClubBanner.tsx
 * CORREÇÃO: Adicionado efeito de bandeira tremulando via CSS animation.
 *           Gradiente dinâmico configurado com cores vindas do Supabase (clubes_cache).
 */
