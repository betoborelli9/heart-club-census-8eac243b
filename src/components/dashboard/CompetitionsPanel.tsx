/**
 * [CAMINHO]: src/components/dashboard/CompetitionsPanel.tsx
 * [MÓDULO]: Painel global de competições — abas dinâmicas com classificação,
 * próximo jogo e modo AO VIVO. Dados via edge function league-standings (API-Football).
 */
import { Fragment, useEffect, useMemo, useState } from "react";
import { Trophy, Radio, Calendar, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ClubLogo } from "@/components/ClubLogo";
import { supabase } from "@/integrations/supabase/client";
import { useTranslationApp } from "@/hooks/useTranslationApp";
import { isHistoricalRival } from "@/lib/rivalries";
import { getLeagueRules, getZoneForPosition, type LeagueRules, type LeagueZone } from "@/data/leagueRules";
import { teamColors } from "@/data/teamColors";

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

/**
 * Keyframes injetados uma única vez para pulsos usados na tabela.
 * Isolado ao componente para não poluir index.css.
 */
const PULSE_CSS = `
@keyframes hc-pulse-strong { 0%,100%{opacity:1} 50%{opacity:.55} }
@keyframes hc-pulse-soft   { 0%,100%{opacity:1} 50%{opacity:.82} }
@keyframes hc-pulse-bracket{ 0%,100%{opacity:.95} 50%{opacity:.45} }
.hc-pulse-strong{animation:hc-pulse-strong 2s ease-in-out infinite}
.hc-pulse-soft  {animation:hc-pulse-soft   3s ease-in-out infinite}
.hc-pulse-bracket{animation:hc-pulse-bracket 2.4s ease-in-out infinite}
`;

export default function CompetitionsPanel({ clubName, primaryColor = "#ff6200" }: Props) {
  const { t, language } = useTranslationApp();
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<{ id: number; name: string; logo: string } | null>(null);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    let firstLoad = true;
    const tick = async () => {
      if (!clubName) {
        setCompetitions([]);
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase.functions.invoke("league-standings", { body: { clubName } });
        if (cancelled) return;
        if (error) throw error;
        const comps: Competition[] = data?.competitions || [];
        // Só atualiza se veio conteúdo — evita "sumir" a tabela quando o
        // polling recebe uma resposta vazia transitória da API-Football.
        if (comps.length) {
          setTeam(data?.team || null);
          const sorted = [...comps].sort((a, b) => {
            if (a.liveMatch && !b.liveMatch) return -1;
            if (!a.liveMatch && b.liveMatch) return 1;
            const ta = a.nextMatch ? new Date(a.nextMatch.date).getTime() : Infinity;
            const tb = b.nextMatch ? new Date(b.nextMatch.date).getTime() : Infinity;
            return ta - tb;
          });
          setCompetitions(sorted);
          if (!activeTab) setActiveTab(String(sorted[0].leagueId));
        } else if (firstLoad) {
          setCompetitions([]);
        }
      } catch (e) {
        // Preserva estado anterior em falha de polling — só limpa no 1º carregamento.
        console.warn("[CompetitionsPanel] tick failed:", e);
        if (!cancelled && firstLoad) setCompetitions([]);
      } finally {
        if (!cancelled) {
          if (firstLoad) setLoading(false);
          firstLoad = false;
        }
      }
    };
    setLoading(true);
    tick();
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
            {t("competitions.title")}
          </h3>
        </header>
        <p className="text-[11px] italic text-white/40 py-3">
          {clubName ? t("competitions.empty") : t("competitions.select_club")}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 space-y-4">
      <style dangerouslySetInnerHTML={{ __html: PULSE_CSS }} />
      <header className="flex items-center gap-2 pb-2 border-b border-white/5">
        <Trophy className="w-4 h-4" style={{ color: primaryColor }} />
        <h3 className="text-[11px] font-black italic uppercase tracking-widest text-white flex-1">
          {t("competitions.title")}
        </h3>
        <span className="text-[9px] font-mono text-white/30">{t("competitions.tournaments", { count: competitions.length })}</span>
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

        {competitions.map((c) => {
          const focusMatch = c.liveMatch || c.nextMatch;
          const opponent = focusMatch
            ? focusMatch.home.id === team?.id
              ? focusMatch.away
              : focusMatch.home
            : null;
          return (
            <TabsContent key={c.leagueId} value={String(c.leagueId)} className="space-y-4 mt-3">
              <MatchCard match={focusMatch} live={!!c.liveMatch} primaryColor={primaryColor} />
              <StandingsTable
                rows={c.standings}
                meTeamId={team?.id}
                opponentTeamId={opponent?.id}
                opponentName={opponent?.name}
                heartClubName={clubName}
                primaryColor={primaryColor}
                leagueId={c.leagueId}
                leagueName={c.leagueName}
              />
              <LeagueRulesPanel leagueId={c.leagueId} />
            </TabsContent>
          );
        })}
      </Tabs>
    </section>
  );
}

