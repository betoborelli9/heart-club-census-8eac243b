/**
 * [CAMINHO]: src/components/dashboard/SympathyCarousel.tsx
 * [MÓDULO]: MINI BANNERS DE SIMPATIA — DESIGN VIDRO PREENCHIMENTO TOTAL
 * [ALTERAÇÃO]: Troca de Carousel (120px) para Grid (Full Width) para alinhar com o Banner.
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

      // Criamos a lista de 5 clubes (Coração + Simpatias)
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
        } catch {
          /* ignore */
        }

        outLogos[name] = url;
        outVotes[name] = vts;
      }

      if (!cancelled) {
        setLogos(outLogos);
        setVotes(outVotes);
      }
    };
    if (sympathies.length || heartClubName) run();
    return () => {
      cancelled = true;
    };
  }, [sympathies, heartClubName]);

  if (!sympathies.length && !heartClubName) return null;

  // Garantimos exatamente 5 itens para o Grid preencher o espaço verde
  const items = heartClubName
    ? [heartClubName, ...sympathies.filter((s) => norm(s) !== norm(heartClubName))].slice(0, 5)
    : sympathies.slice(0, 5);

  return (
    <section className="w-full space-y-4">
      <header className="flex items-center justify-between gap-2 px-2">
        <h2 className="text-[10px] font-black italic uppercase tracking-[0.2em] text-white/50">
          Meus Clubes de Simpatia
        </h2>
        <span className="text-[9px] italic text-white/20 uppercase font-bold tracking-widest">
          Compartilhador de simpatia
        </span>
      </header>

      {/* GRID DE 5 COLUNAS — Preenchimento total e idêntico ao Banner */}
      <div className="grid grid-cols-5 gap-3 w-full">
        {items.map((name) => {
          const isHeart = heartClubName && norm(name) === norm(heartClubName);
          const isActive = viewedClubName && norm(name) === norm(viewedClubName);
          const clubVotes = votes[name] || 0;

          return (
            <article
              key={name}
              onClick={() => onPick(name)}
              className={`relative flex flex-col items-center justify-between p-4 rounded-[20px] transition-all duration-500 cursor-pointer group min-h-[150px] border ${
                isActive
                  ? "border-[#ff6200]/40 bg-[#ff6200]/10 shadow-[0_0_15px_rgba(255,98,0,0.1)]"
                  : "border-white/5 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.08]"
              }`}
            >
              {/* Ícone de Coração para o time principal */}
              {isHeart && (
                <div className="absolute top-2 left-2 text-[#ff6200]">
                  <Heart className="w-3 h-3 fill-current" />
                </div>
              )}

              {/* Escudo centralizado e maior */}
              <div className="w-14 h-14 flex items-center justify-center">
                <ClubLogo
                  src={logos[name]}
                  alt={name}
                  size="sm"
                  className="w-14 h-14 object-contain group-hover:scale-110 transition-transform duration-500"
                />
              </div>

              {/* Nome e Votos */}
              <div className="text-center w-full space-y-1">
                <p className="text-[11px] font-black italic uppercase text-white leading-tight line-clamp-1">{name}</p>
                <p className="text-[9px] font-bold text-[#ff6200] uppercase tracking-tighter">
                  {clubVotes.toLocaleString()} VOTOS
                </p>
              </div>

              {/* Botão estilizado na base do retângulo */}
              <div
                className={`mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
                  isActive
                    ? "bg-[#ff6200] text-black"
                    : "bg-white/5 text-white/60 group-hover:bg-white/10 group-hover:text-white"
                }`}
              >
                <Newspaper className="w-3 h-3" />
                <span className="text-[8px] font-black italic uppercase">Ver Notícias</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
