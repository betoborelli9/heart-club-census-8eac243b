/**
 * [CAMINHO]: src/components/dashboard/CompetitionsPanel.tsx
 * [MÓDULO]: Painel global de competições — abas dinâmicas com classificação,
 * próximo jogo e modo AO VIVO. Dados via edge function league-standings (API-Football).
 */
import { useEffect, useState } from "react";
import { Trophy, Radio, Calendar, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ClubLogo } from "@/components/ClubLogo";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  clubName: string | null;
  primaryColor?: string;
}

interface StandingRow {
  position: number;
  name: string;
  logo?: string;
  teamId?: number;
  points: number;
  played?: number;
  win?: number;
  draw?: number;
  lose?: number;
  goalsDiff?: number;
  group?: string | null;
}

interface Match {
  id: number;
  date: string;
  status?: string;
  elapsed?: number | null;
  venue?: string;
  league: { id: number; name: string; logo: string; round?: string };
  home: { id: number; name: string; logo: string };
  away: { id: number; name: string; logo: string };
  goals: { home: number | null; away: number | null };
}

interface Competition {
  leagueId: number;
  leagueName: string;
  leagueLogo: string;
  country?: string;
  season: number;
  standings: StandingRow[];
  me: StandingRow | null;
  nextMatch: Match | null;
  liveMatch: Match | null;
}

const LIVE_STATUSES = new Set(["1H", "2H", "HT", "ET", "BT", "P", "LIVE"]);

