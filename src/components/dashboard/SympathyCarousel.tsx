/**
 * [CAMINHO]: src/components/dashboard/SympathyCarousel.tsx
 * [MÓDULO]: Coluna 2 topo — "Meus Clubes de Simpatia" (carousel horizontal de cards 120px)
 */
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Heart, Newspaper } from "lucide-react";
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
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

export default function SympathyCarousel({ sympathies, heartClubName, viewedClubName, onPick }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [logos, setLogos] = useState<Record<string, string | null>>({});

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const out: Record<string, string | null> = {};
      for (const name of sympathies) {
        const local = CLUBS_DATA.find((c: any) => norm(c.nome) === norm(name));
        let url = (local as any)?.logoUrl || null;
        if (!url) {
          try {
            const { data } = await supabase
              .from("clubes_cache")
              .select("escudo_url")
              .ilike("nome", name)
              .maybeSingle();
            url = data?.escudo_url || null;
          } catch { /* ignore */ }
        }
        out[name] = url;
      }
      if (!cancelled) setLogos(out);
    };
    if (sympathies.length) run();
    return () => { cancelled = true; };
  }, [sympathies]);

  if (!sympathies.length && !heartClubName) return null;

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
  };

  const items = heartClubName ? [heartClubName, ...sympathies.filter((s) => norm(s) !== norm(heartClubName))] : sympathies;

  return (
    <section className="space-y-2">
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-[11px] font-black italic uppercase tracking-widest text-white">
          Meus Clubes de Simpatia
        </h2>
        <div className="flex items-center gap-1">
          <span className="text-[9px] italic text-white/40 mr-2">Compartilhador de simpatia</span>
          <button
            onClick={() => scroll("left")}
            className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-3 h-3 text-white/60" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center"
            aria-label="Próximo"
          >
            <ChevronRight className="w-3 h-3 text-white/60" />
          </button>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scroll-smooth no-scrollbar pb-2 snap-x"
      >
        {items.map((name) => {
          const isHeart = heartClubName && norm(name) === norm(heartClubName);
          const isActive = viewedClubName && norm(name) === norm(viewedClubName);
          return (
            <article
              key={name}
              className={`snap-start shrink-0 w-[120px] rounded-xl p-2 flex flex-col items-center gap-1.5 border transition-all ${
                isActive
                  ? "border-[#ff6200] bg-[#ff6200]/10"
                  : "border-white/10 bg-white/[0.03] hover:border-white/20"
              }`}
            >
              <div className="w-12 h-12">
                <ClubLogo src={logos[name]} alt={name} size="sm" className="w-12 h-12" />
              </div>
              <p className="text-[10px] font-black italic uppercase text-center text-white leading-tight line-clamp-2 min-h-[2.2em]">
                {name}
              </p>
              <button
                onClick={() => onPick(name)}
                className="mt-1 w-full flex items-center justify-center gap-1 px-2 py-1 rounded-md bg-white text-black text-[8px] font-black italic uppercase tracking-wider hover:bg-[#ff6200] hover:text-black transition-colors"
              >
                {isHeart ? <Heart className="w-2.5 h-2.5" /> : <Newspaper className="w-2.5 h-2.5" />}
                Ver Notícias
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
