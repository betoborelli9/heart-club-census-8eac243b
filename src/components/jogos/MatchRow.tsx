/**
 * [CAMINHO]: src/components/jogos/MatchRow.tsx
 * [MÓDULO]: Linha de jogo no estilo de app de futebol: coluna de hora/minuto à esquerda, os dois times (emblema + nome)
 * em duas linhas e o placar à direita. Ao vivo: minuto e placar em vermelho piscando; encerrado: "Fim" e o vencedor
 * em destaque; dado velho nunca aparece como ao vivo (reaproveita isStale/liveMinuteLabel da faixa de jogos).
 * Toque no time abre a página do clube. Alvo de toque ≥ 48 px.
 */
import { ClubLogo } from "@/components/ClubLogo";
import { useTranslationApp } from "@/hooks/useTranslationApp";
import { isStale, liveMinuteLabel, type LeagueFixture } from "@/components/dashboard/LeagueLiveStrip";
import type { DayGame } from "@/hooks/useDayGames";

const LIVE = new Set(["1H", "2H", "ET", "LIVE"]);
const BREAK = new Set(["HT", "BT"]);
const DONE = new Set(["FT", "AET", "PEN"]);

export default function MatchRow({
  g,
  now,
  accent,
  onOpenTeam,
}: {
  g: DayGame;
  now: number;
  accent?: boolean;
  onOpenTeam: (teamId: number, leagueId: number, season: number | null) => void;
}) {
  const { t, language } = useTranslationApp();
  const asFx = g as unknown as LeagueFixture;
  const stale = isStale(asFx, now);
  const threeHoursPassed = now - new Date(g.kickoff).getTime() > 3 * 3600 * 1000;
  const live = LIVE.has(g.status) && !stale && !threeHoursPassed;
  const brk = BREAK.has(g.status) && !stale && !threeHoursPassed;
  const done = DONE.has(g.status) || ((LIVE.has(g.status) || BREAK.has(g.status)) && threeHoursPassed);
  const hasScore = g.goals_home != null && g.goals_away != null;
  const showScore = hasScore && (live || brk || done || stale);
  const time = new Date(g.kickoff).toLocaleTimeString(language, { hour: "2-digit", minute: "2-digit" });

  let status: React.ReactNode;
  if (live) status = <span className="hc-blink font-black tabular-nums text-red-500" data-testid="row-minute">{liveMinuteLabel(asFx, now)}</span>;
  else if (brk) status = <span className="hc-blink font-black text-red-500" data-testid="row-minute">{t("jogos.ht")}</span>;
  else if (done) status = <span className="font-bold text-white/50">{t("jogos.ft")}</span>;
  else if (g.status === "PST" || g.status === "SUSP" || g.status === "INT") status = <span className="font-bold text-amber-400">{t("jogos.postponed")}</span>;
  else if (g.status === "CANC" || g.status === "ABD") status = <span className="font-bold text-white/40">{t("jogos.cancelled")}</span>;
  else if (stale) status = <span className="font-bold text-white/40">…</span>;
  else status = <span className="font-semibold tabular-nums text-white/70">{time}</span>;

  const homeWon = done && hasScore && (g.goals_home as number) > (g.goals_away as number);
  const awayWon = done && hasScore && (g.goals_away as number) > (g.goals_home as number);
  const scoreCls = (strong: boolean) =>
    live || brk ? "hc-blink text-red-500 font-black" : done ? (strong ? "text-white font-black" : "text-white/45 font-semibold") : "text-white/50 font-semibold";

  const Team = ({ id, name, logo, strong }: { id: number | null; name: string | null; logo: string | null; strong: boolean }) => (
    <button
      type="button"
      onClick={() => id && onOpenTeam(id, g.league_id, g.season)}
      className="flex min-h-[24px] w-full min-w-0 items-center gap-2 text-left"
      aria-label={name || ""}
    >
      <ClubLogo src={logo || undefined} alt={name || ""} clubName={name || undefined} size="xs" className="h-5 w-5 shrink-0" />
      <span className={`truncate text-[13px] ${strong ? "font-extrabold text-white" : "text-white/85"}`}>{name}</span>
    </button>
  );

  return (
    <li
      className="flex items-stretch gap-2 border-b border-white/[0.06] py-2 pl-2 pr-3 last:border-b-0"
      style={accent ? { boxShadow: "inset 3px 0 0 #ff6200" } : undefined}
      data-testid="match-row"
    >
      <div className="flex w-12 shrink-0 flex-col items-center justify-center border-r border-white/[0.06] pr-2 text-[11px]">{status}</div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        <Team id={g.home_id} name={g.home_name} logo={g.home_logo} strong={homeWon} />
        <Team id={g.away_id} name={g.away_name} logo={g.away_logo} strong={awayWon} />
      </div>
      <div className="flex w-7 shrink-0 flex-col items-end justify-center gap-1 text-[14px] tabular-nums" data-testid="row-score">
        {showScore ? (
          <>
            <span className={`leading-[24px] ${scoreCls(homeWon)}`}>{g.goals_home}</span>
            <span className={`leading-[24px] ${scoreCls(awayWon)}`}>{g.goals_away}</span>
          </>
        ) : null}
      </div>
    </li>
  );
}
