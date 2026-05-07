/**
 * [CAMINHO]: src/components/dashboard/Z4Infographic.tsx
 * [MÓDULO]: Coluna 3 — Saída do Z4 (escudos 20x20 + setas)
 */
import { useEffect, useState } from "react";
import { ShieldAlert, ArrowRight, Info } from "lucide-react";
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

export default function Z4Infographic({ clubName, clubLogo, primaryColor = "#ff6200" }: Props) {
  const [standings, setStandings] = useState<StandingTeam[]>([]);
  const [me, setMe] = useState<StandingTeam | null>(null);
  const [league, setLeague] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!clubName) {
        setStandings([]);
        setMe(null);
        return;
      }
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
      }
    };
    run();
    return () => { cancelled = true; };
  }, [clubName]);

  if (!me) return null;

  // Pega 3 concorrentes próximos (acima ou abaixo)
  const competitors = standings
    .filter((t) => t.name !== me.name && Math.abs(t.position - me.position) <= 3)
    .slice(0, 3);

  return (
    <section className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 space-y-3">
      <header className="flex items-center gap-2 pb-2 border-b border-white/5">
        <ShieldAlert className="w-4 h-4" style={{ color: primaryColor }} />
        <h3 className="text-[11px] font-black italic uppercase tracking-widest text-white flex-1">
          {league || "Série A"} — Saída do Z4
        </h3>
        <Info className="w-3 h-3 text-white/30" />
      </header>

      <p className="text-[10px] italic text-white/60 leading-snug">
        Vencer próximo jogo + tropeços de{" "}
        {competitors.map((c) => c.name).join(", ") || "concorrentes"}
      </p>

      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="space-y-1.5">
          <p className="text-[9px] font-black italic uppercase tracking-widest text-white/40">
            Cenário
          </p>
          <div className="flex items-center gap-1.5 flex-wrap">
            <ClubLogo src={clubLogo} alt={clubName || ""} size="xs" className="w-5 h-5" />
            <span className="text-[10px] font-black text-green-400">+</span>
            <ArrowRight className="w-3 h-3 text-white/40" />
            <ClubLogo src={clubLogo} alt={clubName || ""} size="xs" className="w-5 h-5" />
            <span className="text-[10px] font-black text-green-400">+</span>
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-[9px] font-black italic uppercase tracking-widest text-white/40">
            Competidores
          </p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {competitors.slice(0, 2).map((c) => (
              <span key={c.name} className="flex items-center gap-1">
                <ClubLogo src={c.logo} alt={c.name} size="xs" className="w-5 h-5" />
                <span className="text-[10px] font-black text-red-400">−</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <p className="text-[9px] italic text-white/30 pt-2 border-t border-white/5 flex items-center gap-1">
        <Info className="w-2.5 h-2.5" />
        Atualizações automáticas da API de campeonato
      </p>
    </section>
  );
}
