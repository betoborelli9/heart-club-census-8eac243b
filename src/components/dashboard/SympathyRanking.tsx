/**
 * 📁 src/components/dashboard/SympathyRanking.tsx
 * ❤️ Ranking de Clubes de Simpatia (segundo time mais querido)
 * Conta ocorrências em sympathy_1..4 via RPC pública get_sympathy_ranking.
 */

import { useEffect, useState } from "react";
import { Heart, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CLUBS_DATA } from "@/clubes-data";
import { ClubLogo } from "@/components/ClubLogo";

const normalize = (v: string) =>
  v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

type RankRow = { club: string; votes: number };

const SympathyRanking = () => {
  const [rows, setRows] = useState<RankRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.rpc("get_sympathy_ranking", { p_limit: 30 });
      if (!error && Array.isArray(data)) setRows(data as RankRow[]);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <Heart className="w-5 h-5 text-primary" fill="currentColor" />
        <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-tight">
          Clubes Mais Queridos <span className="text-primary">(Simpatia)</span>
        </h2>
      </header>
      <p className="text-xs md:text-sm text-white/60 italic">
        Quais clubes os torcedores mais escolhem como seu segundo time.
      </p>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-white/50 italic py-6 text-center">
          Ainda não há votos de simpatia registrados.
        </p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-3 -mx-2 px-2 snap-x snap-mandatory">
          {rows.map((row, idx) => {
            const clubData = CLUBS_DATA.find((c) => normalize(c.nome) === normalize(row.club));
            const isTop = idx === 0;
            return (
              <article
                key={row.club + idx}
                className={`snap-start shrink-0 w-40 md:w-44 rounded-2xl p-4 flex flex-col items-center gap-2 transition-all ${
                  isTop
                    ? "border-2 border-primary bg-primary/10"
                    : "border border-white/10 bg-white/[0.03] hover:border-white/20"
                }`}
                style={
                  isTop
                    ? { boxShadow: "0 0 24px hsl(var(--primary) / 0.5), inset 0 0 16px hsl(var(--primary) / 0.15)" }
                    : undefined
                }
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-[10px] font-black uppercase tracking-widest ${
                      isTop ? "text-primary" : "text-white/40"
                    }`}
                  >
                    #{idx + 1}
                  </span>
                  {isTop && <Sparkles className="w-3.5 h-3.5 text-primary" />}
                </div>
                <ClubLogo src={clubData?.logoUrl} alt={row.club} size="lg" />
                <h3 className="text-sm font-black italic text-center leading-tight line-clamp-2 min-h-[2.5rem]">
                  {row.club}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className={`text-lg font-black ${isTop ? "text-primary" : "text-white"}`}>
                    {row.votes.toLocaleString("pt-BR")}
                  </span>
                  <span className="text-[10px] text-white/50 italic">simpatias</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default SympathyRanking;