function MatchCard({ match, live, primaryColor }: { match: Match | null; live: boolean; primaryColor: string }) {
  const { t, language } = useTranslationApp();
  if (!match) {
    return (
      <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3 text-[11px] italic text-white/40">
        {t("competitions.no_match")}
      </div>
    );
  }
  const dt = new Date(match.date);
  const locale = language === "en" ? "en-US" : language === "es" ? "es-ES" : "pt-BR";
  const dateStr = dt.toLocaleDateString(locale, { day: "2-digit", month: "short", weekday: "short" }).replace(/\./g, "");
  const timeStr = dt.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  const isLive = live || LIVE_STATUSES.has(match.status || "");

  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3 space-y-2">
      <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-widest">
        {isLive ? (
          <span className="flex items-center gap-1.5 text-red-500">
            <Radio className="w-3 h-3 animate-pulse" /> {t("competitions.live")} {match.elapsed ? `· ${match.elapsed}'` : ""}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-white/40">
            <Calendar className="w-3 h-3" /> {dateStr} · {timeStr}
          </span>
        )}
        {match.league.round && <span className="text-white/30 truncate max-w-[140px]">{match.league.round}</span>}
      </div>
      <div className="flex items-start gap-2">
        <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
          <ClubLogo src={match.home.logo} alt={match.home.name} size="sm" className="w-10 h-10 shrink-0" />
          <span className="text-[10px] font-black italic uppercase text-white text-center leading-tight break-words w-full">
            {match.home.name}
          </span>
        </div>
        <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
          <ClubLogo src={match.away.logo} alt={match.away.name} size="sm" className="w-10 h-10 shrink-0" />
          <span className="text-[10px] font-black italic uppercase text-white text-center leading-tight break-words w-full">
            {match.away.name}
          </span>
        </div>
      </div>
      <div className="flex justify-center">
        <div className="px-4 py-1.5 rounded-md bg-black/40 text-center min-w-[92px] shrink-0">
          {isLive || match.goals.home != null ? (
            <div className="flex flex-col items-center leading-none">
              {isLive && match.elapsed != null && (
                <span className="mb-1 text-[10px] font-mono font-bold tabular-nums" style={{ color: primaryColor }}>
                  {match.elapsed}'
                </span>
              )}
              <span className="text-base font-black tabular-nums" style={{ color: primaryColor }}>
                {match.goals.home ?? 0} - {match.goals.away ?? 0}
              </span>
              {isLive && (
                <span className="mt-1 flex items-center gap-1 text-[8px] font-mono uppercase tracking-widest" style={{ color: primaryColor }}>
                  <Radio className="w-2 h-2 animate-pulse" /> {t("competitions.live")}
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs font-black text-white/60">{timeStr}</span>
          )}
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
  opponentTeamId,
  opponentName,
  heartClubName,
  primaryColor,
  leagueId,
}: {
  rows: StandingRow[];
  meTeamId?: number;
  opponentTeamId?: number;
  opponentName?: string;
  heartClubName?: string | null;
  primaryColor: string;
  leagueId?: number;
  leagueName?: string;
}) {
  const { t } = useTranslationApp();
  const headerBg = "bg-[#141414]";
  const numCol = "text-center px-1 py-1.5 w-7 border-b border-white/[0.06] tabular-nums";
  const fmt = (v: number | undefined | null) => (v === undefined || v === null ? 0 : v);
  const lid = leagueId ?? 0;

  // Se a competição ainda não começou (todos zerados) → ordena por A→Z e
  // reatribui posições. Mantém subcabeçalhos/colchetes das zonas previstas.
  const displayRows = useMemo(() => {
    if (!rows.length) return rows;
    const notStarted = rows.every((r) => (r.points ?? 0) === 0 && (r.played ?? 0) === 0);
    if (!notStarted) return rows;
    const sorted = [...rows].sort((a, b) =>
      (a.name || "").localeCompare(b.name || "", "pt-BR", { sensitivity: "base" }),
    );
    return sorted.map((r, i) => ({ ...r, position: i + 1 }));
  }, [rows]);

  const total = displayRows.length;

  // Cor tradicional do adversário (via mapa estático de cores dos clubes).
  const opponentTheme = opponentName ? teamColors[opponentName] : null;
  const opponentColor = opponentTheme?.primaryHex || "#fbbf24";
  const hexToRgba = (hex: string, a: number) => {
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16) || 0;
    const g = parseInt(h.slice(2, 4), 16) || 0;
    const b = parseInt(h.slice(4, 6), 16) || 0;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  };
  const opponentBg = hexToRgba(opponentColor, 0.16);

  const isRivalName = (name: string) => isHistoricalRival(name, heartClubName);

  const zoneByPos = useMemo(() => {
    const map = new Map<number, LeagueZone>();
    displayRows.forEach((r) => {
      const z = getZoneForPosition(lid, r.position, total);
      if (z) map.set(r.position, z);
    });
    return map;
  }, [displayRows, lid, total]);

  const presentZones: LeagueZone[] = [];
  const firstPosOfZone = new Map<string, number>();
  zoneByPos.forEach((z, pos) => {
    if (!firstPosOfZone.has(z.key)) {
      firstPosOfZone.set(z.key, pos);
      // Zonas neutras não entram na legenda (limpar visual)
      if (!z.neutral) presentZones.push(z);
    } else if (pos < (firstPosOfZone.get(z.key) ?? Infinity)) {
      firstPosOfZone.set(z.key, pos);
    }
  });

  // Skeleton se ainda não temos linhas — nunca deixar o container vazio/sumindo.
  if (!displayRows.length) {
    return (
      <div className="space-y-1.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-full bg-white/[0.04] rounded" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto md:overflow-x-visible -mx-4 px-4 md:mx-0 md:px-0 thin-orange-scroll rounded-lg">
        <table className="w-full text-[10px] min-w-[360px] md:min-w-0 border-separate border-spacing-0">
          <thead>
            <tr className="text-[9px] font-mono uppercase tracking-wider text-white/70">
              <th className={`sticky left-0 z-20 ${headerBg} text-left py-1.5 pl-1.5 pr-1 border-b border-white/15 min-w-[110px]`}>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 inline-block text-white/50">#</span>
                  <span>{t("competitions.team_col")}</span>
                </div>
              </th>
              <th className={`${numCol} ${headerBg} border-white/15 font-bold`} style={{ color: primaryColor }}>P</th>
              <th className={`${numCol} ${headerBg} border-white/15`}>J</th>
              <th className={`${numCol} ${headerBg} border-white/15`}>V</th>
              <th className={`${numCol} ${headerBg} border-white/15`}>E</th>
              <th className={`${numCol} ${headerBg} border-white/15`}>D</th>
              <th className={`${numCol} ${headerBg} border-white/15 w-9`}>SG</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((r) => {
              const isMe = !!(meTeamId && r.teamId === meTeamId);
              const isOpponent = !isMe && !!(opponentTeamId && r.teamId === opponentTeamId);
              const isRival = !isMe && !isOpponent && isRivalName(r.name);
              const zone = zoneByPos.get(r.position) || null;
              const isNeutralZone = !!zone?.neutral;
              const isFirstOfZone = zone && firstPosOfZone.get(zone.key) === r.position;
              const groupLabel = isFirstOfZone && zone?.header ? zone.header : null;

              // Fundo translúcido da linha por contexto (zona neutra NÃO pinta fundo)
              const rowStyle: React.CSSProperties = isMe
                ? { backgroundColor: `${primaryColor}26` }
                : isOpponent
                ? { backgroundColor: opponentBg }
                : isRival
                ? { backgroundColor: "rgba(239, 68, 68, 0.06)" }
                : {};

              const rowClass = [
                isMe ? "hc-pulse-strong" : "",
                isOpponent ? "hc-pulse-strong" : "",
                isRival ? "hc-pulse-soft" : "",
              ].filter(Boolean).join(" ");

              const stickyStyle: React.CSSProperties = {
                ...rowStyle,
                backgroundColor: rowStyle.backgroundColor || "#0b0b0b",
              };

              // Borda-inset esquerda: prioridade → time do coração > rival > zona (não neutra)
              let insetColor: string | null = null;
              if (isMe) insetColor = primaryColor;
              else if (isRival) insetColor = "#ef4444";
              else if (zone && !isNeutralZone) insetColor = zone.style.color;

              const stickyClass =
                zone?.style.pulse && !isNeutralZone && !isMe && !isRival ? "hc-pulse-bracket" : "";

              // Cor do número da posição — neutra usa branco padrão
              const posColor = isNeutralZone
                ? "rgba(255,255,255,0.5)"
                : zone?.style.color || "rgba(255,255,255,0.5)";

              // Cor do subcabeçalho de grupo — neutro usa branco suave
              const headerColor = isNeutralZone
                ? "rgba(255,255,255,0.55)"
                : zone?.style.color || "rgba(255,255,255,0.55)";
                        <ClubLogo src={r.logo} alt={r.name} size="xs" className="w-3.5 h-3.5 shrink-0" />
                        <span
                          className={`truncate text-[10px] ${
                            isMe ? "font-black text-white" : isOpponent ? "font-bold" : isRival ? "font-semibold text-white/90" : "text-white/85"
                          }`}
                          style={isOpponent ? { color: opponentColor } : undefined}
                        >
                          {r.name}
                          {isOpponent && (
                            <span className="ml-1 text-[8px] font-mono uppercase" style={{ color: opponentColor, opacity: 0.85 }}>
                              · {t("competitions.target")}
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td
                      className={`${numCol} font-black`}
                      style={{ color: isMe ? primaryColor : isOpponent ? opponentColor : "rgba(255,255,255,0.95)" }}
                    >
                      {fmt(r.points)}
                    </td>
                    <td className={`${numCol} text-white/70`}>{fmt(r.played)}</td>
                    <td className={`${numCol} text-white/70`}>{fmt(r.win)}</td>
                    <td className={`${numCol} text-white/70`}>{fmt(r.draw)}</td>
                    <td className={`${numCol} text-white/70`}>{fmt(r.lose)}</td>
                    <td className={`${numCol} text-white/70 w-9`}>
                      {(r.goalsDiff ?? 0) > 0 ? `+${r.goalsDiff}` : fmt(r.goalsDiff)}
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {presentZones.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 px-1 pt-1 border-t border-white/5">
          {presentZones.map((z) => (
            <div key={z.key} className="flex items-center gap-1.5">
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: z.style.color }}
              />
              <span className="text-[8.5px] font-bold uppercase tracking-wider text-white/55">
                {z.legend}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Painel de regras dinâmico por competição.
 * Renderiza título + seções (descrição + bullets) a partir do registro
 * `leagueRules.ts`. Largura acompanha a tabela (herda max-width do pai)
 * e ocupa 100% no mobile com padding lateral para evitar overflow.
 */
function LeagueRulesPanel({ leagueId }: { leagueId: number }) {
  const rules: LeagueRules | null = getLeagueRules(leagueId);
  if (!rules) return null;
  return (
    <div className="w-full rounded-xl bg-white/[0.02] border border-white/10 px-3 sm:px-4 py-3 space-y-3 text-white/80">
      <h4 className="text-[11px] font-black italic uppercase tracking-widest" style={{ color: "#ff6200" }}>
        {rules.rulesTitle}
      </h4>
      {rules.sections.map((sec, i) => (
        <div key={i} className="space-y-1">
          <p className="text-[11px] font-bold text-white">{sec.title}</p>
          {sec.body && <p className="text-[11px] leading-snug break-words">{sec.body}</p>}
          {sec.bullets && sec.bullets.length > 0 && (
            <ul className="text-[11px] leading-snug list-disc pl-4 space-y-0.5">
              {sec.bullets.map((b, j) => (
                <li key={j}>{b}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

