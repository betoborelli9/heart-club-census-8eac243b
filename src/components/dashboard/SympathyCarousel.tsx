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

      // Logos (cache local + clubes_cache)
      await Promise.all(
        targetNames.map(async (name) => {
          const local = CLUBS_DATA.find((c: any) => norm(c.nome) === norm(name));
          let url = (local as any)?.logoUrl || null;
          if (!url) {
            try {
              const { data } = await supabase
                .from("clubes_cache")
                .select("escudo_url")
                .ilike("nome", name)
                .maybeSingle();
              url = (data as any)?.escudo_url || null;
            } catch {}
          }
          outLogos[name] = url;
          outVotes[name] = 0;
        }),
      );

      // Contagem autônoma de votos (heart + simpatia) via RPC fuzzy
      try {
        const { data: counts } = await supabase.rpc("get_clubs_full_counts" as any, {
          p_club_names: targetNames,
        });
        (counts || []).forEach((row: any) => {
          const isHeart = heartClubName && norm(row.clube_nome) === norm(heartClubName);
          outVotes[row.clube_nome] = isHeart
            ? Number(row.heart_votes || 0)
            : Number(row.sympathy_votes || 0);
        });
      } catch {}

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

  const heartItem = heartClubName || null;
  const sympathyItems = (heartClubName
    ? sympathies.filter((s) => norm(s) !== norm(heartClubName))
    : sympathies
  ).slice(0, 4);

  const renderCard = (name: string, isHeart: boolean) => {
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
  };

  return (
    <section className="w-full mx-auto select-none">
      <header className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-[10px] font-black italic uppercase tracking-[0.3em] text-white/30">
          Meus Clubes
        </h2>
        <span className="text-[8px] font-bold text-white/10 uppercase tracking-tighter italic">
          Compartilhador de simpatia
        </span>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_4fr] gap-4 w-full items-start">
        {/* CLUBE DO CORAÇÃO */}
        <div className="space-y-2">
          <div className="text-[9px] font-black italic uppercase tracking-[0.25em] text-[#ff6200]/80 px-1 flex items-center gap-1.5">
            <Heart className="w-3 h-3 fill-current" /> Clube do Coração
          </div>
          {heartItem ? (
            <div className="grid grid-cols-1">{renderCard(heartItem, true)}</div>
          ) : (
            <div className="h-[120px] rounded-[24px] border border-dashed border-white/10 flex items-center justify-center text-[9px] uppercase italic text-white/20">
              Sem voto
            </div>
          )}
        </div>

        <div className="hidden md:block w-px h-[150px] bg-white/5 mt-6" />

        {/* SIMPATIAS */}
        <div className="space-y-2">
          <div className="text-[9px] font-black italic uppercase tracking-[0.25em] text-white/40 px-1">
            Clubes de Simpatia
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {sympathyItems.map((name) => renderCard(name, false))}
          </div>
        </div>
      </div>
    </section>
  );
}
