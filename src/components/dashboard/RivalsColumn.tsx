/**
 * [CAMINHO]: src/components/dashboard/RivalsColumn.tsx
 * [MÓDULO]: TIMES RIVAIS — INTELIGÊNCIA DINÂMICA (CORREÇÃO DE ESCUDOS E LOGICA)
 */
import { Swords, Megaphone } from "lucide-react";
import { useEffect, useState } from "react";
import { getHistoricalRivals } from "@/lib/rivalries";
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
  label: string;
}

export default function RivalsColumn({ clubName, refCode, primaryColor = "#ff6200" }: Props) {
  const [rows, setRows] = useState<RivalRow[]>([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!clubName) {
        setRows([]);
        return;
      }
      setLoading(true);

      let rivalNames: string[] = [];

      // 1. Busca lista de nomes de rivais no Cache
      const { data: clubRow } = await supabase
        .from("clubes_cache")
        .select("rivais, pais")
        .ilike("nome", clubName)
        .maybeSingle();

      if (clubRow?.rivais && Array.isArray(clubRow.rivais) && clubRow.rivais.length > 0) {
        rivalNames = clubRow.rivais;
      } else {
        // 2. IA Gemini (Edge Function) apenas se cache estiver vazio
        try {
          const { data: rv } = await supabase.functions.invoke("get-rivals", {
            body: { club_name: clubName, country: clubRow?.pais || null },
          });
          if (Array.isArray(rv?.rivals)) rivalNames = rv.rivals;
        } catch (e) {
          console.error("Erro IA Rivais:", e);
        }
      }

      // 3. Fallback histórico se tudo falhar
      if (!rivalNames.length) {
        rivalNames = getHistoricalRivals(clubName, 4);
      }

      if (!rivalNames.length || cancelled) {
        setRows([]);
        setLoading(false);
        return;
      }

      // 4. BUSCA DE ESCUDOS EM LOTE (Evita múltiplos requests)
      const { data: rivalsDetails } = await supabase
        .from("clubes_cache")
        .select("nome, escudo_url")
        .in("nome", rivalNames);

      const enriched: RivalRow[] = rivalNames.map((name) => {
        const detail = rivalsDetails?.find((d) => d.nome.toLowerCase() === name.toLowerCase());
        return {
          name,
          logo: detail?.escudo_url || null,
          label: "Rival Histórico",
        };
      });

      if (!cancelled) {
        setRows(enriched);
        setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [clubName]);

  return (
    <section className="space-y-3 rounded-2xl p-4 bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
      <header className="flex items-center gap-2">
        <Swords className="w-4 h-4" style={{ color: primaryColor }} />
        <h2 className="text-[11px] font-black italic uppercase tracking-widest text-white">Times Rivais</h2>
      </header>

      <p className="text-[10px] italic text-white/40">Monitoramento para {clubName || "—"}</p>

      <div className="space-y-2">
        {loading ? (
          <div className="flex justify-center py-4 opacity-20 animate-pulse">
            <Swords className="w-6 h-6 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-[11px] italic text-white/40 py-3">Sem rivalidades mapeadas.</div>
        ) : (
          rows.map((r, i) => (
            <div
              key={`${r.name}-${i}`}
              className="h-16 w-full flex items-center gap-3 px-3 rounded-xl bg-white/[0.04] border border-white/5 hover:border-[#ff6200]/40 transition-all group"
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
                <p className="text-[11px] font-black italic uppercase truncate text-white leading-tight">{r.name}</p>
                <p className="text-[9px] italic text-white/30 uppercase tracking-tighter">{r.label}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <button
        onClick={() => setShareOpen(true)}
        className="w-full mt-3 flex items-center justify-center gap-2 py-3 rounded-xl font-black italic uppercase text-xs text-black hover:brightness-110 active:scale-95 transition-all shadow-lg"
        style={{ background: `linear-gradient(135deg, #f5c252 0%, ${primaryColor} 100%)` }}
      >
        <Megaphone className="w-4 h-4" /> Convocar a Tropa
      </button>

      <ShareTropaModal open={shareOpen} onOpenChange={setShareOpen} refCode={refCode} />
    </section>
  );
}
