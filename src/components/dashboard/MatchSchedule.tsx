/**
 * [CAMINHO]: src/components/dashboard/MatchSchedule.tsx
 * [MÓDULO]: Próximos 3 jogos com data, hora e onde assistir
 */
import { useEffect, useState } from "react";
import { Calendar, Tv } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

interface Match {
  date: string;
  time: string;
  opponent: string;
  competition?: string;
  broadcasters?: string[];
  home?: boolean;
}

interface Props {
  clubName: string | null;
  primaryColor?: string;
}

export default function MatchSchedule({ clubName, primaryColor = "#ff6200" }: Props) {
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<Match[]>([]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!clubName) {
        setMatches([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data } = await supabase.functions.invoke("league-standings", { body: { clubName } });
        if (cancelled) return;
        setMatches(data?.fixtures || []);
      } catch {
        if (!cancelled) setMatches([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [clubName]);

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <Calendar className="w-5 h-5" style={{ color: primaryColor }} />
        <h2 className="text-lg md:text-xl font-black italic uppercase tracking-tight">Próximos Jogos</h2>
      </header>

      {loading ? (
        <Skeleton className="h-40 w-full bg-white/5 rounded-2xl" />
      ) : matches.length === 0 ? (
        <p className="text-sm italic text-white/40 py-4">
          Em breve: agenda oficial dos próximos jogos.
        </p>
      ) : (
        <div className="space-y-2">
          {matches.slice(0, 3).map((m, i) => (
            <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
              <div className="text-center min-w-[60px]">
                <p className="text-[10px] font-mono text-white/40 uppercase">{m.date}</p>
                <p className="text-base font-black italic" style={{ color: primaryColor }}>{m.time}</p>
              </div>
              <div className="flex-1">
                <p className="text-xs font-black uppercase italic">
                  {m.home ? "vs" : "@"} {m.opponent}
                </p>
                {m.competition && (
                  <p className="text-[10px] text-white/40 font-mono uppercase">{m.competition}</p>
                )}
              </div>
              {m.broadcasters && m.broadcasters.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Tv className="w-3 h-3 text-white/40" />
                  <div className="flex gap-1">
                    {m.broadcasters.map((b) => (
                      <span
                        key={b}
                        className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/10 uppercase"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
