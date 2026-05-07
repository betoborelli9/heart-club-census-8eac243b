/**
 * [CAMINHO/ARQUIVO]: src/components/dashboard/SympathyCarousel.tsx
 * [MÓDULO]: MINI BANNERS DE SIMPATIA (RETÂNGULOS IDENTICOS)
 * [ESTILO]: Design Premium com distribuição horizontal e contador de votos.
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
    const fetchClubsData = async () => {
      if (sympathies.length === 0) {
        setLoading(false);
        return;
      }

      // Busca escudos e contagem de votos simultaneamente
      const { data, error } = await supabase
        .from("clubes_cache")
        .select("nome, escudo_url, votos_contagem")
        .in("nome", sympathies);

      if (!error && data) {
        // Garante que a ordem siga a preferência do usuário
        const orderedData = sympathies.map(
          (name) => data.find((d) => d.nome === name) || { nome: name, escudo_url: null, votos_contagem: 0 },
        );
        setClubsInfo(orderedData);
      }
      setLoading(false);
    };

    fetchClubsData();
  }, [sympathies]);

  if (loading)
    return (
      <div className="h-24 flex items-center justify-center">
        <Loader2 className="animate-spin text-[#ff6200] w-6 h-6" />
      </div>
    );

  return (
    <section className="w-full">
      <div className="flex items-center gap-2 mb-3 px-2">
        <h2 className="text-[10px] font-black italic uppercase tracking-[0.2em] text-white/40">
          Meus Clubes de Simpatia
        </h2>
        <div className="h-px flex-1 bg-white/5" />
      </div>

      {/* CONTAINER DISTRIBUÍDO (MESMA LARGURA DO BANNER) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {clubsInfo.map((club) => {
          const isActive = viewedClubName === club.nome;

          return (
            <div
              key={club.nome}
              onClick={() => onPick(club.nome)}
              className={`
                relative flex items-center gap-3 p-3 rounded-2xl transition-all duration-300 cursor-pointer group
                ${
                  isActive
                    ? "bg-[#ff6200]/10 border border-[#ff6200]/30"
                    : "bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10"
                }
              `}
            >
              {/* ESCUDO */}
              <div className="relative h-10 w-10 flex-shrink-0">
                <img
                  src={club.escudo_url || "/placeholder-club.png"}
                  alt={club.nome}
                  className="h-full w-full object-contain group-hover:scale-110 transition-transform duration-500"
                />
              </div>

              {/* INFO DO TIME */}
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-black italic uppercase tracking-tighter text-white truncate">
                  {club.nome}
                </span>

                {/* VOTOS DO CENSO */}
                <span className="text-[9px] font-bold text-[#ff6200] leading-none mt-1">
                  {club.votos_contagem?.toLocaleString() || 0} VOTOS
                </span>

                {/* BOTÃO VER NOTÍCIAS */}
                <div className="flex items-center gap-1 mt-2 opacity-40 group-hover:opacity-100 transition-opacity">
                  <div className="bg-white/10 p-1 rounded-md">
                    <Newspaper className="w-2.5 h-2.5 text-white" />
                  </div>
                  <span className="text-[8px] font-black italic uppercase text-white/60">Ver Notícias</span>
                </div>
              </div>

              {/* INDICADOR ATIVO */}
              {isActive && (
                <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-[#ff6200] rounded-full shadow-[0_0_8px_#ff6200]" />
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
 * - GRID: md:grid-cols-4 garante 4 retângulos identicos na horizontal.
 * - DATA: Busca dinâmica de 'votos_contagem' do Supabase.
 * - DESIGN: Mesmos paddings e arredondamentos do protótipo "Padrão Ouro".
 */
export default SympathyCarousel;
