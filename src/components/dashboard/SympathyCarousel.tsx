/**
 * [CAMINHO]: src/components/dashboard/SympathyCarousel.tsx
 * [MÓDULO]: MINI BANNERS DE SIMPATIA — VERSÃO BLACK PREMIUM
 * [FIX]: Alinhamento milimétrico com o Banner e correção de exibição de escudos.
 */
import { useEffect, useState } from "react";
import { Heart, Newspaper } from "lucide-react";
import { CLUBS_DATA } from "@/clubes-data";
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
    <section className="w-full mx-auto select-none">
      <header className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-[10px] font-black italic uppercase tracking-[0.3em] text-white/30">
          Meus Clubes de Simpatia
        </h2>
        <span className="text-[8px] font-bold text-white/10 uppercase tracking-tighter italic">
          Compartilhador de simpatia
        </span>
      </header>

      {/* GRID COM CONTENÇÃO TOTAL PARA NÃO EXTRAPOLAR O BANNER */}
      <div className="grid grid-cols-5 gap-3 w-full">
        {items.map((name) => {
          const isHeart = heartClubName && norm(name) === norm(heartClubName);
          const isActive = viewedClubName && norm(name) === norm(viewedClubName);

          return (
            <article
              key={name}
              onClick={() => onPick(name)}
              className={`relative flex flex-col items-center justify-center p-3 rounded-[24px] transition-all duration-300 cursor-pointer border h-[120px] ${
                isActive
                  ? "border-[#ff6200]/60 bg-[#ff6200]/10 shadow-[0_0_20px_rgba(255,98,0,0.1)]"
                  : "border-white/[0.08] bg-black/40 hover:bg-white/[0.04] hover:border-white/20"
              }`}
            >
              {isHeart && (
                <div className="absolute top-2 left-2 text-[#ff6200]">
                  <Heart className="w-3 h-3 fill-current" />
                </div>
              )}

              {/* SLOT DO ESCUDO - CORREÇÃO DE EXIBIÇÃO */}
              <div className="w-12 h-12 mb-2 flex items-center justify-center bg-black/20 rounded-xl p-1">
                {logos[name] ? (
                  <img src={logos[name]!} alt={name} className="max-w-full max-h-full object-contain" />
                ) : (
                  <div className="w-full h-full rounded-full border border-white/10 flex items-center justify-center">
                    <span className="text-[8px] text-white/20 italic">Logo</span>
                  </div>
                )}
              </div>

              <p className="text-[10px] font-black italic uppercase text-white/90 truncate w-full text-center px-1">
                {name}
              </p>

              <p className="text-[9px] font-bold text-[#ff6200] mt-1 tracking-widest">
                {Number(votes[name] || 0).toLocaleString()} <span className="text-[7px] text-white/20">VOTOS</span>
              </p>

              {/* BOTÃO ESTILIZADO IGUAL À IMAGEM */}
              <div
                className={`mt-3 w-full py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  isActive ? "bg-[#ff6200] text-black" : "bg-white/5 text-white/40 group-hover:bg-white/10"
                }`}
              >
                <Newspaper className="w-3 h-3" />
                <span className="text-[8px] font-black uppercase italic">Ver Notícias</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
