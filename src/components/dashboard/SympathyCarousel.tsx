/**
 * [CAMINHO]: src/components/dashboard/SympathyCarousel.tsx
 * [MÓDULO]: MINI BANNERS DE SIMPATIA — DESIGN DELICADO E ALINHADO
 * [FIX]: Alinhamento estrito com o Banner e redução da altura dos cards.
 */
import { useEffect, useState } from "react";
import { Heart, Newspaper } from "lucide-react";
import { CLUBS_DATA } from "@/clubes-data";
import { ClubLogo } from "@/components/ClubLogo";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  sympathies: string[];
  heartClubName?: string | null;
  viewedClubName?: string | null;
  onPick: (name: string) => void;
}

const norm = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

export default function SympathyCarousel({ sympathies, heartClubName, viewedClubName, onPick }: Props) {
  const [logos, setLogos] = useState<Record<string, string | null>>({});
  const [votes, setVotes] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const outLogos: Record<string, string | null> = {};
      const outVotes: Record<string, number> = {};
      const allNames = heartClubName
        ? [heartClubName, ...sympathies.filter((s) => norm(s) !== norm(heartClubName))]
        : sympathies;
      const targetNames = allNames.slice(0, 5);

      for (const name of targetNames) {
        const local = CLUBS_DATA.find((c: any) => norm(c.nome) === norm(name));
        let url = (local as any)?.logoUrl || null;
        let vts = 0;
        try {
          const { data } = await supabase
            .from("clubes_cache")
            .select("escudo_url, votos_contagem")
            .ilike("nome", name)
            .maybeSingle();
          if (!url) url = data?.escudo_url || null;
          vts = data?.votos_contagem || 0;
        } catch {}
        outLogos[name] = url;
        outVotes[name] = vts;
      }
      if (!cancelled) {
        setLogos(outLogos);
        setVotes(outVotes);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [sympathies, heartClubName]);

  const items = heartClubName
    ? [heartClubName, ...sympathies.filter((s) => norm(s) !== norm(heartClubName))].slice(0, 5)
    : sympathies.slice(0, 5);

  return (
    <section className="w-full max-w-full overflow-hidden">
      <header className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-[10px] font-black italic uppercase tracking-widest text-white/40">
          Meus Clubes de Simpatia
        </h2>
        <span className="text-[8px] italic text-white/20 uppercase tracking-tighter">Compartilhador de simpatia</span>
      </header>

      {/* GRID COM ESPAÇAMENTO REDUZIDO E LARGURA CONTROLADA */}
      <div className="grid grid-cols-5 gap-2 w-full">
        {items.map((name) => {
          const isHeart = heartClubName && norm(name) === norm(heartClubName);
          const isActive = viewedClubName && norm(name) === norm(viewedClubName);

          return (
            <article
              key={name}
              onClick={() => onPick(name)}
              className={`relative flex flex-col items-center justify-center p-3 rounded-2xl transition-all cursor-pointer border h-[110px] ${
                isActive
                  ? "border-[#ff6200]/50 bg-[#ff6200]/10"
                  : "border-white/5 bg-white/[0.02] hover:bg-white/[0.05]"
              }`}
            >
              {isHeart && (
                <div className="absolute top-1.5 left-1.5 text-[#ff6200]">
                  <Heart className="w-2.5 h-2.5 fill-current" />
                </div>
              )}

              {/* Escudo Menor para maior delicadeza */}
              <div className="w-10 h-10 mb-1 flex items-center justify-center">
                <ClubLogo src={logos[name]} alt={name} size="sm" className="max-w-full max-h-full object-contain" />
              </div>

              <p className="text-[10px] font-black italic uppercase text-white truncate w-full text-center">{name}</p>

              <p className="text-[8px] font-bold text-[#ff6200] mt-0.5 tracking-tighter">
                {votes[name]?.toLocaleString() || 0} VOTOS
              </p>

              {/* Botão compacto */}
              <div
                className={`mt-2 w-full py-1 rounded-lg flex items-center justify-center gap-1 ${
                  isActive ? "bg-[#ff6200] text-black" : "bg-white/5 text-white/40"
                }`}
              >
                <Newspaper className="w-2.5 h-2.5" />
                <span className="text-[7px] font-black uppercase italic">Notícias</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
