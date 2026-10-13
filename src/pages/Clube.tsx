/**
 * [CAMINHO]: src/pages/Clube.tsx
 * [MÓDULO]: PÁGINA DO CLUBE — temporada completa de qualquer time de qualquer campeonato do mundo.
 * Mobile-first (celular, PWA e app): cabeçalho com as cores do clube, resumo da campanha, forma recente e TODOS os
 * jogos desde a 1ª rodada (encerrados, ao vivo e futuros). Dados de club-season (nosso banco; 1 busca à API por
 * campeonato para todos os torcedores). Entradas: tabela de classificação e faixa de jogos do dia.
 */
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Heart, Landmark, Radio, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslationApp } from "@/hooks/useTranslationApp";
import { useClubTheme } from "@/hooks/useClubTheme";
import { isLightColor } from "@/hooks/useMatchCardInfo";
import { ClubLogo } from "@/components/ClubLogo";
import ClubSquad from "@/components/clube/ClubSquad";
import ClubChances from "@/components/clube/ClubChances";
import { ClubSearch } from "@/components/dashboard/ClubSearch";
import { pickMainCompetition } from "@/lib/main-competition";
import { useViewedClubOptional } from "@/contexts/ViewedClubContext";

type Game = {
  id: number;
  date: string;
  st: string;
  r: string | null;
  h: number;
  hn: string;
  hl: string | null;
  a: number;
  an: string;
  al: string | null;
  gh: number | null;
  ga: number | null;
  v?: string | null;
  el?: number | null;
  ex?: number | null;
  upd?: string;
};
type Summary = { played: number; win: number; draw: number; lose: number; goalsFor: number; goalsAgainst: number; goalsDiff: number; points: number; pct: number; form: ("V" | "E" | "D")[] };
type Payload = {
  team: { id: number; name: string; logo: string | null };
  league: { id: number; season: number; name?: string; logo?: string; country?: string };
  summary: Summary;
  games: Game[];
};

const LIVE = new Set(["1H", "2H", "ET", "LIVE"]);
const BREAK = new Set(["HT", "BT"]);
const DONE = new Set(["FT", "AET", "PEN"]);
const HEX = /^#[0-9a-fA-F]{6}$/;

/** "Regular Season - 33" → "R33" (só quando há " - número"); fases ("Round of 16") ficam como texto curto. */
export function roundLabel(r: string | null | undefined): string {
  if (!r) return "";
  const m = r.match(/-\s*(\d+)\s*$/);
  if (m) return `R${m[1]}`;
  return r.length > 14 ? `${r.slice(0, 13)}…` : r;
}

/** Resultado do ponto de vista do time: V / E / D (ou null se não terminou). */
export function resultFor(g: Game, teamId: number): "V" | "E" | "D" | null {
  if (!DONE.has(g.st) || g.gh == null || g.ga == null) return null;
  const mine = g.h === teamId ? g.gh : g.ga;
  const other = g.h === teamId ? g.ga : g.gh;
  return mine > other ? "V" : mine === other ? "E" : "D";
}

const RES_STYLE: Record<"V" | "E" | "D", { bg: string; fg: string }> = {
  V: { bg: "#16a34a", fg: "#ffffff" },
  E: { bg: "#ca8a04", fg: "#ffffff" },
  D: { bg: "#dc2626", fg: "#ffffff" },
};

function minuteLabel(g: Game, now: number): string {
  const base = g.el ?? 0;
  if (g.ex && g.ex > 0) return `${base}+${g.ex}'`;
  const extra = g.upd ? Math.min(3, Math.max(0, Math.floor((now - new Date(g.upd).getTime()) / 60_000))) : 0;
  const cap = g.st === "1H" ? 45 : g.st === "2H" ? 90 : g.st === "ET" ? 120 : 999;
  return `${Math.min(cap, base + extra)}'`;
}

