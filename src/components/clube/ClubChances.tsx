/**
 * [CAMINHO]: src/components/clube/ClubChances.tsx
 * [MÓDULO]: CHANCES do clube (aba da página do clube): probabilidade de cada posição final, de cada zona do campeonato
 * (título/1º, acesso, vagas continentais, rebaixamento — as zonas vêm da própria tabela oficial), pontos projetados,
 * pontos de corte, aproveitamento necessário, dificuldade e chance de V/E/D nos jogos que faltam.
 * Os números vêm prontos de league-prognosis (simulação no servidor, compartilhada); o celular só desenha.
 * Estimativa estatística — nunca promete resultado. Sem linguagem de aposta.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HelpCircle, Info, Target, TrendingUp } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useTranslationApp } from "@/hooks/useTranslationApp";
import { getLeagueRules } from "@/data/leagueRules";
import { ClubLogo } from "@/components/ClubLogo";
import { fmtExpPts, orderByExpected } from "@/lib/projected-order";

type TeamP = {
  id: number; name: string; logo: string | null; position: number; points: number; played: number; remaining: number;
  dist: number[]; expPoints: number; p10: number; p90: number; title: number; zoneProb: Record<string, number>; difficulty: number;
  win?: number; gf?: number; ga?: number;
  strength?: number; homePpg?: number | null; awayPpg?: number | null; homeLeft?: number; awayLeft?: number;
};
type RemGame = { id: number; date: string; h: number; a: number; hn: string; an: string; hl: string | null; al: string | null; pH: number; pD: number; pA: number; sh?: number; sa?: number; live: { gh: number; ga: number; el: number | null; st: string } | null };
type Zone = { label: string; positions: number[] };
type GroupP = { group: string | null; unsupported?: string; teams?: TeamP[]; zones?: Zone[]; cutMedian?: number[]; remaining?: RemGame[]; meta?: { sims: number; finishedGames: number; remainingGames: number; minPlayed: number; rule?: string } };
type Payload = { supported: boolean; reason?: string | null; league?: { id: number; season: number; name?: string }; groups: GroupP[] };

export const pctText = (p: number) => {
  const v = p * 100;
  if (v > 0 && v < 0.5) return "<1%";
  if (v > 99.5 && v < 100) return ">99%";
  return `${Math.round(v)}%`;
};

const DICT_PT: [RegExp, string][] = [
  [/Promotion Play-offs?/i, "Playoff de acesso"],
  [/Relegation Play-offs?/i, "Playoff de rebaixamento"],
  [/^Relegation.*$/i, "Rebaixamento"],
  [/^Promotion - /i, ""],
  [/^Promotion$/i, "Acesso"],
  [/League phase/gi, "fase de liga"],
  [/Group Stage/gi, "fase de grupos"],
  [/Qualification/gi, "classificatória"],
  [/Play Offs?/gi, "playoffs"],
  [/1\/16-finals/gi, "16-avos"],
  [/1\/8-finals/gi, "oitavas"],
  [/Round of 16/gi, "oitavas"],
];
const DICT_ES: [RegExp, string][] = [
  [/Promotion Play-offs?/i, "Playoff de ascenso"],
  [/Relegation Play-offs?/i, "Playoff de descenso"],
  [/^Relegation.*$/i, "Descenso"],
  [/^Promotion - /i, ""],
  [/^Promotion$/i, "Ascenso"],
  [/League phase/gi, "fase liga"],
  [/Group Stage/gi, "fase de grupos"],
  [/Qualification/gi, "clasificatoria"],
];

/** Nome da zona: preferimos o texto em português das regras que o app já tem; senão traduzimos a descrição da tabela. */
export function zoneLabel(leagueId: number | undefined, zone: Zone, total: number, lang: string): string {
  const rules = getLeagueRules(leagueId);
  if (rules) {
    const z = rules.zones.find((x) => x.match(zone.positions[0], total) && x.match(zone.positions[zone.positions.length - 1], total) && !x.neutral);
    if (z) return z.legend;
  }
  let s = zone.label.trim();
  const dict = lang === "pt" ? DICT_PT : lang === "es" ? DICT_ES : [];
  for (const [re, to] of dict) s = s.replace(re, to);
  return s.replace(/\s{2,}/g, " ").replace(/^[\s-]+|[\s-]+$/g, "") || zone.label;
}

