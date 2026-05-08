/**
 * [CAMINHO]: src/components/dashboard/RivalsColumn.tsx
 * [MÓDULO]: TIMES RIVAIS — INTELIGÊNCIA DINÂMICA POR CLUBE (cache + IA)
 */
import { Swords, Megaphone } from "lucide-react";
import { useEffect, useState } from "react";
import { getHistoricalRivals } from "@/lib/rivalries";
import { CLUBS_DATA } from "@/clubes-data";
import { ClubLogo } from "@/components/ClubLogo";
import { supabase } from "@/integrations/supabase/client";
import ShareTropaModal from "@/components/dashboard/ShareTropaModal";

interface Props {
  clubName: string | null;
  refCode?: string | null;
  primaryColor?: string;
}

interface RivalRow {
  name: string;
  logo: string | null;
  votes: number | null;
  label: string;
}

const norm = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

export default function RivalsColumn({ clubName, refCode, primaryColor = "#ff6200" }: Props) {
  const [rows, setRows] = useState<RivalRow[]>([]);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!clubName) {
        setRows([]);
        return;
      }

      // 1) Cache: clubes_cache.rivais
      let rivalNames: string[] = [];
      try {
        const { data: row } = await supabase
          .from("clubes_cache")
          .select("rivais, pais")
          .ilike("nome", clubName)
          .maybeSingle();
        if (row?.rivais && Array.isArray(row.rivais) && row.rivais.length > 0) {
          rivalNames = row.rivais as string[];
        } else {
          // 2) Edge function get-rivals (IA Gemini)
          try {
            const { data: rv } = await supabase.functions.invoke("get-rivals", {
              body: { club_name: clubName, country: row?.pais || null },
            });
            if (Array.isArray(rv?.rivals)) rivalNames = rv.rivals;
          } catch {}
        }
      } catch {}

      // 3) Fallback histórico hardcoded
      if (!rivalNames.length) {
        rivalNames = getHistoricalRivals(clubName, 4);
      }

      if (!rivalNames.length) {
        if (!cancelled) setRows([]);
        return;
      }

      const enriched: RivalRow[] = await Promise.all(
        rivalNames.map(async (name) => {
          const local = CLUBS_DATA.find((c: any) => norm(c.nome) === norm(name));
          let logo = (local as any)?.logoUrl || null;
          try {
            const { data } = await supabase
              .from("clubes_cache")
              .select("escudo_url")
              .ilike("nome", name)
              .maybeSingle();
            if (data && !logo) logo = data.escudo_url;
          } catch {}
          return { name, logo, votes: null, label: "Rival Histórico" };
        }),
      );

      if (!cancelled) setRows(enriched);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [clubName]);

  return (
    <section className="space-y-3">
      <header className="flex items-center gap-2">
        <Swords className="w-4 h-4" style={{ color: primaryColor }} />
        <h2 className="text-[11px] font-black italic uppercase tracking-widest text-white">Times Rivais</h2>
      </header>
      <p className="text-[10px] italic text-white/40">Monitoramento de rivalidade para {clubName || "—"}</p>

      <div className="space-y-2">
        {rows.length === 0 ? (
          <div className="text-[11px] italic text-white/40 py-3">
            {clubName ? "Sem rivalidades mapeadas para este clube." : "Selecione um clube."}
          </div>
        ) : (
          rows.map((r, i) => (
            <div
              key={`${r.name}-${i}`}
              className="h-20 w-full flex items-center gap-3 px-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-[#ff6200]/30 transition-all group"
            >
              <div className="w-10 h-10 shrink-0 flex items-center justify-center bg-black/20 rounded-lg p-1">
                <ClubLogo
                  src={r.logo}
                  alt={r.name}
                  size="sm"
                  className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black italic uppercase truncate text-white leading-tight">{r.name}</p>
                <p className="text-[10px] italic text-white/50 truncate">{r.label}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <button
        onClick={() => setShareOpen(true)}
        className="w-full mt-3 flex items-center justify-center gap-2 py-3 rounded-xl font-black italic uppercase text-xs text-black hover:scale-[1.02] transition-transform shadow-lg"
        style={{ background: `linear-gradient(135deg, #f5c252 0%, ${primaryColor} 100%)` }}
      >
        <Megaphone className="w-4 h-4" /> Convocar a Tropa
      </button>
      <p className="text-[9px] italic text-center text-white/30">Compartilhe seu link de embaixador</p>

      <ShareTropaModal open={shareOpen} onOpenChange={setShareOpen} refCode={refCode} />
    </section>
  );
}

