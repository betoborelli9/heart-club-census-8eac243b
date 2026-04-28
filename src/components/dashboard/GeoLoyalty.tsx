/**
 * [CAMINHO/ARQUIVO]: src/components/dashboard/GeoLoyalty.tsx
 * [MÓDULO]: DASHBOARD — FIDELIDADE GEOGRÁFICA (TOP 3 CIDADES)
 * [DESCRIÇÃO]: Exibe as cidades de onde vêm os votos do clube ativo.
 *   Apenas tipografia + pílula de progresso cinza. Sem mapas, sem cores fortes.
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface CityRow {
  cidade: string;
  count: number;
  pct: number;
}

interface Props {
  clubName: string | null;
}

export default function GeoLoyalty({ clubName }: Props) {
  const [rows, setRows] = useState<CityRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!clubName) {
        setRows([]);
        return;
      }
      const { data } = await supabase
        .from("votos")
        .select("voto_cidade")
        .eq("clube_nome", clubName)
        .eq("is_original_vote", true)
        .not("voto_cidade", "is", null)
        .limit(1000);

      if (cancelled) return;

      const counts = new Map<string, number>();
      for (const v of data || []) {
        const c = (v as any).voto_cidade?.trim();
        if (!c) continue;
        counts.set(c, (counts.get(c) || 0) + 1);
      }

      const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);
      const top = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([cidade, count]) => ({
          cidade,
          count,
          pct: total > 0 ? Math.round((count / total) * 100) : 0,
        }));

      setRows(top);
    })();
    return () => {
      cancelled = true;
    };
  }, [clubName]);

  return (
    <section className="space-y-5">
      <header className="flex items-baseline justify-between">
        <h2 className="text-[11px] font-black uppercase italic tracking-[0.2em] text-white/50">
          Fidelidade Geográfica
        </h2>
        <span className="text-[10px] font-mono text-white/30">Top 3</span>
      </header>

      {rows === null && (
        <ul className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="space-y-2">
              <Skeleton className="h-3 w-32 bg-white/[0.04]" />
              <Skeleton className="h-1 w-full bg-white/[0.03]" />
            </li>
          ))}
        </ul>
      )}

      {rows && rows.length === 0 && (
        <p className="text-xs italic text-white/30">
          Ainda não há dados de localização para este clube.
        </p>
      )}

      {rows && rows.length > 0 && (
        <ul className="space-y-5">
          {rows.map((r, i) => (
            <li key={r.cidade} className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-bold italic text-white/85 truncate">
                  <span className="text-white/30 font-mono mr-2 text-[10px]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {r.cidade}
                </span>
                <span className="text-[11px] font-mono text-white/50 tracking-tight shrink-0">
                  {r.pct}%
                </span>
              </div>
              <div className="h-[2px] w-full bg-white/[0.04] rounded-full overflow-hidden">
                <div
                  className="h-full bg-white/30 rounded-full transition-all duration-500"
                  style={{ width: `${r.pct}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
