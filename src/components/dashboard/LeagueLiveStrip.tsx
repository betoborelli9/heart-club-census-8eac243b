/**
 * [CAMINHO]: src/components/dashboard/LeagueLiveStrip.tsx
 * [MÓDULO]: Jogos do dia do campeonato (estilo Sofascore, discreto): emblemas, nomes e placar.
 * Lê SÓ do nosso banco (league_fixtures — o servidor busca o mundo todo uma vez), então qualquer torcedor,
 * de qualquer clube, vê os mesmos jogos sem nenhuma consulta nova à API de jogos. O clube do torcedor
 * (ou o pesquisado) aparece em destaque. Tempo real: o gol chega assim que é gravado.
 *  • AO VIVO: placar VERMELHO piscando + minutos do PRÓPRIO jogo (cada jogo tem o seu relógio)
 *  • ENCERRADO: placar PRETO, parado, sem minutos
 *  • AINDA NÃO COMEÇOU: só o horário, apagado
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ClubLogo } from "@/components/ClubLogo";
import { useTranslationApp } from "@/hooks/useTranslationApp";

export type LeagueFixture = {
  fixture_id: number;
  league_id: number;
  kickoff: string;
  status: string;
  elapsed: number | null;
  home_id: number | null;
  home_name: string | null;
  home_logo: string | null;
  away_id: number | null;
  away_name: string | null;
  away_logo: string | null;
  goals_home: number | null;
  goals_away: number | null;
  updated_at: string;
};

const LIVE = new Set(["1H", "2H", "ET", "LIVE"]);
const BREAK = new Set(["HT", "BT"]);
const DONE = new Set(["FT", "AET", "PEN"]);
const HOUR = 3600_000;

const sameLocalDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

/** Minutos do jogo: o último valor da API + o tempo que passou desde que ele foi gravado (até +3 min de folga). */
export function liveMinute(f: LeagueFixture, now: number): number {
  const base = f.elapsed ?? 0;
  const extra = Math.min(3, Math.max(0, Math.floor((now - new Date(f.updated_at).getTime()) / 60_000)));
  return base + extra;
}

export default function LeagueLiveStrip({ leagueId, teamId, primaryColor = "#ff6200" }: { leagueId: number; teamId?: number | null; primaryColor?: string }) {
  const { t } = useTranslationApp();
  const [rows, setRows] = useState<Record<number, LeagueFixture>>({});
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    setRows({});
    (async () => {
      const { data } = await (supabase as any)
        .from("league_fixtures")
        .select("*")
        .eq("league_id", leagueId)
        .gte("kickoff", new Date(Date.now() - 30 * HOUR).toISOString())
        .lte("kickoff", new Date(Date.now() + 30 * HOUR).toISOString())
        .order("kickoff", { ascending: true });
      if (!alive || !data) return;
      const map: Record<number, LeagueFixture> = {};
      for (const r of data as LeagueFixture[]) map[r.fixture_id] = r;
      setRows(map);
    })();

    const ch = (supabase as any)
      .channel(`lf-${leagueId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "league_fixtures", filter: `league_id=eq.${leagueId}` }, (p: any) => {
        const r = p?.new as LeagueFixture | undefined;
        if (r?.fixture_id) setRows((prev) => ({ ...prev, [r.fixture_id]: r }));
      })
      .subscribe();

    return () => {
      alive = false;
      (supabase as any).removeChannel(ch);
    };
  }, [leagueId]);

  const today = new Date(now);
  const list = useMemo(() => {
    const all = Object.values(rows).filter((f) => LIVE.has(f.status) || BREAK.has(f.status) || sameLocalDay(new Date(f.kickoff), today));
    const rank = (f: LeagueFixture) => (teamId && (f.home_id === teamId || f.away_id === teamId) ? 0 : LIVE.has(f.status) || BREAK.has(f.status) ? 1 : DONE.has(f.status) ? 2 : 3);
    return all
      .filter((f) => LIVE.has(f.status) || BREAK.has(f.status) || DONE.has(f.status) || f.status === "NS" || f.status === "TBD")
      .sort((a, b) => rank(a) - rank(b) || new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, teamId, today.toDateString()]);

  const anyLive = list.some((f) => LIVE.has(f.status));
  useEffect(() => {
    if (!anyLive) return;
    const id = setInterval(() => setNow(Date.now()), 15_000); // só enquanto há jogo rolando
    return () => clearInterval(id);
  }, [anyLive]);

  if (!list.length) return null;

  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] px-2.5 py-2" data-testid="league-live-strip">
      <style>{`@keyframes hc-live-blink{0%,100%{opacity:1}50%{opacity:.45}}.hc-live-blink{animation:hc-live-blink 1.2s ease-in-out infinite}`}</style>
      <p className="mb-1 text-[8px] font-black uppercase tracking-widest text-white/30">{t("competitions.league_today")}</p>
      <ul className="space-y-0.5">
        {list.map((f) => {
          const mine = !!teamId && (f.home_id === teamId || f.away_id === teamId);
          const live = LIVE.has(f.status);
          const brk = BREAK.has(f.status);
          const done = DONE.has(f.status);
          const hasScore = f.goals_home != null && f.goals_away != null;
          const time = new Date(f.kickoff).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          return (
            <li
              key={f.fixture_id}
              data-testid={mine ? "live-row-mine" : "live-row"}
              className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[10px]"
              style={mine ? { backgroundColor: `${primaryColor}1f`, boxShadow: `inset 2px 0 0 ${primaryColor}` } : undefined}
            >
              <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
                <span className={`truncate text-right ${mine && f.home_id === teamId ? "font-black text-white" : "text-white/80"}`}>{f.home_name}</span>
                <ClubLogo src={f.home_logo || undefined} alt={f.home_name || ""} size="xs" className="h-3.5 w-3.5 shrink-0" />
              </div>

              <div className="flex w-[64px] shrink-0 flex-col items-center leading-none">
                {live || brk ? (
                  <>
                    <span className="hc-live-blink text-[8px] font-bold tabular-nums text-red-500" data-testid="live-minute">
                      {brk ? t("competitions.halftime") : `${liveMinute(f, now)}'`}
                    </span>
                    <span className="hc-live-blink mt-0.5 rounded bg-red-500/15 px-1.5 py-0.5 text-[11px] font-black tabular-nums text-red-500">
                      {f.goals_home ?? 0} - {f.goals_away ?? 0}
                    </span>
                  </>
                ) : done && hasScore ? (
                  <span className="rounded bg-black px-1.5 py-0.5 text-[11px] font-black tabular-nums text-white/70" data-testid="final-score">
                    {f.goals_home} - {f.goals_away}
                  </span>
                ) : (
                  <span className="text-[9px] font-mono text-white/30">{time}</span>
                )}
              </div>

              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <ClubLogo src={f.away_logo || undefined} alt={f.away_name || ""} size="xs" className="h-3.5 w-3.5 shrink-0" />
                <span className={`truncate ${mine && f.away_id === teamId ? "font-black text-white" : "text-white/80"}`}>{f.away_name}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
