/**
 * [CAMINHO]: src/components/dashboard/RivalsColumn.tsx
 * [MÓDULO]: TIMES RIVAIS — UNIFICAÇÃO E RECUPERAÇÃO DE ESCUDOS
 * [LOG]: Removida dependência de blocos redundantes. Busca direta no cache.
 */
import { Swords, Megaphone, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import ShareTropaModal from "@/components/dashboard/ShareTropaModal";
import { ClubLogo } from "@/components/ClubLogo";

type RivalItem = {
  name: string;
  logo: string | null;
  city?: string | null;
  country?: string | null;
  source?: "cache" | "api" | "missing";
  votes?: number;
};

export default function RivalsColumn({ clubName, refCode, primaryColor = "#ff6200" }: any) {
  const [rivals, setRivals] = useState<RivalItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchRivals = async () => {
      if (!clubName) {
        setRivals([]);
        return;
      }

      setLoading(true);

      // 1) INSTANTÂNEO: tenta cache local em clubes_cache.rivais
      const { data: cacheRow } = await supabase
        .from("clubes_cache")
        .select("rivais")
        .ilike("nome", clubName)
        .maybeSingle();

      const cachedNames: string[] = Array.isArray((cacheRow as any)?.rivais)
        ? ((cacheRow as any).rivais as string[]).filter(Boolean)
        : [];

      const renderWithVotes = async (baseList: RivalItem[]) => {
        const rivalNames = baseList.map((r) => r.name);
        let votesMap: Record<string, number> = {};
        if (rivalNames.length) {
          const { data: counts } = await supabase.rpc("get_votes_count_by_clubs", {
            p_club_names: rivalNames,
          });
          (counts || []).forEach((row: any) => {
            votesMap[row.clube_nome] = Number(row.votes) || 0;
          });
        }
        if (cancelled) return;
        setRivals(baseList.map((r) => ({ ...r, votes: votesMap[r.name] || 0 })));
      };

      if (cachedNames.length) {
        // Resolver escudos via clubes_cache em batch (instantâneo)
        const { data: clubs } = await supabase
          .from("clubes_cache")
          .select("nome, escudo_url, cidade, pais")
          .in("nome", cachedNames);
        const byName = new Map<string, any>();
        (clubs || []).forEach((c: any) => byName.set(c.nome, c));
        const baseList: RivalItem[] = cachedNames.slice(0, 4).map((name) => {
          const c = byName.get(name);
          return {
            name,
            logo: c?.escudo_url || null,
            city: c?.cidade || null,
            country: c?.pais || null,
            source: c ? "cache" : "missing",
          };
        });
        await renderWithVotes(baseList);
        setLoading(false);
        return;
      }

      // 2) FALLBACK: sem cache → consultar Gemini/Wikipedia via edge function
      const { data, error } = await supabase.functions.invoke("get-rivals", {
        body: { club_name: clubName },
      });
      if (cancelled) return;

      if (error) {
        console.error("[RivalsColumn] get-rivals", error);
        setRivals([]);
      } else {
        const details = Array.isArray((data as any)?.rivalDetails) ? (data as any).rivalDetails : [];
        const names = Array.isArray((data as any)?.rivals) ? (data as any).rivals : [];
        const baseList: RivalItem[] = (details.length ? details : names.map((name: string) => ({ name, logo: null })))
          .filter((r: RivalItem) => r?.name)
          .slice(0, 4);
        await renderWithVotes(baseList);
      }
      setLoading(false);
    };

    fetchRivals();
    return () => {
      cancelled = true;
    };
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
        {loading ? (
          <div className="py-4 flex items-center justify-center gap-2 text-[10px] text-white/35 uppercase font-black italic">
            <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: primaryColor }} />
            Validando clássicos reais...
          </div>
        ) : rivals.length === 0 ? (
          <div className="py-4 text-center text-[10px] text-white/25 uppercase font-black italic">
            Nenhuma rivalidade histórica confirmada.
          </div>
        ) : (
          rivals.map((rival, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl hover:bg-white/[0.07] hover:border-white/20 transition-all group"
            >
              <div className="w-9 h-9 shrink-0 flex items-center justify-center bg-black/40 rounded-lg p-1 border border-white/10 group-hover:border-white/20 transition-colors">
                <ClubLogo
                  src={rival.logo || undefined}
                  alt={`Escudo do ${rival.name}`}
                  size="md"
                  className="w-full h-full rounded-lg bg-transparent group-hover:scale-110 transition-transform duration-500"
                  loading="eager"
                  fetchPriority="high"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[10px] font-black uppercase italic text-white truncate leading-tight">{rival.name}</h3>
                <span className="text-[8px] font-bold text-white/30 uppercase truncate block leading-tight">
                  {[rival.city, rival.country].filter(Boolean).join(" • ") || "Rival Histórico"}
                </span>
              </div>
              <div className="shrink-0 flex flex-col items-end leading-none">
                <span
                  className="text-sm font-black italic tabular-nums"
                  style={{ color: primaryColor }}
                >
                  {(rival.votes ?? 0).toLocaleString("pt-BR")}
                </span>
                <span className="text-[7px] font-black uppercase italic text-white/40 tracking-widest mt-0.5">
                  Votos
                </span>
              </div>
            </div>
          ))
        )}
      </div>

    </section>
  );
}