/**
 * Chance de cada faixa, no modo "OU MELHOR": as faixas de cima somam (quem pode subir direto está, por definição, também no G6).
 * A faixa de rebaixamento (a última) fica exata. Com a distribuição por posição a conta é exata; sem ela, somamos as faixas de cima.
 */
export function cumZoneProbs(zones: { label: string; positions: number[] }[], total: number, dist?: number[] | null, zoneProb?: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  const useDist = !!dist && dist.length >= total && dist.some((v) => v > 0);
  const sorted = [...zones].sort((a, b) => a.positions[0] - b.positions[0]);
  let acc = 0;
  for (const z of sorted) {
    const last = Math.max(...z.positions);
    const isBottom = last === total;
    const exact = useDist ? z.positions.reduce((a, p) => a + ((dist as number[])[p - 1] ?? 0), 0) : zoneProb?.[z.label] ?? 0;
    if (isBottom) {
      out[z.label] = exact;
    } else if (useDist) {
      out[z.label] = (dist as number[]).slice(0, last).reduce((a, b) => a + b, 0);
    } else {
      acc += exact;
      out[z.label] = acc;
    }
  }
  for (const k of Object.keys(out)) out[k] = Math.min(1, out[k]);
  return out;
}

/** Clube neutro: sem chance prática (< 2%) em qualquer objetivo — não vai subir, nem cair, nem brigar por vaga. */
export const NEUTRAL_BELOW = 0.02;
export function isNeutral(zoneProb: Record<string, number> | undefined, title = 0): boolean {
  if (title >= NEUTRAL_BELOW) return false;
  const vals = Object.values(zoneProb ?? {});
  return vals.every((v) => v < NEUTRAL_BELOW);
}

/** Sigla curta da zona para cabeçalho de coluna (ACESSO, PO, REB, UCL…). */
export function zoneShort(name: string): string {
  const n = name.toLowerCase();
  if (/rebaix|relegat|descenso/.test(n)) return "REB";
  if (/play-?off|playoff/.test(n)) return "PO";
  if (/champions/.test(n)) return "UCL";
  if (/libertadores/.test(n)) return "LIB";
  if (/europa/.test(n)) return "UEL";
  if (/conference/.test(n)) return "UECL";
  if (/sudamericana/.test(n)) return "SUL";
  if (/acesso|promotion|ascenso|promo/.test(n)) return "ACESSO";
  return name.slice(0, 4).toUpperCase();
}

export function zoneColor(label: string): string {
  if (/relegation|rebaixa|descenso/i.test(label)) return "#ef4444";
  if (/play-?off/i.test(label)) return "#f59e0b";
  if (/europa|conference|sudamericana|qualification|classificat/i.test(label)) return "#38bdf8";
  return "#22c55e";
}

/** Aproveitamento necessário nos jogos que faltam para chegar ao ponto de corte (null = sem jogos). */
export function amr(cut: number, points: number, remaining: number): { need: number; pct: number | null; done: boolean; impossible: boolean } {
  const need = Math.max(0, Math.ceil(cut) - points);
  if (remaining <= 0) return { need, pct: null, done: need === 0, impossible: need > 0 };
  const pct = Math.round((need / (3 * remaining)) * 100);
  return { need, pct, done: need === 0, impossible: need > 3 * remaining };
}

function Bar({ p, color }: { p: number; color: string }) {
  return (
    <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
      <div className="h-full rounded-full" style={{ width: `${Math.max(p > 0 ? 2 : 0, p * 100)}%`, background: color }} />
    </div>
  );
}

