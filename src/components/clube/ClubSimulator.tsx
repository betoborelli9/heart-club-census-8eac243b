/**
 * [CAMINHO]: src/components/clube/ClubSimulator.tsx
 * [MÓDULO]: SIMULADOR "E se...?" (aba da página do clube): o torcedor coloca placares na próxima rodada (ou em qualquer jogo
 * que falta, inclusive dos adversários) e vê, na hora, a tabela e a posição final provável do clube mudarem.
 * Os números do modelo vêm de league-prognosis; a conta do "E se" roda no celular (src/lib/whatif.ts) e NADA é gravado
 * no servidor — os placares ficam só neste aparelho. É uma simulação, nunca promessa nem aposta.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { FlaskConical, Info, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslationApp } from "@/hooks/useTranslationApp";
import { ClubLogo } from "@/components/ClubLogo";
import { pctText, zoneColor, zoneLabel } from "@/components/clube/ClubChances";
import { roundNumber, runWhatIf, type Pick, type WGame, type WTeam } from "@/lib/whatif";
import type { TieRule } from "../../../supabase/functions/_shared/prognosis";

type TeamP = WTeam & { name: string; logo: string | null; remaining: number; dist: number[] };
type RemGame = WGame & { r: string | null; date: string; hn: string; an: string; hl: string | null; al: string | null; live: { gh: number; ga: number; el: number | null; st: string } | null };
type Zone = { label: string; positions: number[] };
type GroupP = { group: string | null; unsupported?: string; teams?: TeamP[]; zones?: Zone[]; remaining?: RemGame[]; meta?: { rule?: string } };
type Payload = { supported: boolean; groups: GroupP[] };

const CACHE = new Map<string, { at: number; data: Payload }>();
const CACHE_TTL = 2 * 60 * 1000;
/** Só para testes. */
export const clearSimulatorCache = () => CACHE.clear();

type Mode = "round" | "mine" | "all";
type Raw = Record<number, { h: string; a: string }>;

const storageKey = (leagueId: number, season: number, teamId: number) => `hc-whatif:${leagueId}:${season}:${teamId}`;

