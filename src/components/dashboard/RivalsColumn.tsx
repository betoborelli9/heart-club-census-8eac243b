/**
 * [CAMINHO]: src/components/dashboard/RivalsColumn.tsx
 * [MÓDULO]: TIMES RIVAIS — UNIFICAÇÃO E RECUPERAÇÃO DE ESCUDOS
 * [LOG]: Removida dependência de blocos redundantes. Busca direta no cache.
 */
import { Swords, Megaphone } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import ShareTropaModal from "@/components/dashboard/ShareTropaModal";

export default function RivalsColumn({ clubName, refCode, primaryColor = "#ff6200" }: any) {
  const [rivals, setRivals] = useState<any[]>([]);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    const fetchRivals = async () => {
      if (!clubName) return;

      // 1. Busca os nomes dos rivais registrados para o clube atual
      const { data: clubCache } = await supabase
        .from("clubes_cache")
        .select("rivais")
        .ilike("nome", clubName)
        .maybeSingle();

      if (clubCache?.rivais && Array.isArray(clubCache.rivais)) {
        // 2. Busca os dados (ESCUDOS) de todos esses rivais de uma vez só
        const { data: rivalsData } = await supabase
          .from("clubes_cache")
          .select("nome, escudo_url")
          .in("nome", clubCache.rivais);

        const finalRivals = clubCache.rivais.map((name) => {
          const match = rivalsData?.find((r) => r.nome.toLowerCase() === name.toLowerCase());
          return {
            name: name,
            // Fallback: Se não tem no banco, tenta a logo do Heart Club para não ficar vazio
            logo: match?.escudo_url || "https://www.heartclubapp.com/logo.png",
          };
        });
        setRivals(finalRivals);
      }
    };

    fetchRivals();
  }, [clubName]);

  return (
    <section className="space-y-4 rounded-[32px] p-5 bg-white/[0.02] border border-white/5 backdrop-blur-md shadow-2xl">
      <header className="flex items-center gap-2 mb-2">
        <Swords className="w-4 h-4" style={{ color: primaryColor }} />
        <h2 className="text-[11px] font-black uppercase italic tracking-widest text-white/60">
          Monitoramento de Rivais
        </h2>
      </header>

      <div className="space-y-3">
        {rivals.length === 0 ? (
          <div className="py-4 text-center text-[10px] text-white/20 uppercase font-black italic">
            Mapeando rivalidades locais...
          </div>
        ) : (
          rivals.map((rival, i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-all group"
            >
              <div className="w-12 h-12 shrink-0 flex items-center justify-center bg-black/40 rounded-xl p-2 border border-white/10">
                <img
                  src={rival.logo}
                  alt={rival.name}
                  className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://www.heartclubapp.com/logo.png";
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-black uppercase italic text-white truncate">{rival.name}</h3>
                <span className="text-[9px] font-bold text-white/20 uppercase">Rival Histórico</span>
              </div>
            </div>
          ))
        )}
      </div>

      <button
        onClick={() => setShareOpen(true)}
        className="w-full mt-2 flex items-center justify-center gap-2 py-4 rounded-2xl font-black italic uppercase text-[11px] text-black transition-all hover:brightness-110 active:scale-95"
        style={{ background: `linear-gradient(135deg, #f5c252 0%, ${primaryColor} 100%)` }}
      >
        <Megaphone className="w-4 h-4" /> Convocar a Tropa
      </button>

      <ShareTropaModal open={shareOpen} onOpenChange={setShareOpen} refCode={refCode} />
    </section>
  );
}