function Stat({ label, value, strong }: { label: string; value: string | number; strong?: boolean }) {
  return (
    <div className="flex min-w-[44px] flex-col items-center">
      <span className={`tabular-nums leading-none ${strong ? "text-2xl font-black" : "text-lg font-extrabold"}`}>{value}</span>
      <span className="mt-1 text-[9px] font-bold uppercase tracking-wider opacity-70">{label}</span>
    </div>
  );
}

const Clube = () => {
  const navigate = useNavigate();
  const { teamId: teamParam } = useParams();
  const [sp] = useSearchParams();
  const { t, language } = useTranslationApp();
  const teamId = Number(teamParam);
  const leagueId = Number(sp.get("liga"));
  const season = Number(sp.get("temp"));

  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<"all" | "done" | "next">("all");
  const [tab, setTab] = useState<"jogos" | "chances" | "elenco">(sp.get("aba") === "elenco" ? "elenco" : sp.get("aba") === "chances" ? "chances" : "jogos");
  const [now, setNow] = useState(() => Date.now());
  const viewed = useViewedClubOptional();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchMsg, setSearchMsg] = useState<string | null>(null);
  const nextRef = useRef<HTMLLIElement | null>(null);
  const scrolled = useRef(false);

  const load = useCallback(async () => {
    if (![teamId, leagueId, season].every((n) => Number.isInteger(n) && n > 0)) {
      setError(true);
      return;
    }
    const { data: res, error: err } = await supabase.functions.invoke("club-season", { body: { teamId, leagueId, season } });
    if (err || !res || (res as any).error) {
      setError(true);
      return;
    }
    setError(false);
    setData(res as Payload);
  }, [teamId, leagueId, season]);

  useEffect(() => {
    scrolled.current = false;
    setData(null);
    void load();
  }, [load]);

  // Atualiza sozinho (placar e minutos) só enquanto o time tem jogo rolando e a aba está visível
  const hasLive = !!data?.games.some((g) => LIVE.has(g.st) || BREAK.has(g.st));
  useEffect(() => {
    if (!hasLive) return;
    const clock = setInterval(() => setNow(Date.now()), 15_000);
    const poll = setInterval(() => {
      if (!document.hidden) void load();
    }, 45_000);
    return () => {
      clearInterval(clock);
      clearInterval(poll);
    };
  }, [hasLive, load]);

  // Cores do clube (cadastro por id; senão pelo nome)
  const nameTheme = useClubTheme(data?.team.name);
  const [club, setClub] = useState<{ cor_primaria: string | null; cor_secundaria: string | null; estadio_nome: string | null } | null>(null);
  useEffect(() => {
    let alive = true;
    setClub(null);
    if (!teamId) return;
    (async () => {
      const { data: row } = await supabase.from("clubes_cache").select("cor_primaria, cor_secundaria, estadio_nome").eq("api_id", String(teamId)).maybeSingle();
      if (alive) setClub((row as any) || null);
    })();
    return () => {
      alive = false;
    };
  }, [teamId]);
  const primary = (club?.cor_primaria && HEX.test(club.cor_primaria) ? club.cor_primaria : null) || (HEX.test(nameTheme.primaryHex) ? nameTheme.primaryHex : "#1a1a1a");
  const secondary = (club?.cor_secundaria && HEX.test(club.cor_secundaria) ? club.cor_secundaria : null) || (HEX.test(nameTheme.secondaryHex) ? nameTheme.secondaryHex : "#ffffff");
  const heroText = isLightColor(primary) ? "#111111" : "#ffffff";

  const games = useMemo(() => data?.games ?? [], [data]);
  const nextGame = useMemo(() => games.find((g) => LIVE.has(g.st) || BREAK.has(g.st)) || games.find((g) => g.st === "NS" || g.st === "TBD"), [games]);
  const upcoming = useMemo(
    () => games.filter((g) => !DONE.has(g.st)).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [games],
  );
  const played = useMemo(
    () => games.filter((g) => DONE.has(g.st)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [games],
  );
  const shown = useMemo(() => (filter === "done" ? played : filter === "next" ? upcoming : [...upcoming, ...played]), [filter, upcoming, played]);

  const dateFmt = (iso: string) => new Date(iso).toLocaleDateString(language, { day: "2-digit", month: "short" }).replace(".", "");
  const timeFmt = (iso: string) => new Date(iso).toLocaleTimeString(language, { hour: "2-digit", minute: "2-digit" });

  // Pesquisar outro clube: abre a página dele no campeonato principal, mantendo a mesma aba
  const openOtherClub = async (c: { name: string; api_id?: number | null }, toHeart = false) => {
    setSearchBusy(true);
    setSearchMsg(null);
    try {
      const { data: ls } = await supabase.functions.invoke("league-standings", { body: c.api_id ? { clubName: c.name, teamId: c.api_id } : { clubName: c.name } });
      const id = (ls as any)?.team?.id;
      const comp = pickMainCompetition(((ls as any)?.competitions || []) as any[]);
      if (!id || !comp) {
        setSearchMsg(t("clube.search_none"));
        return;
      }
      setSearchOpen(false);
      setFilter("all");
      navigate(`/clube/${id}?liga=${comp.leagueId}&temp=${comp.season}&aba=${tab}`, toHeart ? { replace: true } : undefined);
    } catch {
      setSearchMsg(t("clube.search_none"));
    } finally {
      setSearchBusy(false);
    }
  };

  // Botão "Meu clube": só quando o torcedor tem time do coração e está vendo outro clube
  const heartName = viewed?.heartClubName || null;
  const heartId = viewed?.heartClubId || null;
  const norm = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const viewingHeart = heartId ? heartId === teamId : !!(data && heartName && norm(data.team.name) === norm(heartName));
  const showHeartBtn = !!heartName && !viewingHeart;

  return (
    <div className="min-h-screen bg-black pb-28 text-white" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      {/* Cabeçalho com as cores do clube */}
      <header
        className="relative overflow-hidden px-4 pb-5 pt-4"
        style={{ background: `linear-gradient(160deg, ${primary} 0%, ${primary} 55%, ${secondary} 190%)`, color: heroText }}
        data-testid="club-hero"
        data-primary={primary}
      >
        <div className="mb-3 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-black/25 backdrop-blur" aria-label={t("clube.back")}>
            <ArrowLeft className="h-5 w-5" />
          </button>
          {showHeartBtn && (
            <button
              onClick={() => void openOtherClub({ name: heartName as string, api_id: heartId }, true)}
              disabled={searchBusy}
              aria-label={t("clube.my_club_aria")}
              data-testid="club-heart-btn"
              className="group mx-2 inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-full border border-white/40 bg-white/90 px-4 text-black shadow-[0_6px_20px_rgba(0,0,0,0.35)] backdrop-blur transition-transform active:scale-95 disabled:opacity-60"
            >
              <Heart className="h-5 w-5 shrink-0 fill-red-500 text-red-500 transition-transform group-active:scale-110" />
              <span className="truncate text-[12px] font-black uppercase tracking-wide">{t("clube.my_club")}</span>
            </button>
          )}
          <button
            onClick={() => {
              setSearchOpen((v) => !v);
              setSearchMsg(null);
            }}
            aria-label={t("clube.search")}
            aria-expanded={searchOpen}
            data-testid="club-search-toggle"
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-black/25 backdrop-blur"
          >
            {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </button>
        </div>
        {searchOpen && (
          <div className="mb-3" data-testid="club-search">
            <ClubSearch onSelect={(c) => void openOtherClub(c)} />
            {searchBusy && <p className="mt-2 text-center text-xs font-semibold opacity-85">{t("clube.search_loading")}</p>}
          </div>
        )}
        {searchMsg && <p className="mb-3 text-center text-xs font-semibold" data-testid="club-search-msg">{searchMsg}</p>}

        {!data && !error && <div className="h-28 animate-pulse rounded-2xl bg-black/20" />}
        {error && <p className="py-6 text-center text-sm font-semibold">{t("clube.error")}</p>}

        {data && (
          <>
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white shadow-xl">
                <ClubLogo src={data.team.logo || undefined} alt={data.team.name} clubName={data.team.name} className="h-16 w-16 object-contain" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-black italic uppercase leading-tight">{data.team.name}</h1>
                <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold opacity-85">
                  {data.league.logo && <img src={data.league.logo} alt="" className="h-4 w-4 rounded bg-white/90 p-0.5 object-contain" />}
                  <span className="truncate">
                    {data.league.name} · {data.league.season}
                  </span>
                </p>
                {club?.estadio_nome && (
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] opacity-75">
                    <Landmark className="h-3 w-3" /> {club.estadio_nome}
                  </p>
                )}
              </div>
            </div>

            {/* Resumo da campanha */}
            <div className="mt-4 grid grid-cols-6 gap-1 rounded-2xl bg-black/25 px-2 py-3 backdrop-blur" data-testid="club-summary">
              <Stat label={t("clube.pts")} value={data.summary.points} strong />
              <Stat label={t("clube.j")} value={data.summary.played} />
              <Stat label={t("clube.v")} value={data.summary.win} />
              <Stat label={t("clube.e")} value={data.summary.draw} />
              <Stat label={t("clube.d")} value={data.summary.lose} />
              <Stat label={t("clube.sg")} value={data.summary.goalsDiff > 0 ? `+${data.summary.goalsDiff}` : data.summary.goalsDiff} />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5" aria-label={t("clube.form")}>
                {data.summary.form.map((f, i) => (
                  <span key={i} className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black" style={{ background: RES_STYLE[f].bg, color: RES_STYLE[f].fg }}>
                    {f}
                  </span>
                ))}
              </div>
              <span className="text-xs font-bold opacity-90">
                {t("clube.aprov")} {data.summary.pct}%
              </span>
            </div>
          </>
        )}
      </header>

      {/* Abas */}
      <nav className="sticky top-0 z-20 border-b border-white/10 bg-black/90 backdrop-blur" aria-label="clube">
        <div className="mx-auto flex max-w-xl gap-1 overflow-x-auto px-3 py-2">
          {([["jogos", t("clube.tab_games")], ["chances", t("clube.tab_chances")], ["elenco", t("clube.tab_squad")]] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              aria-pressed={tab === k}
              className={`h-11 shrink-0 rounded-full px-5 text-[12px] font-black uppercase tracking-wide ${tab === k ? "bg-white text-black" : "bg-white/10 text-white/70"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* Chances (carrega só quando a aba é aberta) */}
      {tab === "chances" && (
        <main className="mx-auto max-w-xl px-3 pt-4" data-testid="tab-chances">
          <ClubChances teamId={teamId} leagueId={leagueId} season={season} accent={primary === "#1a1a1a" ? "#ff6200" : isLightColor(primary) ? secondary : primary} />
        </main>
      )}

      {/* Elenco (carrega só quando a aba é aberta) */}
      {tab === "elenco" && (
        <main className="mx-auto max-w-xl px-3 pt-4" data-testid="tab-elenco">
          <ClubSquad teamId={teamId} accent={primary === "#1a1a1a" ? "#ff6200" : isLightColor(primary) ? secondary : primary} />
        </main>
      )}

      {/* Jogos */}
      <main className="mx-auto max-w-xl px-3 pt-4" hidden={tab !== "jogos"}>
        <div className="mb-3 flex items-center gap-2">
          <CalendarDays className="h-4 w-4" style={{ color: primary === "#1a1a1a" ? "#ff6200" : primary }} />
          <h2 className="flex-1 text-[11px] font-black uppercase tracking-widest text-white/80">{t("clube.games")}</h2>
          <div className="flex gap-1">
            {(["all", "done", "next"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`h-9 rounded-full px-3 text-[11px] font-bold ${filter === k ? "bg-white text-black" : "bg-white/10 text-white/70"}`}
              >
                {t(`clube.f_${k}`)}
              </button>
            ))}
          </div>
        </div>

        {!data && !error && (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-white/[0.05]" />
            ))}
          </div>
        )}

        {data && (
          <ul className="space-y-1.5">
            {shown.map((g, idx) => {
              const isNext = nextGame?.id === g.id;
              const showHead = filter === "all" && upcoming.length > 0 && played.length > 0 && (idx === 0 || (idx === upcoming.length && DONE.has(g.st)));
              const headTitle = idx === 0 ? t("clube.upcoming") : t("clube.played");
              const live = LIVE.has(g.st);
              const brk = BREAK.has(g.st);
              const res = resultFor(g, teamId);
              const homeGame = g.h === teamId;
              const hasScore = g.gh != null && g.ga != null;
              return (
                <Fragment key={g.id}>
                {showHead && (
                  <li className="px-1 pb-0.5 pt-2 text-[11px] font-black uppercase tracking-widest text-white/70" data-testid="games-head">
                    {headTitle}
                  </li>
                )}
                <li
                  ref={isNext ? nextRef : undefined}
                  data-testid={isNext ? "game-next" : "game-row"}
                  className="flex items-center gap-2 rounded-xl border px-2 py-2"
                  style={{
                    borderColor: isNext ? primary : "rgba(255,255,255,0.08)",
                    background: isNext ? `${primary}22` : "rgba(255,255,255,0.03)",
                    minHeight: 56,
                  }}
                >
                  <div className="flex w-12 shrink-0 flex-col items-center leading-tight">
                    <span className="text-[10px] font-black text-white/50">{roundLabel(g.r)}</span>
                    <span className="text-[10px] text-white/40">{dateFmt(g.date)}</span>
                  </div>

                  <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
                    <span className={`line-clamp-2 break-words text-right text-[11px] leading-tight ${g.h === teamId ? "font-black text-white" : "text-white/75"}`}>{g.hn}</span>
                    <ClubLogo src={g.hl || undefined} alt={g.hn} clubName={g.hn} size="xs" className="h-5 w-5 shrink-0" />
                  </div>

                  <div className="flex w-[58px] shrink-0 flex-col items-center leading-none">
                    {live || brk ? (
                      <>
                        <span className="text-[9px] font-bold tabular-nums text-red-500 animate-pulse" data-testid="game-minute">
                          {brk ? t("competitions.halftime") : minuteLabel(g, now)}
                        </span>
                        <span className="mt-0.5 rounded bg-red-500/15 px-1.5 py-0.5 text-[13px] font-black tabular-nums text-red-500 animate-pulse">
                          {g.gh ?? 0} - {g.ga ?? 0}
                        </span>
                      </>
                    ) : hasScore && DONE.has(g.st) ? (
                      <span className="rounded bg-black px-1.5 py-0.5 text-[13px] font-black tabular-nums text-white" data-testid="game-score">
                        {g.gh} - {g.ga}
                      </span>
                    ) : (
                      <span className="text-[11px] font-mono text-white/45">{timeFmt(g.date)}</span>
                    )}
                    <span className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-white" data-testid="game-venue">{homeGame ? t("clube.home") : t("clube.away")}</span>
                  </div>

                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                    <ClubLogo src={g.al || undefined} alt={g.an} clubName={g.an} size="xs" className="h-5 w-5 shrink-0" />
                    <span className={`line-clamp-2 break-words text-[11px] leading-tight ${g.a === teamId ? "font-black text-white" : "text-white/75"}`}>{g.an}</span>
                  </div>

                  <div className="flex w-6 shrink-0 justify-center">
                    {res ? (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black" style={{ background: RES_STYLE[res].bg, color: RES_STYLE[res].fg }} data-testid="game-result">
                        {res}
                      </span>
                    ) : live || brk ? (
                      <Radio className="h-3.5 w-3.5 animate-pulse text-red-500" />
                    ) : null}
                  </div>
                </li>
                </Fragment>
              );
            })}
            {!shown.length && <li className="py-8 text-center text-sm text-white/40">{t("clube.no_games")}</li>}
          </ul>
        )}
      </main>
    </div>
  );
};

export default Clube;