export default function ClubChances({ teamId, leagueId, season, accent = "#ff6200" }: { teamId: number; leagueId: number; season: number; accent?: string }) {
  const { t, language } = useTranslationApp();
  const navigate = useNavigate();
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState(false);
  const [howOpen, setHowOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    setData(null);
    setError(false);
    (async () => {
      const { data: res, error: err } = await supabase.functions.invoke("league-prognosis", { body: { leagueId, season } });
      if (!alive) return;
      if (err || !res || (res as any).error) return setError(true);
      setData(res as Payload);
    })();
    return () => {
      alive = false;
    };
  }, [leagueId, season]);

  const grp = useMemo(() => data?.groups?.find((g) => !g.unsupported && g.teams?.some((x) => x.id === teamId)) ?? null, [data, teamId]);
  const me = grp?.teams?.find((x) => x.id === teamId) ?? null;
  const total = grp?.teams?.length ?? 0;

  if (error) return <p className="py-10 text-center text-sm text-white/50">{t("chances.error")}</p>;
  if (!data)
    return (
      <div className="space-y-3" data-testid="chances-loading">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/[0.05]" />
        ))}
      </div>
    );
  if (!data.supported || !grp || !me)
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-center" data-testid="chances-unsupported">
        <Info className="mx-auto mb-2 h-6 w-6 text-white/40" />
        <p className="text-sm text-white/70">{t("chances.unsupported")}</p>
      </div>
    );

  const zones = (grp.zones ?? []).map((z) => ({ ...z, name: zoneLabel(leagueId, z, total, language), color: zoneColor(`${z.label} ${zoneLabel(leagueId, z, total, language)}`) }));
  const modePos = me.dist.indexOf(Math.max(...me.dist)) + 1;
  const cumMe = cumZoneProbs(zones, total, me.dist, me.zoneProb);
  const myLive = (grp.remaining ?? []).find((g) => g.live && (g.h === teamId || g.a === teamId));
  const liveDiff = myLive?.live ? (myLive.h === teamId ? myLive.live.gh - myLive.live.ga : myLive.live.ga - myLive.live.gh) : 0;
  const ptsNow = me.points + (myLive ? (liveDiff > 0 ? 3 : liveDiff === 0 ? 1 : 0) : 0);
  const remNow = me.remaining - (myLive ? 1 : 0);
  const myGames = (grp.remaining ?? []).filter((g) => g.h === teamId || g.a === teamId).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const few = (grp.meta?.minPlayed ?? 99) < 8;
  const pctFmt = (p: number) => pctText(p);
  const dateFmt = (iso: string) => new Date(iso).toLocaleDateString(language, { day: "2-digit", month: "short" }).replace(".", "");
  const diffLabel = (d: number) => (d >= 66 ? t("chances.hard") : d <= 33 ? t("chances.easy") : t("chances.medium"));
  const diffColor = (d: number) => (d >= 66 ? "#ef4444" : d <= 33 ? "#22c55e" : "#f59e0b");
  const strongLabel = (v: number) => (v >= 67 ? t("chances.s_strong") : v <= 33 ? t("chances.s_weak") : t("chances.s_mid"));
  const strongColor = (v: number) => (v >= 67 ? "#ef4444" : v <= 33 ? "#22c55e" : "#f59e0b");

  // Resumo em frases: subir direto · pelo menos play-off · zona neutra · cair (zonas vindas da tabela oficial)
  const topZ = zones.filter((z) => z.positions[z.positions.length - 1] !== total).sort((a, b) => a.positions[0] - b.positions[0]);
  const bottomZ = zones.find((z) => z.positions[z.positions.length - 1] === total);
  const covered = new Set(zones.flatMap((z) => z.positions));
  const neutralPos = Array.from({ length: total }, (_, i) => i + 1).filter((p) => !covered.has(p));
  const pNeutral = neutralPos.reduce((a, p) => a + (me.dist[p - 1] ?? 0), 0);
  const cum = (upTo: number) => me.dist.slice(0, upTo).reduce((a, b) => a + b, 0);
  const range = (a: number, b: number) => (a === b ? `${a}º` : `${a}º–${b}º`);
  const isRelegation = (z: { label: string; name: string }) => /relegation|rebaix|descenso/i.test(`${z.label} ${z.name}`);
  type Line = { key: string; color: string; p: number; title: string; sub: string; seg: number };
  const sumLines: Line[] = [
    ...topZ.map((z, i): Line => {
      const first = z.positions[0];
      const last = z.positions[z.positions.length - 1];
      return i === 0
        ? { key: z.label, color: z.color, p: me.zoneProb[z.label] ?? 0, title: t("chances.sum_zone", { zone: z.name }), sub: range(first, last), seg: me.zoneProb[z.label] ?? 0 }
        : { key: z.label, color: z.color, p: cum(last), title: t("chances.sum_atleast", { zone: z.name }), sub: t("chances.sum_upto", { pos: last }), seg: me.zoneProb[z.label] ?? 0 };
    }),
    ...(neutralPos.length
      ? [{ key: "__neutral", color: "#a1a1aa", p: pNeutral, title: t("chances.sum_neutral"), sub: `${range(neutralPos[0], neutralPos[neutralPos.length - 1])} · ${t("chances.sum_neutral_sub")}`, seg: pNeutral } as Line]
      : []),
    ...(bottomZ
      ? [{ key: bottomZ.label, color: bottomZ.color, p: me.zoneProb[bottomZ.label] ?? 0, title: isRelegation(bottomZ) ? t("chances.sum_relegation") : t("chances.sum_zone", { zone: bottomZ.name }), sub: range(bottomZ.positions[0], bottomZ.positions[bottomZ.positions.length - 1]), seg: me.zoneProb[bottomZ.label] ?? 0 } as Line]
      : []),
  ];

  // Pontos de corte: o que costuma ser preciso (mediana da simulação) para ser campeão, fechar cada faixa e fugir do rebaixamento
  type CutRow = { key: string; title: string; pts: number; need: ReturnType<typeof amr>; escape: boolean };
  const cutRows: CutRow[] = [];
  const pushCut = (key: string, title: string, cut: number | undefined, extra = 0, escape = false) => {
    if (cut == null) return;
    const pts = Math.ceil(cut) + extra;
    cutRows.push({ key, title, pts, need: amr(pts, ptsNow, remNow), escape });
  };
  pushCut("__champion", t("chances.cut_champion"), grp.cutMedian?.[0]);
  topZ.forEach((z) => {
    const last = z.positions[z.positions.length - 1];
    if (last > 1) pushCut(z.label, t("chances.cut_pos", { pos: last, zone: z.name }), grp.cutMedian?.[last - 1]);
  });
  if (bottomZ && bottomZ.positions[0] > 1) pushCut(bottomZ.label, t("chances.cut_escape"), grp.cutMedian?.[bottomZ.positions[0] - 2], 1, true);

  // Tabela provável no fim: ordem pelos pontos esperados; em cada posição, quem mais pode ficar ali
  type TableRow = { kind: "team"; pos: number; team: TeamP; color: string | null; also: { team: TeamP; p: number }[] } | { kind: "gap"; from: number; to: number };
  // posição média nas simulações (mais fiel que os pontos arredondados quando há empate técnico)
  const meanPos = (x: TeamP) => x.dist.reduce((acc, p, i) => acc + p * (i + 1), 0);
  const projectedOrder = orderByExpected(grp.teams ?? [], grp.meta?.rule, (x) => x.expPoints, meanPos);
  const shownPos = new Set<number>([1, ...covered]);
  const tableRows: TableRow[] = [];
  for (let p = 1; p <= total; p++) {
    if (shownPos.has(p)) {
      const team = projectedOrder[p - 1];
      if (!team) continue;
      const also = (grp.teams ?? [])
        .filter((x) => x.id !== team.id)
        .map((x) => ({ team: x, p: x.dist[p - 1] ?? 0 }))
        .filter((x) => x.p >= 0.05)
        .sort((a, b) => b.p - a.p)
        .slice(0, 2);
      tableRows.push({ kind: "team", pos: p, team, color: zones.find((z) => z.positions.includes(p))?.color ?? null, also });
    } else {
      const last = tableRows[tableRows.length - 1];
      if (last && last.kind === "gap") last.to = p;
      else tableRows.push({ kind: "gap", from: p, to: p });
    }
  }

  return (
    <div className="space-y-5" data-testid="chances">
      {few && (
        <div className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[12px] text-amber-200" data-testid="chances-few">
          <Info className="mt-0.5 h-4 w-4 shrink-0" /> {t("chances.few")}
        </div>
      )}

      {/* Resumo */}
      <section className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">{t("chances.projected")}</p>
          <p className="mt-1 text-2xl font-black tabular-nums">{Math.round(me.expPoints)}</p>
          <p className="text-[10px] text-white/40">{me.p10}–{me.p90} pts</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">{t("chances.likely_pos")}</p>
          <p className="mt-1 text-2xl font-black tabular-nums">{modePos}º</p>
          <p className="text-[10px] text-white/40">{t("chances.now")} {me.position}º</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">{t("chances.left")}</p>
          <p className="mt-1 text-2xl font-black tabular-nums" data-testid="left-count">{remNow}</p>
          <p className="text-[10px] text-white/40">{t("chances.games")}{myLive ? ` · ${t("chances.live_one")}` : ""}</p>
        </div>
      </section>

      {/* Pontos de corte */}
      {cutRows.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4" data-testid="chances-cuts">
          <h3 className="mb-1 text-[12px] font-black uppercase tracking-wide">{t("chances.cuts_title")}</h3>
          <p className="mb-3 text-[11px] text-white/55">{t("chances.cuts_sub")}</p>
          <ul className="divide-y divide-white/10">
            {cutRows.map((r) => (
              <li key={r.key} className="flex items-center gap-3 py-2.5" data-testid="cut-row">
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block text-[13px] font-bold">{r.title}</span>
                  <span className="block text-[11px] text-white/60">
                    {r.need.done
                      ? r.escape
                        ? t("chances.safe_now")
                        : t("chances.reached")
                      : r.need.impossible
                        ? `${t("chances.cut_missing", { n: r.need.need })} · ${t("chances.out_of_reach", { max: 3 * remNow })}`
                        : `${t("chances.cut_missing", { n: r.need.need })}${r.need.pct != null ? ` · ${t("chances.need", { n: r.need.pct })}` : ""}`}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="text-2xl font-black tabular-nums leading-none" style={{ color: accent }}>{r.pts}</span>
                  <span className="ml-1 text-[11px] font-bold text-white/60">{t("chances.pts")}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {isNeutral(me.zoneProb, me.title) && (
        <div className="flex gap-2 rounded-xl border border-white/15 bg-white/[0.05] p-3 text-[12px] text-white/70" data-testid="chances-neutral-note">
          <Info className="mt-0.5 h-4 w-4 shrink-0" /> {t("chances.neutral_note")}
        </div>
      )}

      {/* Resumo em frases */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4" data-testid="chances-summary">
        <h3 className="mb-3 text-[12px] font-black uppercase tracking-wide">{t("chances.sum_title", { club: me.name })}</h3>
        <div className="mb-3 flex h-3 overflow-hidden rounded-full bg-white/10" aria-hidden data-testid="sum-bar">
          {sumLines.map((l) => (
            <div key={l.key} style={{ width: `${l.seg * 100}%`, background: l.color }} />
          ))}
        </div>
        <ul className="space-y-2.5">
          {sumLines.map((l) => (
            <li key={l.key} className="flex items-center gap-3" data-testid="sum-line">
              <span className="w-[4.5rem] shrink-0 text-right text-2xl font-black tabular-nums leading-none" style={{ color: l.color }}>{pctFmt(l.p)}</span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block text-[13px] font-bold">{l.title}</span>
                <span className="block text-[11px] text-white/45">{l.sub}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Chances por objetivo */}
      <section data-testid="chances-zones">
        <h3 className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-white/70">
          <Target className="h-4 w-4" style={{ color: accent }} /> {t("chances.goals")}
        </h3>
        <ul className="space-y-2">
          <li className="rounded-xl border border-white/10 bg-white/[0.03] p-3" data-testid="zone-title">
            <div className="mb-1 flex items-center justify-between text-[13px] font-bold">
              <span>{t("chances.first")}</span>
              <span className="tabular-nums">{pctFmt(me.title)}</span>
            </div>
            <Bar p={me.title} color={accent} />
          </li>
          {zones.map((z) => {
            const p = cumMe[z.label] ?? 0;
            const isBottom = z.positions[z.positions.length - 1] === total;
            const orBetter = !isBottom && topZ.findIndex((x) => x.label === z.label) > 0;
            const last = z.positions[z.positions.length - 1];
            return (
              <li key={z.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-3" data-testid="zone-row">
                <div className="mb-1 flex items-center justify-between gap-2 text-[13px] font-bold">
                  <span className="min-w-0 truncate">
                    {z.name}{orBetter ? ` ${t("chances.or_better")}` : ""} <span className="text-[10px] font-normal text-white/60" data-testid="zone-range">({orBetter ? `1º–${last}º` : `${z.positions[0]}º${z.positions.length > 1 ? `–${last}º` : ""}`})</span>
                  </span>
                  <span className="tabular-nums" style={{ color: z.color }}>{pctFmt(p)}</span>
                </div>
                <Bar p={p} color={z.color} />
              </li>
            );
          })}
        </ul>
      </section>

      {/* Onde vai terminar */}
      <section data-testid="chances-dist">
        <h3 className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-white/70">
          <TrendingUp className="h-4 w-4" style={{ color: accent }} /> {t("chances.where")}
        </h3>
        <div className="flex h-24 items-end gap-[2px] rounded-xl border border-white/10 bg-white/[0.03] px-2 pb-2 pt-3">
          {me.dist.map((p, i) => {
            const z = zones.find((x) => x.positions.includes(i + 1));
            const maxP = Math.max(...me.dist, 0.01);
            return (
              <div key={i} className="flex h-full flex-1 flex-col items-center justify-end" title={`${i + 1}º: ${pctFmt(p)}`}>
                <div className="w-full rounded-t" style={{ height: `${(p / maxP) * 100}%`, minHeight: p > 0 ? 2 : 0, background: z?.color ?? "rgba(255,255,255,0.35)", opacity: i + 1 === me.position ? 1 : 0.8 }} />
              </div>
            );
          })}
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-white/40">
          <span>1º</span>
          <span>{total}º</span>
        </div>
      </section>

      {/* Tabela provável no fim do campeonato */}
      {tableRows.length > 0 && (
        <section data-testid="chances-table">
          <h3 className="mb-1 text-[11px] font-black uppercase tracking-widest text-white/70">{t("chances.table_title")}</h3>
          <p className="mb-2 text-[11px] text-white/55">{t("chances.table_sub")}</p>
          <ul className="space-y-1">
            {tableRows.map((r) =>
              r.kind === "gap" ? (
                <li key={`gap-${r.from}`} className="rounded-xl border border-dashed border-white/10 px-3 py-2 text-center text-[11px] font-semibold text-white/50" data-testid="table-gap">
                  {t("chances.table_neutral", { a: r.from, b: r.to })}
                </li>
              ) : (
                <li key={r.pos} data-testid="table-row">
                  <button
                    onClick={() => navigate(`/clube/${r.team.id}?liga=${leagueId}&temp=${season}&aba=chances`)}
                    className="flex min-h-[52px] w-full items-center gap-2 rounded-xl border py-2 pl-0 pr-2 text-left"
                    style={{ borderColor: r.team.id === teamId ? accent : "rgba(255,255,255,0.08)", background: r.team.id === teamId ? `${accent}22` : "rgba(255,255,255,0.03)" }}
                  >
                    <span className="ml-0 h-9 w-1 shrink-0 rounded-r" style={{ background: r.color ?? "transparent" }} />
                    <span className="w-6 text-center text-[11px] font-black text-white/70">{r.pos}</span>
                    <ClubLogo src={r.team.logo || undefined} alt={r.team.name} clubName={r.team.name} size="xs" className="h-5 w-5 shrink-0" />
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block truncate text-[12px] font-bold">{r.team.name}</span>
                      {r.also.length > 0 && (
                        <span className="block truncate text-[10px] text-white/55" data-testid="table-also">
                          {t("chances.table_also")} {r.also.map((a) => `${a.team.name} ${pctFmt(a.p)}`).join(" · ")}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-right leading-tight">
                      <span className="block text-[13px] font-black tabular-nums" data-testid="table-pts">{fmtExpPts(r.team.expPoints, language)}</span>
                      <span className="block text-[9px] font-bold text-white/55">{pctFmt(r.team.dist[r.pos - 1] ?? 0)}</span>
                    </span>
                  </button>
                </li>
              ),
            )}
          </ul>
          <p className="mt-1 text-[10px] text-white/60">{t("chances.table_legend")}</p>
          <p className="mt-0.5 text-[10px] text-white/60" data-testid="table-tiebreak">{t(grp.meta?.rule === "br" ? "chances.tiebreak_br" : grp.meta?.rule === "gd" ? "chances.tiebreak_gd" : "chances.tiebreak_official")}</p>
        </section>
      )}

      {/* Jogos que faltam */}
      {myGames.length > 0 && (
        <section data-testid="chances-games">
          <h3 className="mb-1 text-[11px] font-black uppercase tracking-widest text-white/70">{t("chances.next_games")}</h3>
          <p className="mb-2 text-[11px] text-white/55" data-testid="chances-homeaway">
            {t("chances.ha_left", { h: me.homeLeft ?? myGames.filter((g) => g.h === teamId).length, a: me.awayLeft ?? myGames.filter((g) => g.a === teamId).length })}
            {me.homePpg != null && me.awayPpg != null ? ` · ${t("chances.ha_record", { h: me.homePpg.toFixed(2), a: me.awayPpg.toFixed(2) })}` : ""}
          </p>
          <ul className="space-y-1.5">
            {myGames.map((g) => {
              const home = g.h === teamId;
              const opp = home ? { n: g.an, l: g.al, id: g.a } : { n: g.hn, l: g.hl, id: g.h };
              const w = home ? g.pH : g.pA;
              const l = home ? g.pA : g.pH;
              const oppTeam = grp.teams?.find((x) => x.id === opp.id);
              return (
                <li key={g.id} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-2.5" data-testid="chance-game">
                  <div className="flex items-center gap-2">
                    <ClubLogo src={opp.l || undefined} alt={opp.n} clubName={opp.n} size="xs" className="h-5 w-5 shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-[12px] font-bold">
                      {home ? t("chances.vs") : t("chances.at")} {opp.n}
                    </span>
                    {g.live ? (
                      <span className="text-[11px] font-black tabular-nums text-red-500">{home ? `${g.live.gh}-${g.live.ga}` : `${g.live.ga}-${g.live.gh}`}</span>
                    ) : (
                      <span className="text-[11px] font-semibold text-white/75">{dateFmt(g.date)}</span>
                    )}
                    <span className="text-[10px] font-black uppercase tracking-wide text-white" data-testid="chance-venue">{home ? t("clube.home") : t("clube.away")}</span>
                    {(() => {
                      const sv = home ? g.sa : g.sh;
                      return sv == null ? null : (
                        <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold text-black" style={{ background: strongColor(sv) }} data-testid="opp-strength">
                          {strongLabel(sv)}
                          {oppTeam ? ` · ${oppTeam.position}º` : ""}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-white/10" aria-label={`${t("chances.win")} ${pctFmt(w)}, ${t("chances.draw")} ${pctFmt(g.pD)}, ${t("chances.lose")} ${pctFmt(l)}`}>
                    <div style={{ width: `${w * 100}%`, background: "#22c55e" }} />
                    <div style={{ width: `${g.pD * 100}%`, background: "#a1a1aa" }} />
                    <div style={{ width: `${l * 100}%`, background: "#ef4444" }} />
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] text-white/50">
                    <span>{t("chances.win")} {pctFmt(w)}</span>
                    <span>{t("chances.draw")} {pctFmt(g.pD)}</span>
                    <span>{t("chances.lose")} {pctFmt(l)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-[11px] text-white/50" data-testid="chances-sos">
            {t("chances.schedule")}: <b style={{ color: diffColor(me.difficulty) }}>{diffLabel(me.difficulty)}</b>
          </p>
        </section>
      )}

      {/* Todos os clubes */}
      <section data-testid="chances-all">
        <h3 className="mb-2 text-[11px] font-black uppercase tracking-widest text-white/70">{t("chances.all")}</h3>
        {(() => {
          const lastZ = zones.find((z) => z.positions[z.positions.length - 1] === total) ?? zones[0];
          return (
            <div className="mb-1 flex items-center gap-2 px-[calc(0.5rem+1px)] text-[9px] font-black uppercase tracking-wider text-white/60" data-testid="all-head">
              <span className="w-6" />
              <span className="w-5" />
              <span className="min-w-0 flex-1" />
              <span className="w-8 text-right">{t("chances.col_pts")}</span>
              <span className="w-10 text-right" style={{ color: "#fbbf24" }}>{t("chances.col_first")}</span>
              <span className="w-10 text-right" style={{ color: lastZ?.color ?? "#ef4444" }}>{lastZ ? zoneShort(lastZ.name) : ""}</span>
            </div>
          );
        })()}
        <ul className="space-y-1">
          {[...(grp.teams ?? [])]
            .sort((a, b) => a.position - b.position)
            .map((tm) => {
              const top = zones[0];
              const bottom = zones.find((z) => z.positions[z.positions.length - 1] === total);
              return (
                <li key={tm.id}>
                  <button
                    onClick={() => navigate(`/clube/${tm.id}?liga=${leagueId}&temp=${season}&aba=chances`)}
                    className="flex min-h-[48px] w-full items-center gap-2 rounded-xl border px-2 py-2 text-left"
                    style={{ borderColor: tm.id === teamId ? accent : "rgba(255,255,255,0.08)", background: tm.id === teamId ? `${accent}22` : "rgba(255,255,255,0.03)" }}
                  >
                    <span className="w-6 text-center text-[11px] font-black text-white/50">{tm.position}</span>
                    <ClubLogo src={tm.logo || undefined} alt={tm.name} clubName={tm.name} size="xs" className="h-5 w-5 shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-[12px] font-bold">{tm.name}</span>
                    <span className="w-8 text-right text-[11px] tabular-nums text-white/60">{tm.points}</span>
                    {isNeutral(tm.zoneProb, tm.title) ? (
                      <span className="w-20 rounded-full bg-white/10 px-2 py-0.5 text-center text-[9px] font-black uppercase tracking-wider text-white/50" data-testid="all-neutral">{t("chances.neutral")}</span>
                    ) : (
                      <>
                        <span className="w-10 text-right text-[11px] font-black tabular-nums" style={{ color: "#fbbf24" }} title={t("chances.first")}>{pctFmt(tm.title)}</span>
                        {bottom && (
                          <span className="w-10 text-right text-[11px] font-black tabular-nums text-red-400" title={bottom.name}>{pctFmt(tm.zoneProb[bottom.label] ?? 0)}</span>
                        )}
                        {!bottom && top && <span className="w-10 text-right text-[11px] tabular-nums" style={{ color: top.color }}>{pctFmt(tm.zoneProb[top.label] ?? 0)}</span>}
                      </>
                    )}
                  </button>
                </li>
              );
            })}
        </ul>
        <p className="mt-1 text-[10px] text-white/60">{t("chances.legend")}</p>
      </section>

      <div className="rounded-xl bg-white/[0.04] p-3" data-testid="chances-method">
        <p className="text-[11px] leading-relaxed text-white/50">{t("chances.method", { sims: (grp.meta?.sims ?? 0).toLocaleString(language) })}</p>
        <button onClick={() => setHowOpen(true)} data-testid="how-btn" className="mt-2 flex h-10 items-center gap-1.5 rounded-full bg-white/10 px-4 text-[11px] font-bold text-white/85">
          <HelpCircle className="h-4 w-4" /> {t("chances.how_btn")}
        </button>
      </div>

      <Dialog open={howOpen} onOpenChange={setHowOpen}>
        <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto border-white/10 bg-zinc-950 text-white" data-testid="how-dialog">
          <DialogHeader>
            <DialogTitle className="text-lg font-black italic uppercase">{t("chances.how_title")}</DialogTitle>
            <DialogDescription className="sr-only">{t("chances.how_title")}</DialogDescription>
          </DialogHeader>
          <ol className="list-decimal space-y-3 pl-5 text-[13px] leading-relaxed text-white/80">
            <li>{t("chances.how_1")}</li>
            <li>{t("chances.how_2", { sims: (grp.meta?.sims ?? 0).toLocaleString(language) })}</li>
            <li>{t("chances.how_3")}</li>
            <li>{t("chances.how_4")}</li>
            <li>{t("chances.how_5")}</li>
          </ol>
          <p className="rounded-lg bg-white/[0.05] p-3 text-[12px] font-semibold text-white/70">{t("chances.how_6")}</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
