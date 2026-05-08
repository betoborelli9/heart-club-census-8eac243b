/**
 * [CAMINHO]: src/components/dashboard/RivalsColumn.tsx
 * [MÓDULO]: TIMES RIVAIS — CORREÇÃO DE ESCUDOS E LOGICA DE CACHE
 */
import { Swords, Megaphone } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ClubLogo } from "@/components/ClubLogo";
import ShareTropaModal from "@/components/dashboard/ShareTropaModal";

interface RivalRow {
  name: string;
  logo: string | null;
}

export default function RivalsColumn({ clubName, refCode, primaryColor = "#ff6200" }: any) {
  const [rows, setRows] = useState<RivalRow[]>([]);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    const fetchRivals = async () => {
      if (!clubName) return;

      // 1. Pega os nomes dos rivais salvos para o clube
      const { data: club } = await supabase.from("clubes_cache").select("rivais").ilike("nome", clubName).maybeSingle();

      if (club?.rivais?.length) {
        // 2. BUSCA OS ESCUDOS DIRETAMENTE PELO NOME NA TABELA CACHE
        const { data: shields } = await supabase
          .from("clubes_cache")
          .select("nome, escudo_url")
          .in("nome", club.rivais);

        const mapped = club.rivais.map((name: string) => {
          const s = shields?.find((x) => x.nome.toLowerCase() === name.toLowerCase());
          return { name, logo: s?.escudo_url || null };
        });
        setRows(mapped);
      }
    };
    fetchRivals();
  }, [clubName]);

  return (
    <section className="space-y-4 rounded-2xl p-4 bg-white/[0.02] border border-white/5 shadow-2xl">
      <header className="flex items-center gap-2">
        <Swords className="w-4 h-4 text-[#ff6200]" />
        <h2 className="text-[11px] font-black italic uppercase tracking-widest text-white/70">Times Rivais</h2>
      </header>

      <div className="space-y-2">
        {rows.map((r, i) => (
          <div
            key={i}
            className="h-16 flex items-center gap-3 px-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-[#ff6200]/30 transition-all group"
          >
            <div className="w-10 h-10 shrink-0 flex items-center justify-center bg-black/40 rounded-lg p-1.5">
              {/* FORÇANDO O COMPONENTE A RENDERIZAR O SRC DO BANCO */}
              <img
                src={r.logo || "/placeholder-shield.png"}
                alt={r.name}
                className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://heartclubapp.com/logo.png";
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black italic uppercase truncate text-white">{r.name}</p>
              <p className="text-[9px] text-white/20 uppercase font-bold">Rival Histórico</p>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => setShareOpen(true)}
        className="w-full mt-2 flex items-center justify-center gap-2 py-3 rounded-xl font-black italic uppercase text-xs text-black transition-all hover:brightness-110"
        style={{ background: `linear-gradient(135deg, #f5c252 0%, ${primaryColor} 100%)` }}
      >
        <Megaphone className="w-4 h-4" /> Convocar a Tropa
      </button>

      <ShareTropaModal open={shareOpen} onOpenChange={setShareOpen} refCode={refCode} />
    </section>
  );
}
