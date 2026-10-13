/**
 * [CAMINHO]: src/pages/Jogos.tsx
 * [MÓDULO]: ABA "JOGOS" — os jogos do CLUBE EM EXIBIÇÃO e dos concorrentes dele, estilo app de futebol (Sofascore).
 * Mostra só os campeonatos em que o clube joga (ex.: Vila Nova → Série B; se estiver na Libertadores, ela também) e
 * nada que não tenha relação com ele. O clube é o do coração do torcedor, ou outro que ele consultar (busca aqui ou
 * no Dashboard — o mesmo "clube em exibição" vale em todas as telas). Faixa de dias, "Ao vivo", puxar para atualizar,
 * deslizar para trocar de dia. Tudo lido do nosso banco (nenhuma consulta à API de jogos por torcedor).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Loader2, Radio, Search, WifiOff, X } from "lucide-react";
import { useTranslationApp } from "@/hooks/useTranslationApp";
import { useViewedClub } from "@/contexts/ViewedClubContext";
import { useClubCompetitions, useCompetitionGames, LIVE_STATUSES, type DayGame } from "@/hooks/useDayGames";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { ClubSearch } from "@/components/dashboard/ClubSearch";
import { ClubLogo } from "@/components/ClubLogo";
import DayStrip, { DAY_OFFSETS } from "@/components/jogos/DayStrip";
import MatchRow from "@/components/jogos/MatchRow";

const DAY_MS = 24 * 3600 * 1000;
const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
};
/** Em qual "dia relativo a hoje" (−3…+7) o jogo cai, no fuso do torcedor. */
const offsetOf = (iso: string) => Math.round((startOfDay(new Date(iso)) - startOfDay(new Date())) / DAY_MS);

const sortGames = (a: DayGame, b: DayGame) => {
  const la = LIVE_STATUSES.has(a.status) ? 0 : 1;
  const lb = LIVE_STATUSES.has(b.status) ? 0 : 1;
  return la - lb || new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime();
};

