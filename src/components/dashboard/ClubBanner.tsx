"use client";

/**
 * [CAMINHO]&#58; src/components/dashboard/ClubBanner.tsx
 * [VERSÃO]&#58; 16.0 - JERSEY PIXEL PERFECT
 */

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Flame, BarChart3, Crown, Users, Vote, Bug, ShieldAlert, MapPin, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  clubName: string;
  profileName?: string;
  profileCity?: string;
  profileState?: string;
  ambassadorLevel?: string;
}

export default function ClubBanner({
  clubName,
  profileName = "Beto Borelli",
  profileCity = "Goiânia",
  profileState = "GO",
  ambassadorLevel = "Bronze",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [theme, setTheme] = useState({
    cor_primaria: "#ff0000",
    cor_secundaria: "#111111",
    cor_terciaria: "#ffffff",
    escudo_url: "",
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTheme = async () => {
      const { data } = await supabase
        .from("clubes_cache")
        .select("cor_primaria, cor_secundaria, cor_terciaria, escudo_url")
        .ilike("nome", `%${clubName}%`)
        .limit(1)
        .single();

      if (data) {
        setTheme({
          cor_primaria: data.cor_primaria,
          cor_secundaria: data.cor_secundaria,
          cor_terciaria: data.cor_terciaria,
          escudo_url: data.escudo_url,
        });
      }

      setLoading(false);
    };

    fetchTheme();
  }, [clubName]);

  const isActive = (path: string) => pathname === path;

  return (
    <motion.div
      initial={{ opacity: 0, y: -40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="w-full max-w-7xl mx-auto p-6"
    >
      <div className="relative h-[450px] rounded-[64px] overflow-hidden shadow-[0_45px_100px_-20px_rgba(0,0,0,0.8)]">
        {/* BACKGROUND STRIPES */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(110deg,
                ${theme.cor_secundaria} 0%,
                ${theme.cor_secundaria} 25%,
                ${theme.cor_terciaria} 25%,
                ${theme.cor_terciaria} 32%,
                ${theme.cor_primaria} 32%,
                ${theme.cor_primaria} 70%,
                ${theme.cor_secundaria} 70%,
                ${theme.cor_secundaria} 100%
              )
            `,
          }}
        />

        {/* TEXTURA DE TECIDO */}
        <div className="absolute inset-0 mix-blend-overlay opacity-40">
          <svg width="100%" height="100%">
            <filter id="jersey">
              <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="6" />
              <feDisplacementMap in="SourceGraphic" scale="80" />
            </filter>
            <rect width="100%" height="100%" filter="url(#jersey)" />
          </svg>
        </div>

        {/* MICRO TEXTURA */}
        <div className="absolute inset-0 opacity-15 mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

        {/* SOMBRA PROFUNDA */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-transparent to-black/60" />

        {/* CONTEÚDO */}
        {!loading && (
          <div className="relative h-full flex items-center justify-between px-16">
            {/* ESCUDO */}
            <div className="w-[256px] h-[256px] bg-white rounded-full flex items-center justify-center shadow-inner">
              {theme.escudo_url && (
                <Image src={theme.escudo_url} alt="escudo" width={180} height={180} className="object-contain" />
              )}
            </div>

            {/* INFO */}
            <div className="flex flex-col text-white">
              <h2 className="text-7xl font-black italic tracking-tight">{profileName}</h2>

              <div className="flex gap-6 mt-4 text-lg font-bold italic">
                <span className="flex items-center gap-2">
                  <MapPin size={18} /> {profileCity} - {profileState}
                </span>
                <span className="flex items-center gap-2 text-yellow-400">
                  <Trophy size={18} /> EMBAIXADOR {ambassadorLevel}
                </span>
              </div>
            </div>

            {/* CLUBE */}
            <div className="text-right text-white">
              <span className="uppercase text-sm tracking-[0.3em] opacity-80">Clube do Coração</span>
              <h1 className="text-9xl font-black italic tracking-tight leading-none">{clubName}</h1>
            </div>
          </div>
        )}

        {/* NAVBAR */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
          <div className="flex gap-4 px-6 py-3 bg-black/80 backdrop-blur-3xl rounded-full border border-white/10">
            {[
              { label: "MAPA", icon: Flame, path: "/mapa" },
              { label: "ESTATÍSTICAS", icon: BarChart3, path: "/estatisticas" },
              { label: "RANKING", icon: Crown, path: "/ranking" },
              { label: "EMBAIXADORES", icon: Users, path: "/embaixadores" },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => router.push(item.path)}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase ${
                  isActive(item.path) ? "text-white" : "text-white/50"
                }`}
              >
                <item.icon size={16} />
                {item.label}
              </button>
            ))}

            {/* VOTAÇÃO */}
            <button className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase text-orange-400 border border-orange-400 rounded-full shadow-[0_0_15px_rgba(255,140,0,0.6)]">
              <Vote size={16} /> VOTAÇÃO
            </button>

            {/* DEBUG */}
            <button className="flex items-center gap-2 px-3 py-2 text-xs text-white/40">
              <Bug size={14} /> DEBUG
            </button>

            {/* MASTER */}
            <button className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white rounded-full text-xs font-bold animate-pulse">
              <ShieldAlert size={16} /> MASTER
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