export default function ClubSimulator({ teamId, leagueId, season, accent = "#ff6200" }: { teamId: number; leagueId: number; season: number; accent?: string }) {
  const { t, language } = useTranslationApp();
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState(false);
  const [mode, setMode] = useState<Mode>("round");
  const [view, setView] = useState<"now" | "final">("now");
  const [raw, setRaw] = useState<Raw>({});
  const [applied, setApplied] = useState<Record<number, Pick>>({});
  const tableRef = useRef<HTMLElement | null>(null);

  // Dados do campeonato (mesmos da aba Chances, guardados por 2 min no aparelho)
  useEffect(() => {
    let alive = true;
    setError(false);
    const key = `${leagueId}:${season}`;
    const hit = CACHE.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL) {
      setData(hit.data);
      return;
    }
    setData(null);
    (async () => {
      const { data: res, error: err } = await supabase.functions.invoke("league-prognosis", { body: { leagueId, season } });
      if (!alive) return;
      if (err || !res || (res as any).error) return setError(true);
      CACHE.set(key, { at: Date.now(), data: res as Payload });
      setData(res as Payload);
    })();
    return () => {
      alive = false;
    };
  }, [leagueId, season]);

  // Placares do torcedor: ficam só neste aparelho
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey(leagueId, season, teamId));
      setRaw(saved ? (JSON.parse(saved) as Raw) : {});
    } catch {
      setRaw({});
    }
  }, [leagueId, season, teamId]);
  const saveRaw = (next: Raw) => {
    setRaw(next);
    try {
      localStorage.setItem(storageKey(leagueId, season, teamId), JSON.stringify(next));
    } catch {
      /* sem armazenamento: segue funcionando só na tela */
    }
  };

  const grp = useMemo(() => data?.groups?.find((g) => !g.unsupported && g.teams?.some((x) => x.id === teamId)) ?? null, [data, teamId]);
  const me = grp?.teams?.find((x) => x.id === teamId) ?? null;
  const total = grp?.teams?.length ?? 0;
  const games = useMemo(() => [...(grp?.remaining ?? [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), [grp]);

  // Placares válidos (dois números inteiros)
  const parsed = useMemo(() => {
    const out: Record<number, Pick> = {};
    for (const g of games) {
      const r = raw[g.id];
      if (!r || r.h === "" || r.a === "" || !/^\d{1,2}$/.test(r.h) || !/^\d{1,2}$/.test(r.a)) continue;
      out[g.id] = { h: Number(r.h), a: Number(r.a) };
    }
    return out;
  }, [raw, games]);
  const parsedKey = JSON.stringify(parsed);
  useEffect(() => {
    const id = setTimeout(() => setApplied(parsed), 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedKey]);

  const result = useMemo(() => {
    if (!grp?.teams) return null;
    const rule = (grp.meta?.rule === "br" || grp.meta?.rule === "gd" ? grp.meta.rule : "official") as TieRule;
    return runWhatIf(grp.teams, games, applied, rule, 3000);
  }, [grp, games, applied]);

  // Quais jogos mostrar
  const nextRound = useMemo(() => {
    const rounds = [...new Set(games.map((g) => roundNumber(g.r)).filter((n): n is number => n != null))].sort((a, b) => a - b);
    const notStarted = (n: number) => games.some((g) => roundNumber(g.r) === n && !g.live && new Date(g.date).getTime() > Date.now() - 3 * 3600 * 1000);
    return rounds.find(notStarted) ?? rounds[0] ?? null;
  }, [games]);
  const shownGames = useMemo(() => {
    if (mode === "mine") return games.filter((g) => g.h === teamId || g.a === teamId);
    if (mode === "all") return games;
    if (nextRound == null) return games.slice(0, 10);
    return games.filter((g) => roundNumber(g.r) === nextRound);
  }, [mode, games, teamId, nextRound]);
  // meu jogo primeiro dentro da lista
  const orderedGames = useMemo(() => {
    if (mode === "all") return shownGames;
    return [...shownGames].sort((a, b) => Number(b.h === teamId || b.a === teamId) - Number(a.h === teamId || a.a === teamId));
  }, [shownGames, mode, teamId]);

  if (error) return <p className="py-10 text-center text-sm text-white/50">{t("chances.error")}</p>;
  if (!data)
    return (
      <div className="space-y-3" data-testid="sim-loading">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/[0.05]" />
        ))}
      </div>
    );
  if (!data.supported || !grp || !me || !result)
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-center" data-testid="sim-unsupported">
        <Info className="mx-auto mb-2 h-6 w-6 text-white/40" />
        <p className="text-sm text-white/70">{t("sim.unsupported")}</p>
      </div>
    );

  const zones = (grp.zones ?? []).map((z) => ({ ...z, name: zoneLabel(leagueId, z, total, language), color: zoneColor(`${z.label} ${zoneLabel(leagueId, z, total, language)}`) }));
  const colorAt = (pos: number) => zones.find((z) => z.positions.includes(pos))?.color ?? null;
  const pickedCount = Object.keys(applied).length;
  const distMe = result.dist.get(teamId) ?? me.dist;
  const modeOf = (d: number[]) => d.indexOf(Math.max(...d)) + 1;
  const likely = modeOf(distMe);
  const likelyBase = modeOf(me.dist);
  const myNowPos = result.table.find((r) => r.id === teamId)?.pos ?? me.position;

  // Linhas de chances (mesma lógica do resumo da aba Chances), com a diferença para o cenário sem palpites
  const topZ = zones.filter((z) => z.positions[z.positions.length - 1] !== total).sort((a, b) => a.positions[0] - b.positions[0]);
  const bottomZ = zones.find((z) => z.positions[z.positions.length - 1] === total);
  const covered = new Set(zones.flatMap((z) => z.positions));
  const neutralPos = Array.from({ length: total }, (_, i) => i + 1).filter((p) => !covered.has(p));
  const sumUp = (d: number[], ps: number[]) => ps.reduce((a, p) => a + (d[p - 1] ?? 0), 0);
  const cumUp = (d: number[], upTo: number) => d.slice(0, upTo).reduce((a, b) => a + b, 0);
  const isRelegation = (z: { label: string; name: string }) => /relegation|rebaix|descenso/i.test(`${z.label} ${z.name}`);
  type Line = { key: string; color: string; title: string; now: number; base: number };
  const lines: Line[] = [
    ...topZ.map((z, i): Line => {
      const last = z.positions[z.positions.length - 1];
      return i === 0
        ? { key: z.label, color: z.color, title: t("chances.sum_zone", { zone: z.name }), now: sumUp(distMe, z.positions), base: sumUp(me.dist, z.positions) }
        : { key: z.label, color: z.color, title: t("chances.sum_atleast", { zone: z.name }), now: cumUp(distMe, last), base: cumUp(me.dist, last) };
    }),
    ...(neutralPos.length ? [{ key: "__neutral", color: "#a1a1aa", title: t("chances.sum_neutral"), now: sumUp(distMe, neutralPos), base: sumUp(me.dist, neutralPos) } as Line] : []),
    ...(bottomZ
      ? [{ key: bottomZ.label, color: bottomZ.color, title: isRelegation(bottomZ) ? t("chances.sum_relegation") : t("chances.sum_zone", { zone: bottomZ.name }), now: sumUp(distMe, bottomZ.positions), base: sumUp(me.dist, bottomZ.positions) } as Line]
      : []),
  ];

  // Tabela mostrada: "se fosse hoje" com os placares, ou "final provável"
  const byId = new Map((grp.teams ?? []).map((x) => [x.id, x]));
  const meanPos = (id: number) => (result.dist.get(id) ?? []).reduce((acc, p, i) => acc + p * (i + 1), 0);
  const finalOrder = [...(grp.teams ?? [])].sort((a, b) => meanPos(a.id) - meanPos(b.id) || (result.expPoints.get(b.id) ?? 0) - (result.expPoints.get(a.id) ?? 0));
  const rows =
    view === "now"
      ? result.table.map((r) => ({ pos: r.pos, id: r.id, delta: r.delta, big: r.points, sub: `${t("sim.j")} ${r.played} · ${t("sim.sg")} ${r.gd > 0 ? `+${r.gd}` : r.gd}` }))
      : finalOrder.map((tm, i) => ({ pos: i + 1, id: tm.id, delta: tm.position - (i + 1), big: Math.round(result.expPoints.get(tm.id) ?? 0), sub: `${pctText(result.dist.get(tm.id)?.[i] ?? 0)} ${t("sim.here")}` }));

  const setScore = (id: number, side: "h" | "a", v: string) => {
    const clean = v.replace(/\D/g, "").slice(0, 2);
    const cur = raw[id] ?? { h: "", a: "" };
    const next = { ...raw, [id]: { ...cur, [side]: clean } };
    if (next[id].h === "" && next[id].a === "") delete next[id];
    saveRaw(next);
  };
  const dateFmt = (iso: string) => new Date(iso).toLocaleDateString(language, { day: "2-digit", month: "short" }).replace(".", "");
  const roundOf = (g: RemGame) => roundNumber(g.r);

  return (
    <div className="space-y-4" data-testid="simulator">
      {/* Faixa fixa: resultado em tempo real enquanto o torcedor preenche */}
      <div className="sticky top-[61px] z-10 -mx-3 border-b border-white/10 bg-black/90 px-3 py-2 backdrop-blur" data-testid="sim-bar">
        <div className="flex items-center gap-3">
          <ClubLogo src={me.logo || undefined} alt={me.name} clubName={me.name} size="xs" className="h-8 w-8 shrink-0" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[13px] font-black" data-testid="sim-likely">
              {t("sim.bar_final", { pos: likely })}
              {pickedCount > 0 && likely !== likelyBase && (
                <span className="ml-1.5 text-[11px] font-black" style={{ color: likely < likelyBase ? "#22c55e" : "#ef4444" }}>
                  ({t("sim.before", { pos: likelyBase })})
                </span>
              )}
            </p>
            <p className="truncate text-[11px] text-white/65" data-testid="sim-count">
              {pickedCount > 0 ? t("sim.count", { n: pickedCount }) : t("sim.none")} · {t("sim.bar_now", { pos: myNowPos })}
            </p>
          </div>
          <button
            onClick={() => {
              saveRaw({});
              setApplied({});
            }}
            disabled={pickedCount === 0 && Object.keys(raw).length === 0}
            className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-4 text-[11px] font-bold disabled:opacity-40"
            data-testid="sim-clear"
          >
            <RotateCcw className="h-4 w-4" /> {t("sim.clear")}
          </button>
        </div>
      </div>

      <div className="flex gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-[12px] text-white/75">
        <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" style={{ color: accent }} />
        <span>{t("sim.intro")}</span>
      </div>

      {/* O que mostrar */}
      <div className="flex gap-1.5 overflow-x-auto" role="tablist" aria-label={t("sim.title")}>
        {([["round", t("sim.mode_round")], ["mine", t("sim.mode_mine")], ["all", t("sim.mode_all")]] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setMode(k)}
            aria-pressed={mode === k}
            className={`h-11 shrink-0 rounded-full px-4 text-[12px] font-black ${mode === k ? "bg-white text-black" : "bg-white/10 text-white/80"}`}
            data-testid={`sim-mode-${k}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Jogos */}
      <section data-testid="sim-games">
        {orderedGames.length === 0 && <p className="py-6 text-center text-sm text-white/50">{t("sim.no_games")}</p>}
        <ul className="space-y-1.5">
          {orderedGames.map((g, idx) => {
            const mine = g.h === teamId || g.a === teamId;
            const r = raw[g.id] ?? { h: "", a: "" };
            const filled = !!applied[g.id];
            const prev = orderedGames[idx - 1];
            const head = mode === "all" && roundOf(g) != null && (idx === 0 || roundOf(prev) !== roundOf(g));
            return (
              <li key={g.id} className="list-none">
                {head && <p className="px-1 pb-1 pt-3 text-[11px] font-black uppercase tracking-widest text-white/70">{t("sim.round", { n: roundOf(g) })}</p>}
                <div
                  className="rounded-xl border px-2 py-2"
                  style={{ borderColor: filled ? accent : mine ? `${accent}88` : "rgba(255,255,255,0.08)", background: filled ? `${accent}18` : "rgba(255,255,255,0.03)" }}
                  data-testid="sim-game"
                  data-mine={mine ? "1" : "0"}
                >
                  <div className="mb-1 flex items-center justify-between text-[10px] font-semibold text-white/65">
                    <span>{dateFmt(g.date)}{mine ? ` · ${t("sim.my_game")}` : ""}</span>
                    {g.live && <span className="font-black text-red-500">{t("sim.live")} {g.live.gh}-{g.live.ga}</span>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
                      <span className={`line-clamp-2 break-words text-right text-[12px] leading-tight ${g.h === teamId ? "font-black" : "text-white/85"}`}>{g.hn}</span>
                      <ClubLogo src={g.hl || undefined} alt={g.hn} clubName={g.hn} size="xs" className="h-6 w-6 shrink-0" />
                    </div>
                    <input
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={2}
                      value={r.h}
                      onChange={(e) => setScore(g.id, "h", e.target.value)}
                      aria-label={`${g.hn}`}
                      data-testid="sim-in-h"
                      className="h-11 w-11 shrink-0 rounded-lg border border-white/20 bg-black text-center text-lg font-black tabular-nums text-white focus:border-white focus:outline-none"
                    />
                    <span className="text-sm font-black text-white/60">×</span>
                    <input
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={2}
                      value={r.a}
                      onChange={(e) => setScore(g.id, "a", e.target.value)}
                      aria-label={`${g.an}`}
                      data-testid="sim-in-a"
                      className="h-11 w-11 shrink-0 rounded-lg border border-white/20 bg-black text-center text-lg font-black tabular-nums text-white focus:border-white focus:outline-none"
                    />
                    <div className="flex min-w-0 flex-1 items-center gap-1.5">
                      <ClubLogo src={g.al || undefined} alt={g.an} clubName={g.an} size="xs" className="h-6 w-6 shrink-0" />
                      <span className={`line-clamp-2 break-words text-[12px] leading-tight ${g.a === teamId ? "font-black" : "text-white/85"}`}>{g.an}</span>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Chances com os placares */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4" data-testid="sim-summary">
        <h3 className="mb-3 text-[12px] font-black uppercase tracking-wide">{t("sim.result_title", { club: me.name })}</h3>
        <ul className="space-y-2.5">
          {lines.map((l) => {
            const d = Math.round((l.now - l.base) * 100);
            return (
              <li key={l.key} className="flex items-center gap-3" data-testid="sim-line">
                <span className="w-[4.5rem] shrink-0 text-right text-2xl font-black tabular-nums leading-none" style={{ color: l.color }}>{pctText(l.now)}</span>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block text-[13px] font-bold">{l.title}</span>
                  {pickedCount > 0 && d !== 0 && (
                    <span className="block text-[11px] font-bold" style={{ color: d > 0 ? "#22c55e" : "#ef4444" }} data-testid="sim-delta">
                      {d > 0 ? "▲ +" : "▼ "}{d} {t("sim.pp")}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Tabela */}
      <section ref={tableRef} data-testid="sim-table">
        <div className="mb-2 flex items-center gap-1.5">
          {([["now", t("sim.view_now")], ["final", t("sim.view_final")]] as const).map(([k, label]) => (
            <button key={k} onClick={() => setView(k)} aria-pressed={view === k} className={`h-10 rounded-full px-4 text-[11px] font-black ${view === k ? "bg-white text-black" : "bg-white/10 text-white/80"}`} data-testid={`sim-view-${k}`}>
              {label}
            </button>
          ))}
        </div>
        <p className="mb-2 text-[11px] text-white/60">{view === "now" ? t("sim.view_now_sub") : t("sim.view_final_sub")}</p>
        <ul className="space-y-1">
          {rows.map((r) => {
            const tm = byId.get(r.id);
            if (!tm) return null;
            const isMe = r.id === teamId;
            return (
              <li key={r.id} data-testid="sim-row" className="flex min-h-[48px] items-center gap-2 rounded-xl border py-1.5 pl-0 pr-2" style={{ borderColor: isMe ? accent : "rgba(255,255,255,0.08)", background: isMe ? `${accent}22` : "rgba(255,255,255,0.03)" }}>
                <span className="h-8 w-1 shrink-0 rounded-r" style={{ background: colorAt(r.pos) ?? "transparent" }} />
                <span className="w-6 text-center text-[12px] font-black text-white/80">{r.pos}</span>
                <span className="w-7 text-center text-[10px] font-black" style={{ color: r.delta > 0 ? "#22c55e" : r.delta < 0 ? "#ef4444" : "rgba(255,255,255,0.35)" }} data-testid="sim-delta-pos">
                  {r.delta > 0 ? `▲${r.delta}` : r.delta < 0 ? `▼${-r.delta}` : "–"}
                </span>
                <ClubLogo src={tm.logo || undefined} alt={tm.name} clubName={tm.name} size="xs" className="h-5 w-5 shrink-0" />
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-[12px] font-bold">{tm.name}</span>
                  <span className="block truncate text-[10px] text-white/60">{r.sub}</span>
                </span>
                <span className="w-9 shrink-0 text-right text-[14px] font-black tabular-nums">{r.big}</span>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-[10px] text-white/50">{t("sim.legend")}</p>
      </section>
    </div>
  );
}