export default function Jogos() {
  const { t } = useTranslationApp();
  const navigate = useNavigate();
  const { viewedClubName, viewedClubId, heartClubName, setViewedClubName, resetToHeart, isViewingHeart } = useViewedClub();
  const [offset, setOffset] = useState(0);
  const [onlyLive, setOnlyLive] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const autoFor = useRef<string>("");

  const { team, competitions, loading: loadingComps, failed: compsFailed } = useClubCompetitions(viewedClubName, viewedClubId);
  const leagueIds = useMemo(() => competitions.map((c) => c.leagueId), [competitions]);
  const { games, loading: loadingGames, failed, reload, reloadLoud } = useCompetitionGames(leagueIds);
  const loading = loadingComps || loadingGames;

  // Dia com jogos: escolhe sozinho o mais próximo (hoje; senão o próximo; senão o último) — uma vez por clube
  const byOffset = useMemo(() => {
    const m = new Map<number, DayGame[]>();
    for (const g of games) {
      const o = offsetOf(g.kickoff);
      if (!m.has(o)) m.set(o, []);
      m.get(o)!.push(g);
    }
    return m;
  }, [games]);
  const marks = useMemo(() => new Set([...byOffset.keys()].filter((o) => DAY_OFFSETS.includes(o))), [byOffset]);

  useEffect(() => {
    const key = `${viewedClubName}|${leagueIds.join(",")}`;
    if (loading || !games.length || autoFor.current === key) return;
    autoFor.current = key;
    const days = [...marks].sort((a, b) => a - b);
    const pick = marks.has(0) ? 0 : days.find((d) => d > 0) ?? [...days].reverse().find((d) => d < 0) ?? 0;
    setOffset(pick);
  }, [loading, games.length, marks, viewedClubName, leagueIds]);

  const liveCount = games.filter((g) => LIVE_STATUSES.has(g.status)).length;

  // Relógio dos minutos e atualização sozinha (só com a aba visível)
  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 15_000);
    const poll = setInterval(() => {
      if (!document.hidden) void reload();
    }, liveCount > 0 ? 45_000 : 5 * 60_000);
    return () => {
      clearInterval(clock);
      clearInterval(poll);
    };
  }, [liveCount, reload]);

  const { pull, refreshing, ready } = usePullToRefresh(reloadLoud);

  // Deslizar para os lados troca o dia
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY });
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = touch.current;
    touch.current = null;
    if (!s || onlyLive) return;
    const dx = e.changedTouches[0].clientX - s.x;
    const dy = e.changedTouches[0].clientY - s.y;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.8) {
      const i = DAY_OFFSETS.indexOf(offset);
      const next = DAY_OFFSETS[i + (dx < 0 ? 1 : -1)];
      if (next !== undefined) setOffset(next);
    }
  };

  const openTeam = useCallback(
    (teamId: number, leagueId: number, season: number | null) => navigate(`/clube/${teamId}?liga=${leagueId}&temp=${season ?? new Date().getFullYear()}`),
    [navigate],
  );

  const shown = useMemo(() => (onlyLive ? games.filter((g) => LIVE_STATUSES.has(g.status)) : byOffset.get(offset) ?? []), [onlyLive, games, byOffset, offset]);
  const sections = useMemo(
    () =>
      competitions
        .map((c) => ({ c, rows: shown.filter((g) => g.league_id === c.leagueId).sort(sortGames) }))
        .filter((s) => s.rows.length > 0),
    [competitions, shown],
  );
  const nextDay = useMemo(() => [...marks].sort((a, b) => a - b).find((d) => d > offset), [marks, offset]);
  const clubLabel = team?.name || viewedClubName || "";

  return (
    <div className="min-h-screen bg-black pb-28 text-white" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <style>{`@keyframes hc-blink{0%,100%{opacity:1}50%{opacity:.4}}.hc-blink{animation:hc-blink 1.2s ease-in-out infinite}`}</style>

      {/* Cabeçalho fixo */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/90 backdrop-blur" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mx-auto flex max-w-xl items-center gap-2 px-3 pb-2 pt-3">
          <h1 className="flex-1 text-xl font-black italic uppercase tracking-tight">{t("jogos.title")}</h1>
          <button
            onClick={() => setOnlyLive((v) => !v)}
            aria-pressed={onlyLive}
            disabled={liveCount === 0 && !onlyLive}
            data-testid="live-toggle"
            className={`flex h-10 items-center gap-1.5 rounded-full px-4 text-[12px] font-black uppercase tracking-wide transition disabled:opacity-40 ${
              onlyLive ? "bg-red-600 text-white" : "bg-red-600/15 text-red-400"
            }`}
          >
            <Radio className={`h-4 w-4 ${liveCount > 0 ? "hc-blink" : ""}`} /> {t("jogos.live")}
            <span className="tabular-nums" data-testid="live-count">{liveCount}</span>
          </button>
        </div>

        {/* Clube em exibição + buscar outro clube */}
        <div className="mx-auto max-w-xl px-3 pb-2">
          <div className="flex items-center gap-2" data-testid="club-chip">
            {team?.logo ? (
              <ClubLogo src={team.logo} alt={clubLabel} clubName={clubLabel} size="xs" className="h-7 w-7 shrink-0" />
            ) : null}
            <p className="min-w-0 flex-1 truncate text-[13px] font-black uppercase">
              {clubLabel || t("jogos.pick_club_short")}
              {!isViewingHeart && heartClubName && <span className="ml-2 text-[10px] font-semibold normal-case text-primary">{t("jogos.consulting")}</span>}
            </p>
            {!isViewingHeart && heartClubName && (
              <button onClick={resetToHeart} data-testid="back-to-mine" className="h-10 rounded-full bg-white/10 px-3 text-[11px] font-bold">
                {t("jogos.back_to_mine")}
              </button>
            )}
            <button
              onClick={() => setSearchOpen((v) => !v)}
              aria-label={t("jogos.search_club")}
              aria-expanded={searchOpen}
              data-testid="search-toggle"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10"
            >
              {searchOpen ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            </button>
          </div>
          {(searchOpen || !viewedClubName) && (
            <div className="mt-2" data-testid="club-search">
              <ClubSearch
                onSelect={(c) => {
                  setViewedClubName(c.name, c.api_id);
                  setOnlyLive(false);
                  setSearchOpen(false);
                }}
              />
            </div>
          )}
        </div>

        <div className="mx-auto max-w-xl">
          <DayStrip offset={offset} onChange={(o) => { setOnlyLive(false); setOffset(o); }} marks={marks} />
        </div>
      </header>

      {/* Indicador de "puxar para atualizar" */}
      <div className="flex h-0 items-end justify-center overflow-visible" aria-hidden>
        {(pull > 8 || refreshing) && (
          <div className="mb-[-28px] flex h-7 items-center gap-2 rounded-full bg-white/10 px-3 text-[10px] font-bold text-white/70" style={{ transform: `translateY(${Math.min(pull, 60)}px)` }}>
            <Loader2 className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} /> {ready ? t("jogos.release") : t("jogos.pull")}
          </div>
        )}
      </div>

      <main className="mx-auto max-w-xl px-3 pt-3" data-testid="jogos-main">
        {(failed || compsFailed) && (
          <div className="mb-3 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-white/70" data-testid="jogos-error">
            <WifiOff className="h-5 w-5 shrink-0" />
            <span className="flex-1">{t("jogos.error")}</span>
            <button onClick={reloadLoud} className="h-10 rounded-full bg-white px-4 text-xs font-black text-black">
              {t("jogos.retry")}
            </button>
          </div>
        )}

        {!viewedClubName && (
          <p className="py-10 text-center text-sm text-white/50" data-testid="jogos-pick">
            {t("jogos.pick_club")}
          </p>
        )}

        {viewedClubName && loading && !games.length && (
          <div className="space-y-2" data-testid="jogos-loading">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-white/[0.05]" />
            ))}
          </div>
        )}

        {/* Campeonatos do clube (só eles) */}
        {sections.map(({ c, rows }) => (
          <section key={c.leagueId} className="mb-3 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]" data-testid="sec-league">
            <div className="flex items-center gap-2 border-b border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
              {c.leagueLogo ? <img src={c.leagueLogo} alt="" className="h-5 w-5 rounded bg-white/90 object-contain p-0.5" /> : <span className="h-5 w-5" />}
              <p className="min-w-0 flex-1 truncate text-[12px] font-black uppercase tracking-wide">
                {c.country && <span className="font-semibold normal-case text-white/45">{c.country} · </span>}
                {c.leagueName}
              </p>
              {team && (
                <button
                  onClick={() => navigate(`/clube/${team.id}?liga=${c.leagueId}&temp=${c.season}&aba=chances`)}
                  data-testid="table-link"
                  className="flex h-8 items-center gap-0.5 rounded-full bg-white/10 pl-3 pr-2 text-[10px] font-bold text-white/80"
                >
                  {t("jogos.table_chances")} <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <ul>
              {rows.map((g) => (
                <MatchRow key={g.fixture_id} g={g} now={now} accent={!!team && (g.home_id === team.id || g.away_id === team.id)} onOpenTeam={openTeam} />
              ))}
            </ul>
          </section>
        ))}

        {viewedClubName && !loading && !failed && !compsFailed && competitions.length === 0 && (
          <p className="py-12 text-center text-sm text-white/45" data-testid="jogos-no-comp">
            {t("jogos.no_competitions", { club: clubLabel })}
          </p>
        )}

        {viewedClubName && !loading && competitions.length > 0 && sections.length === 0 && (
          <div className="py-12 text-center" data-testid="jogos-empty">
            <p className="text-sm text-white/45">{onlyLive ? t("jogos.empty_live") : t("jogos.no_games_day", { club: clubLabel })}</p>
            {!onlyLive && nextDay !== undefined && (
              <button onClick={() => setOffset(nextDay)} data-testid="go-next-day" className="mt-4 h-11 rounded-full bg-primary px-5 text-xs font-black uppercase text-white">
                {t("jogos.next_day")}
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
