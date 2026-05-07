/**
 * [CAMINHO]: src/components/dashboard/LeagueObjectives.tsx
 * [MÓDULO]: Motor de probabilidades autônomo (G6 / Libertadores / Sul / Z4 / Modo Desespero)
 * Por enquanto consome edge function `league-standings` (mock estruturado por divisão).
 */
import { useEffect, useState } from "react";
import { Target, TrendingUp, AlertTriangle, Trophy } from "lucide-react";
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
  primaryColor?: string;
}

interface Goal {
  label: string;
  detail: string;
  variant: "good" | "warn" | "danger";
  icon: any;
}

export default function LeagueObjectives({ clubName, primaryColor = "#ff6200" }: Props) {
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
    return () => {
      cancelled = true;
    };
  }, [clubName]);

  const goals: Goal[] = [];
  let competitors: StandingTeam[] = [];
  let dangerMode = false;

  if (me && standings.length) {
    const total = standings.length;
    const pos = me.position;
    const zRelegStart = total - 3;

    if (pos <= 6) {
      goals.push({
        label: "Libertadores",
        detail: `Posição ${pos} — dentro do G6`,
        variant: "good",
        icon: Trophy,
      });
    } else if (pos <= 12) {
      const above = standings[5];
      const gap = (above?.points ?? 0) - me.points;
      goals.push({
        label: "Rumo à Libertadores",
        detail: `${gap > 0 ? `${gap} pontos` : "empatado"} para o G6`,
        variant: "warn",
        icon: TrendingUp,
      });
      goals.push({
        label: "Sul-Americana",
        detail: `Posição ${pos} — zona do G12`,
        variant: "good",
        icon: Target,
      });
    } else if (pos < zRelegStart) {
      goals.push({
        label: "Pré-Libertadores distante",
        detail: `Posição ${pos} — meio de tabela`,
        variant: "warn",
        icon: Target,
      });
    } else {
      dangerMode = true;
      const safe = standings[zRelegStart - 1];
      const gap = (safe?.points ?? 0) - me.points;
      goals.push({
        label: "Modo Desespero — Z4",
        detail: gap > 0 ? `${gap} pontos para sair do Z4` : "Empatado com o 1º fora do Z4",
        variant: "danger",
        icon: AlertTriangle,
      });
      competitors = standings.filter((t) => Math.abs(t.position - pos) <= 3 && t.name !== me.name).slice(0, 5);
    }

    if (!dangerMode) {
      competitors = standings
        .filter((t) => Math.abs(t.position - pos) <= 2 && t.name !== me.name)
        .slice(0, 5);
    }
  }

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <Target className="w-5 h-5" style={{ color: primaryColor }} />
        <h2 className="text-lg md:text-xl font-black italic uppercase tracking-tight">Objetivos na Tabela</h2>
        {league && <span className="text-[10px] font-mono text-white/30 ml-auto">{league}</span>}
      </header>

      {loading ? (
        <Skeleton className="h-40 w-full bg-white/5 rounded-2xl" />
      ) : !me ? (
        <p className="text-sm italic text-white/40 py-6">
          {clubName ? "Sem dados de tabela para esse clube ainda." : "Selecione um clube para ver os objetivos."}
        </p>
      ) : (
        <div className="space-y-3">
          {goals.map((g, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-4 rounded-2xl border"
              style={{
                borderColor: g.variant === "danger" ? "#dc2626" : g.variant === "warn" ? primaryColor + "55" : "rgba(255,255,255,0.08)",
                background:
                  g.variant === "danger"
                    ? "linear-gradient(135deg, rgba(220,38,38,0.18), rgba(0,0,0,0.4))"
                    : "rgba(255,255,255,0.02)",
              }}
            >
              <g.icon
                className="w-6 h-6 shrink-0"
                style={{ color: g.variant === "danger" ? "#dc2626" : primaryColor }}
              />
              <div className="flex-1">
                <p className="text-xs font-black uppercase italic tracking-wider text-white">{g.label}</p>
                <p className="text-[11px] text-white/60 italic">{g.detail}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-white/40">POS</span>
                <p className="text-2xl font-black italic" style={{ color: primaryColor }}>
                  {me.position}º
                </p>
              </div>
            </div>
          ))}

          {competitors.length > 0 && (
            <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.02]">
              <p className="text-[10px] font-black uppercase italic tracking-widest text-white/50 mb-3">
                {dangerMode ? "Concorrentes diretos no Z4" : "Concorrentes na disputa"}
              </p>
              <div className="flex flex-wrap gap-3">
                {competitors.map((c) => (
                  <div key={c.name} className="flex items-center gap-2 bg-white/5 rounded-full pl-1 pr-3 py-1">
                    <ClubLogo src={c.logo} alt={c.name} size="xs" />
                    <span className="text-[10px] font-bold uppercase">{c.name}</span>
                    <span className="text-[10px] font-mono text-white/40">{c.position}º</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
