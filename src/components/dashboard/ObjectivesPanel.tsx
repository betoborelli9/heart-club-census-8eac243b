/**
 * [CAMINHO]: src/components/dashboard/ObjectivesPanel.tsx
 * [MÓDULO]: Coluna 3 — Cálculo de Objetivos com barras de progresso finas (4px)
 */
import { useEffect, useState } from "react";
import { Target, Trophy, Shield } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ClubLogo } from "@/components/ClubLogo";
import { supabase } from "@/integrations/supabase/client";

interface StandingTeam {
  position: number;
  name: string;
  logo?: string;
  points: number;
}

interface Props {
  clubName: string | null;
  clubLogo?: string | null;
  primaryColor?: string;
}

interface ObjectiveRow {
  label: string;
  detail: string;
  pct: number;
  icon: any;
  highlight?: boolean;
}

export default function ObjectivesPanel({ clubName, clubLogo, primaryColor = "#ff6200" }: Props) {
  const [loading, setLoading] = useState(true);
  const [league, setLeague] = useState<string | null>(null);
  const [standings, setStandings] = useState<StandingTeam[]>([]);
  const [me, setMe] = useState<StandingTeam | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!clubName) {
        setStandings([]);
        setMe(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data } = await supabase.functions.invoke("league-standings", { body: { clubName } });
        if (cancelled) return;
        setLeague(data?.league || null);
        setStandings(data?.standings || []);
        setMe(data?.me || null);
      } catch {
        if (!cancelled) {
          setStandings([]);
          setMe(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [clubName]);

  // Cálculo de probabilidades simples (mock razoável p/ exibição)
  const objectives: ObjectiveRow[] = [];
  if (me && standings.length) {
    const total = standings.length;
    const pos = me.position;
    const top = standings[0]?.points || 1;

    // Próximo jogo (sempre highlight no topo)
    objectives.push({
      label: clubName?.toUpperCase() || "CLUBE",
      detail: `Vencer próximo jogo (${league || "Liga"})`,
      pct: 100,
      icon: Trophy,
      highlight: true,
    });

    // Sul-Americana (G12)
    const sulPct = Math.max(5, Math.min(95, Math.round((1 - (pos - 1) / total) * 80 + 5)));
    objectives.push({
      label: "Sul-Americana",
      detail: "Vencer próximo jogo + derrota do Juventude",
      pct: pos <= 12 ? Math.max(60, sulPct) : sulPct,
      icon: Shield,
    });

    // Libertadores (G6)
    const libPct = Math.max(3, Math.min(90, Math.round((1 - (pos - 1) / total) * 60)));
    objectives.push({
      label: "Libertadores",
      detail: "3 vitórias + tropeço do Cruzeiro",
      pct: pos <= 6 ? Math.max(70, libPct) : libPct,
      icon: Trophy,
    });
  }

  return (
    <section className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 space-y-3">
      <header className="flex items-center gap-2 pb-2 border-b border-white/5">
        <Target className="w-4 h-4" style={{ color: primaryColor }} />
        <h3 className="text-[11px] font-black italic uppercase tracking-widest text-white flex-1">
          Cálculo de Objetivos {league && <span className="text-white/40">({league})</span>}
        </h3>
      </header>

      {loading ? (
        <Skeleton className="h-32 w-full bg-white/5 rounded-xl" />
      ) : !me ? (
        <p className="text-[11px] italic text-white/40 py-3">
          {clubName ? "Sem dados de tabela." : "Selecione um clube."}
        </p>
      ) : (
        <div className="space-y-3">
          {objectives.map((o, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 ${o.highlight ? "pb-2 border-b border-white/5" : ""}`}
            >
              <div className="w-8 h-8 shrink-0 mt-0.5">
                {o.highlight && clubLogo ? (
                  <ClubLogo src={clubLogo} alt={o.label} size="xs" className="w-8 h-8" />
                ) : (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: primaryColor + "22" }}
                  >
                    <o.icon className="w-4 h-4" style={{ color: primaryColor }} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-[10px] font-black italic uppercase tracking-wider text-white truncate">
                    {o.label}
                  </p>
                  {!o.highlight && (
                    <span className="text-[10px] font-mono font-black" style={{ color: primaryColor }}>
                      {o.pct}%
                    </span>
                  )}
                </div>
                <p className="text-[9px] italic text-white/50 leading-tight mb-1.5 line-clamp-2">
                  {o.detail}
                </p>
                {!o.highlight && (
                  <div className="h-1 w-full rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${o.pct}%`,
                        background: `linear-gradient(90deg, ${primaryColor}, ${primaryColor}aa)`,
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
