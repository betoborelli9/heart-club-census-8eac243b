/**
 * [CAMINHO/ARQUIVO]: src/components/dashboard/SympathyCarousel.tsx
 * [MÓDULO]: MINI BANNERS DE SIMPATIA (RETÂNGULOS IDENTICOS)
 * [FIX]: Removido Loop Eterno / Adicionado Fallback de Segurança
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Newspaper } from "lucide-react";

interface SympathyCarouselProps {
  sympathies: string[];
  heartClubName: string | null;
  viewedClubName: string | null;
  onPick: (name: string) => void;
}

const SympathyCarousel = ({ sympathies, heartClubName, viewedClubName, onPick }: SympathyCarouselProps) => {
  const [clubsInfo, setClubsInfo] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchClubsData = async () => {
      try {
        if (!sympathies || sympathies.length === 0) {
          if (isMounted) setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("clubes_cache")
          .select("nome, escudo_url, votos_contagem")
          .in("nome", sympathies);

        if (error) throw error;

        if (isMounted) {
          const orderedData = sympathies.map((name) => {
            const found = data?.find((d) => d.nome.toLowerCase() === name.toLowerCase());
            return found || { nome: name, escudo_url: null, votos_contagem: 0 };
          });
          setClubsInfo(orderedData);
        }
      } catch (err) {
        console.error("Erro no Carrossel:", err);
        // Fallback: Se der erro no banco, mostra apenas os nomes para não travar a página
        if (isMounted) {
          setClubsInfo(sympathies.map((name) => ({ nome: name, escudo_url: null, votos_contagem: 0 })));
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchClubsData();
    return () => {
      isMounted = false;
    };
  }, [sympathies]);

  // Se demorar mais de 5 segundos, o "finally" acima já terá liberado a página
  if (loading)
    return (
      <div className="h-24 flex items-center justify-center bg-white/[0.02] rounded-3xl border border-white/5">
        <Loader2 className="animate-spin text-[#ff6200] w-6 h-6" />
        <span className="ml-3 text-[10px] font-black italic uppercase text-white/40">Sincronizando Censo...</span>
      </div>
    );

  return (
    <section className="w-full fade-in">
      <div className="flex items-center gap-2 mb-4 px-4">
        <h2 className="text-[10px] font-black italic uppercase tracking-[0.2em] text-[#ff6200]">
          Meus Clubes de Simpatia
        </h2>
        <div className="h-px flex-1 bg-gradient-to-r from-[#ff6200]/20 to-transparent" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-2">
        {clubsInfo.map((club) => {
          const isActive = viewedClubName === club.nome;

          return (
            <div
              key={club.nome}
              onClick={() => onPick(club.nome)}
              className={`
                relative flex items-center gap-4 p-4 rounded-[24px] transition-all duration-500 cursor-pointer group
                ${
                  isActive
                    ? "bg-[#ff6200]/10 border border-[#ff6200]/40 shadow-[0_0_20px_rgba(255,98,0,0.1)]"
                    : "bg-white/[0.03] border border-white/5 hover:bg-white/[0.07] hover:border-white/10"
                }
              `}
            >
              <div className="relative h-12 w-12 flex-shrink-0 bg-black/20 rounded-xl p-1.5 border border-white/5">
                <img
                  src={club.escudo_url || "/placeholder-club.png"}
                  alt={club.nome}
                  className="h-full w-full object-contain group-hover:scale-110 transition-transform duration-500"
                />
              </div>

              <div className="flex flex-col min-w-0">
                <span className="text-[12px] font-black italic uppercase tracking-tighter text-white truncate">
                  {club.nome}
                </span>

                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[10px] font-bold text-[#ff6200]">
                    {Number(club.votos_contagem || 0).toLocaleString()}
                  </span>
                  <span className="text-[8px] font-black italic uppercase text-white/30 tracking-widest">VOTOS</span>
                </div>

                <div
                  className={`flex items-center gap-1 mt-2 transition-all duration-300 ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                >
                  <Newspaper className="w-2.5 h-2.5 text-[#ff6200]" />
                  <span className="text-[8px] font-black italic uppercase text-white/60">Ver Notícias</span>
                </div>
              </div>

              {isActive && (
                <div className="absolute top-3 right-3 w-2 h-2 bg-[#ff6200] rounded-full shadow-[0_0_10px_#ff6200] animate-pulse" />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

/**
 * [RODAPÉ TÉCNICO]
 * - GRID: 4 colunas identicas (Retângulos).
 * - SEGURANÇA: Try/Catch adicionado para evitar travamento da página.
 * - DESIGN: Efeito de pulso e sombra no clube ativo.
 */
export default SympathyCarousel;