export default function CompetitionsPanel({ clubName, primaryColor = "#ff6200" }: Props) {
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<{ id: number; name: string; logo: string } | null>(null);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (!clubName) {
        setCompetitions([]);
        setLoading(false);
        return;
      }
      try {
        const { data } = await supabase.functions.invoke("league-standings", { body: { clubName } });
        if (cancelled) return;
        setTeam(data?.team || null);
        const comps: Competition[] = data?.competitions || [];
        // Priorização pelo calendário: aba inicial = competição com jogo AO VIVO
        // ou com nextMatch mais próximo. Mantém todas as abas navegáveis.
        const sorted = [...comps].sort((a, b) => {
          if (a.liveMatch && !b.liveMatch) return -1;
          if (!a.liveMatch && b.liveMatch) return 1;
          const ta = a.nextMatch ? new Date(a.nextMatch.date).getTime() : Infinity;
          const tb = b.nextMatch ? new Date(b.nextMatch.date).getTime() : Infinity;
          return ta - tb;
        });
        setCompetitions(comps);
        if (sorted.length && !activeTab) setActiveTab(String(sorted[0].leagueId));
      } catch {
        if (!cancelled) setCompetitions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    setLoading(true);
    tick();
    // refresh leve a cada 60s para pegar lives/standings novos (cache do servidor protege a cota)
    const id = setInterval(tick, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubName]);

  if (loading) {
    return (
      <section className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 space-y-3">
        <Skeleton className="h-6 w-40 bg-white/5" />
        <Skeleton className="h-48 w-full bg-white/5 rounded-xl" />
      </section>
    );
  }

  if (!competitions.length) {
    return (
      <section className="rounded-2xl bg-white/[0.03] border border-white/10 p-4">
        <header className="flex items-center gap-2 pb-2">
          <Trophy className="w-4 h-4" style={{ color: primaryColor }} />
          <h3 className="text-[11px] font-black italic uppercase tracking-widest text-white">
            Competições Ativas
          </h3>
        </header>
        <p className="text-[11px] italic text-white/40 py-3">
          {clubName ? "Nenhuma competição ativa encontrada." : "Selecione um clube."}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 space-y-4">
      <header className="flex items-center gap-2 pb-2 border-b border-white/5">
        <Trophy className="w-4 h-4" style={{ color: primaryColor }} />
        <h3 className="text-[11px] font-black italic uppercase tracking-widest text-white flex-1">
          Competições Ativas
        </h3>
        <span className="text-[9px] font-mono text-white/30">{competitions.length} torneio(s)</span>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full h-auto flex flex-wrap gap-1 bg-white/[0.02] p-1 rounded-xl">
          {competitions.map((c) => (
            <TabsTrigger
              key={c.leagueId}
              value={String(c.leagueId)}
              className="flex items-center gap-1.5 text-[10px] font-black italic uppercase data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50 px-2 py-1.5 rounded-lg"
            >
              {c.leagueLogo && (
                <img src={c.leagueLogo} alt="" className="w-4 h-4 object-contain" />
              )}
              <span className="truncate max-w-[120px]">{c.leagueName}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {competitions.map((c) => (
          <TabsContent key={c.leagueId} value={String(c.leagueId)} className="space-y-4 mt-3">
            <MatchCard match={c.liveMatch || c.nextMatch} live={!!c.liveMatch} primaryColor={primaryColor} />
            <StandingsTable
              rows={c.standings}
              meTeamId={team?.id}
              primaryColor={primaryColor}
            />
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}

function MatchCard({ match, live, primaryColor }: { match: Match | null; live: boolean; primaryColor: string }) {
  if (!match) {
    return (
      <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3 text-[11px] italic text-white/40">
        Sem jogo agendado nesta competição.
      </div>
    );
  }
  const dt = new Date(match.date);
  const dateStr = dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", weekday: "short" }).replace(/\./g, "");
  const timeStr = dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const isLive = live || LIVE_STATUSES.has(match.status || "");

  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3 space-y-2">
      <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-widest">
        {isLive ? (
          <span className="flex items-center gap-1.5 text-red-500">
            <Radio className="w-3 h-3 animate-pulse" /> AO VIVO {match.elapsed ? `· ${match.elapsed}'` : ""}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-white/40">
            <Calendar className="w-3 h-3" /> {dateStr} · {timeStr}
          </span>
        )}
        {match.league.round && <span className="text-white/30 truncate max-w-[140px]">{match.league.round}</span>}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <ClubLogo src={match.home.logo} alt={match.home.name} size="xs" className="w-7 h-7 shrink-0" />
          <span className="text-[11px] font-black italic uppercase text-white truncate">{match.home.name}</span>
        </div>
        <div className="px-3 py-1 rounded-md bg-black/40 text-center min-w-[60px]">
          {isLive || match.goals.home != null ? (
            <span className="text-base font-black" style={{ color: primaryColor }}>
              {match.goals.home ?? 0} - {match.goals.away ?? 0}
            </span>
          ) : (
            <span className="text-[11px] font-black text-white/60">{timeStr}</span>
          )}
        </div>
        <div className="flex-1 flex items-center gap-2 justify-end min-w-0">
          <span className="text-[11px] font-black italic uppercase text-white truncate text-right">{match.away.name}</span>
          <ClubLogo src={match.away.logo} alt={match.away.name} size="xs" className="w-7 h-7 shrink-0" />
        </div>
      </div>
      {match.venue && (
        <div className="flex items-center gap-1.5 text-[9px] italic text-white/40">
          <MapPin className="w-2.5 h-2.5" /> {match.venue}
        </div>
      )}
    </div>
  );
}

function StandingsTable({
  rows,
  meTeamId,
  primaryColor,
}: {
  rows: StandingRow[];
  meTeamId?: number;
  primaryColor: string;
}) {
  if (!rows.length) return <p className="text-[11px] italic text-white/40">Sem classificação disponível.</p>;
  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <table className="w-full text-[11px] min-w-[420px]">
        <thead>
          <tr className="text-[9px] font-mono uppercase tracking-widest text-white/40 border-b border-white/5">
            <th className="text-left py-1.5 pr-2 w-6">#</th>
            <th className="text-left py-1.5">Time</th>
            <th className="text-center py-1.5 w-8">P</th>
            <th className="text-center py-1.5 w-8 hidden sm:table-cell">J</th>
            <th className="text-center py-1.5 w-8 hidden sm:table-cell">V</th>
            <th className="text-center py-1.5 w-8 hidden sm:table-cell">E</th>
            <th className="text-center py-1.5 w-8 hidden sm:table-cell">D</th>
            <th className="text-center py-1.5 w-10">SG</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isMe = meTeamId && r.teamId === meTeamId;
            return (
              <tr
                key={`${r.teamId}-${r.position}`}
                className={`border-b border-white/[0.03] ${isMe ? "bg-white/[0.04]" : ""}`}
                style={isMe ? { boxShadow: `inset 3px 0 0 ${primaryColor}` } : undefined}
              >
                <td className="py-1.5 pr-2 font-mono text-white/60">{r.position}</td>
                <td className="py-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <ClubLogo src={r.logo} alt={r.name} size="xs" className="w-4 h-4 shrink-0" />
                    <span className={`truncate ${isMe ? "font-black text-white" : "text-white/80"}`}>
                      {r.name}
                    </span>
                  </div>
                </td>
                <td className="text-center font-black" style={isMe ? { color: primaryColor } : undefined}>
                  {r.points}
                </td>
                <td className="text-center text-white/50 hidden sm:table-cell">{r.played ?? "-"}</td>
                <td className="text-center text-white/50 hidden sm:table-cell">{r.win ?? "-"}</td>
                <td className="text-center text-white/50 hidden sm:table-cell">{r.draw ?? "-"}</td>
                <td className="text-center text-white/50 hidden sm:table-cell">{r.lose ?? "-"}</td>
                <td className="text-center text-white/50">{r.goalsDiff ?? "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
