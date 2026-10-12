/**
 * [CAMINHO]: src/pages/Jogos.tsx
 * [MÓDULO]: ABA "JOGOS" — todos os jogos do mundo por dia, estilo app de futebol (Sofascore):
 * faixa de dias, "Ao vivo" em destaque, "Meus times" primeiro, campeonatos principais em seguida e "Mais campeonatos"
 * (qualquer campeonato do mundo). Mobile-first: puxar para atualizar, deslizar para trocar de dia, esqueletos de
 * carregamento, atualização sozinha enquanto há jogo rolando. Tudo lido do nosso banco (nenhuma consulta à API).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Loader2, Radio, WifiOff } from "lucide-react";
import { useTranslationApp } from "@/hooks/useTranslationApp";
import { useMyTeamIds } from "@/hooks/useMyTeamIds";
import { useDayGames, LIVE_STATUSES, type DayGame } from "@/hooks/useDayGames";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { isTopLeague, leagueRank } from "@/data/topLeagues";
import DayStrip, { DAY_OFFSETS } from "@/components/jogos/DayStrip";
import MatchRow from "@/components/jogos/MatchRow";

const sortGames = (a: DayGame, b: DayGame) => {
  const la = LIVE_STATUSES.has(a.status) ? 0 : 1;
  const lb = LIVE_STATUSES.has(b.status) ? 0 : 1;
  return la - lb || new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime();
};

function LeagueHeader({ logo, country, name, count }: { logo: string | null; country: string | null; name: string | null; count: number }) {
  const { t } = useTranslationApp();
  return (
    <div className="flex items-center gap-2 border-b border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
      {logo ? <img src={logo} alt="" className="h-5 w-5 rounded bg-white/90 object-contain p-0.5" /> : <span className="h-5 w-5" />}
      <p className="min-w-0 flex-1 truncate text-[12px] font-black uppercase tracking-wide">
        {country && <span className="font-semibold normal-case text-white/45">{country} · </span>}
        {name}
      </p>
      <span className="text-[10px] font-semibold text-white/40">{t("jogos.games_n", { n: count })}</span>
    </div>
  );
}

export default function Jogos() {
  const { t } = useTranslationApp();
  const navigate = useNavigate();
  const myIds = useMyTeamIds();
  const [offset, setOffset] = useState(0);
  const [onlyLive, setOnlyLive] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [showMore, setShowMore] = useState(false);

  const dayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + offset);
    return d;
  }, [offset]);

  const { games, leagues, extra, loading, failed, reload, reloadLoud, openLeague } = useDayGames(dayStart, myIds);

  const liveWorld = leagues.reduce((a, l) => a + (l.ao_vivo || 0), 0);
  const liveInView = games.filter((g) => LIVE_STATUSES.has(g.status)).length;

  // Relógio dos minutos e atualização automática (só com a aba visível e quando faz sentido)
  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 15_000);
    const poll = setInterval(
      () => {
        if (!document.hidden && offset === 0) void reload();
      },
      liveWorld > 0 ? 30_000 : 180_000,
    );
    return () => {
      clearInterval(clock);
      clearInterval(poll);
    };
  }, [offset, liveWorld, reload]);

  // "Ao vivo" mostra também campeonatos fora da lista principal que tenham jogo rolando
  useEffect(() => {
    if (!onlyLive) return;
    leagues
      .filter((l) => l.ao_vivo > 0 && !isTopLeague(l.league_id) && !extra[l.league_id])
      .slice(0, 12)
      .forEach((l) => void openLeague(l.league_id));
  }, [onlyLive, leagues, extra, openLeague]);

  const { pull, refreshing, ready } = usePullToRefresh(reloadLoud);

  // Deslizar para os lados troca o dia
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY });
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = touch.current;
    touch.current = null;
    if (!s) return;
    const dx = e.changedTouches[0].clientX - s.x;
    const dy = e.changedTouches[0].clientY - s.y;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.8) {
      const i = DAY_OFFSETS.indexOf(offset);
      const next = DAY_OFFSETS[i + (dx < 0 ? 1 : -1)];
      if (next !== undefined) setOffset(next);
    }
  };

  const openTeam = useCallback(
    (teamId: number, leagueId: number, season: number | null) => {
      navigate(`/clube/${teamId}?liga=${leagueId}&temp=${season ?? new Date().getFullYear()}`);
    },
    [navigate],
  );

  const mySet = useMemo(() => new Set(myIds), [myIds]);
  const isMine = (g: DayGame) => (g.home_id != null && mySet.has(g.home_id)) || (g.away_id != null && mySet.has(g.away_id));

  const all = useMemo(() => {
    const map = new Map<number, DayGame>();
    for (const g of games) map.set(g.fixture_id, g);
    for (const arr of Object.values(extra)) for (const g of arr) map.set(g.fixture_id, g);
    return [...map.values()];
  }, [games, extra]);

  const visible = useMemo(() => (onlyLive ? all.filter((g) => LIVE_STATUSES.has(g.status)) : all), [all, onlyLive]);
  const mineRows = useMemo(() => visible.filter(isMine).sort(sortGames), [visible, mySet]);

  const sections = useMemo(() => {
    const by = new Map<number, DayGame[]>();
    for (const g of visible) {
      if (!by.has(g.league_id)) by.set(g.league_id, []);
      by.get(g.league_id)!.push(g);
    }
    return [...by.entries()]
      .map(([id, rows]) => ({ id, rows: rows.sort(sortGames), head: rows[0] }))
      .sort((a, b) => {
        const la = a.rows.some((r) => LIVE_STATUSES.has(r.status)) ? 0 : 1;
        const lb = b.rows.some((r) => LIVE_STATUSES.has(r.status)) ? 0 : 1;
        return (onlyLive ? la - lb : 0) || leagueRank(a.id) - leagueRank(b.id) || (a.head.league_name || "").localeCompare(b.head.league_name || "");
      });
  }, [visible, onlyLive]);

  const loadedIds = useMemo(() => new Set(all.map((g) => g.league_id)), [all]);
  const moreLeagues = leagues.filter((l) => !isTopLeague(l.league_id) && !extra[l.league_id] && !loadedIds.has(l.league_id));

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
            disabled={liveWorld === 0 && !onlyLive}
            data-testid="live-toggle"
            className={`flex h-10 items-center gap-1.5 rounded-full px-4 text-[12px] font-black uppercase tracking-wide transition disabled:opacity-40 ${
              onlyLive ? "bg-red-600 text-white" : "bg-red-600/15 text-red-400"
            }`}
          >
            <Radio className={`h-4 w-4 ${liveWorld > 0 ? "hc-blink" : ""}`} /> {t("jogos.live")}
            <span className="tabular-nums" data-testid="live-count">{liveWorld}</span>
          </button>
        </div>
        <div className="mx-auto max-w-xl">
          <DayStrip offset={offset} onChange={setOffset} />
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
        {failed && (
          <div className="mb-3 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-white/70" data-testid="jogos-error">
            <WifiOff className="h-5 w-5 shrink-0" />
            <span className="flex-1">{t("jogos.error")}</span>
            <button onClick={reloadLoud} className="h-10 rounded-full bg-white px-4 text-xs font-black text-black">
              {t("jogos.retry")}
            </button>
          </div>
        )}

        {loading && !games.length && (
          <div className="space-y-2" data-testid="jogos-loading">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-white/[0.05]" />
            ))}
          </div>
        )}

        {/* Meus times */}
        {mineRows.length > 0 && (
          <section className="mb-3 overflow-hidden rounded-2xl border border-primary/40 bg-primary/[0.06]" data-testid="sec-mine">
            <div className="flex items-center gap-2 border-b border-primary/30 px-3 py-2.5">
              <span className="text-[12px] font-black uppercase tracking-wide text-primary">★ {t("jogos.my_teams")}</span>
            </div>
            <ul>
              {mineRows.map((g) => (
                <MatchRow key={`m-${g.fixture_id}`} g={g} now={now} accent onOpenTeam={openTeam} />
              ))}
            </ul>
          </section>
        )}

        {/* Campeonatos */}
        {sections.map((s) => (
          <section key={s.id} className="mb-3 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]" data-testid="sec-league">
            <LeagueHeader logo={s.head.league_logo} country={s.head.country} name={s.head.league_name} count={s.rows.length} />
            <ul>
              {s.rows.map((g) => (
                <MatchRow key={g.fixture_id} g={g} now={now} accent={isMine(g)} onOpenTeam={openTeam} />
              ))}
            </ul>
          </section>
        ))}

        {!loading && !failed && !sections.length && (
          <p className="py-12 text-center text-sm text-white/45" data-testid="jogos-empty">
            {onlyLive ? t("jogos.empty_live") : t("jogos.empty")}
          </p>
        )}

        {/* Mais campeonatos (qualquer campeonato do mundo) */}
        {!onlyLive && moreLeagues.length > 0 && (
          <section className="mb-6" data-testid="sec-more">
            <button
              onClick={() => setShowMore((v) => !v)}
              aria-expanded={showMore}
              className="flex min-h-[48px] w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 text-[12px] font-black uppercase tracking-wide"
            >
              <span>
                {t("jogos.more")} <span className="font-semibold text-white/40">({moreLeagues.length})</span>
              </span>
              <ChevronDown className={`h-4 w-4 transition ${showMore ? "rotate-180" : ""}`} />
            </button>
            {showMore && (
              <ul className="mt-2 overflow-hidden rounded-2xl border border-white/10">
                {moreLeagues.slice(0, 150).map((l) => (
                  <li key={l.league_id}>
                    <button onClick={() => void openLeague(l.league_id)} className="flex min-h-[48px] w-full items-center gap-2 border-b border-white/[0.06] px-3 text-left last:border-b-0" data-testid="more-league">
                      {l.league_logo ? <img src={l.league_logo} alt="" className="h-5 w-5 rounded bg-white/90 object-contain p-0.5" loading="lazy" /> : <span className="h-5 w-5" />}
                      <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">
                        <span className="text-white/45">{l.country} · </span>
                        {l.league_name}
                      </span>
                      {l.ao_vivo > 0 && <span className="hc-blink rounded-full bg-red-600/20 px-2 py-0.5 text-[10px] font-black text-red-400">{l.ao_vivo}</span>}
                      <span className="text-[10px] text-white/40">{t("jogos.games_n", { n: l.jogos })}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {liveInView === 0 && liveWorld > 0 && !onlyLive && !loading && offset === 0 && (
          <p className="mb-3 text-center text-[11px] text-white/40">{t("jogos.live_elsewhere", { n: liveWorld })}</p>
        )}
      </main>
    </div>
  );
}
