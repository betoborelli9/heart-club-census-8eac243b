/**
 * [CAMINHO]: src/components/clube/PlayoffSection.tsx
 * [MÓDULO]: "Disputa pelo acesso (play-off)": quando o campeonato termina e as últimas vagas saem de um mata-mata em ida e
 * volta (Série B 2026: 3º × 6º e 4º × 5º), mostra a chance de cada clube subir, os dois jogos e o porquê (campanha,
 * força do time e jogo decisivo em casa). Os números vêm prontos de league-prognosis; aqui só desenhamos.
 */
import { Trophy } from "lucide-react";
import { ClubLogo } from "@/components/ClubLogo";
import { useTranslationApp } from "@/hooks/useTranslationApp";

export type PlayoffLeg = {
  homeId: number; awayId: number; date: string | null; status: string | null; gh: number | null; ga: number | null;
  pH: number; pD: number; pA: number;
};
export type PlayoffSeries = {
  seeds: [number, number]; betterId: number; worseId: number; pBetter: number; pWorse: number; decided: boolean; leg1: PlayoffLeg; leg2: PlayoffLeg;
};
type PoTeam = {
  id: number; name: string; logo: string | null; position: number; points: number; win?: number; gf?: number; ga?: number;
  strength?: number; homePpg?: number | null; awayPpg?: number | null;
};

/** Chance de subir pelo play-off de cada clube que está disputando (mapa id → probabilidade). */
export function playoffPromotion(series: PlayoffSeries[] | null | undefined): Map<number, number> {
  const out = new Map<number, number>();
  for (const s of series || []) {
    out.set(s.betterId, s.pBetter);
    out.set(s.worseId, s.pWorse);
  }
  return out;
}

const pct = (p: number) => {
  const v = p * 100;
  if (v > 0 && v < 0.5) return "<1%";
  if (v > 99.5 && v < 100) return ">99%";
  return `${Math.round(v)}%`;
};

export default function PlayoffSection({ series, teams, teamId, accent = "#ff6200" }: { series: PlayoffSeries[]; teams: PoTeam[]; teamId: number; accent?: string }) {
  const { t, language } = useTranslationApp();
  const byId = new Map(teams.map((x) => [x.id, x]));
  const ppg = (v: number) => v.toLocaleString(language, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dateFmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(language, { day: "2-digit", month: "short" }).replace(".", "") : t("chances.po_date_tbc");
  // a disputa do clube em tela primeiro
  const ordered = [...series].sort((a, b) => Number([b.betterId, b.worseId].includes(teamId)) - Number([a.betterId, a.worseId].includes(teamId)));

  return (
    <section className="space-y-3 rounded-2xl border p-4" style={{ borderColor: `${accent}55`, background: `${accent}0d` }} data-testid="chances-playoff">
      <div>
        <h3 className="flex items-center gap-2 text-[12px] font-black uppercase tracking-wide">
          <Trophy className="h-4 w-4" style={{ color: accent }} /> {t("chances.po_title")}
        </h3>
        <p className="mt-1 text-[11px] leading-snug text-white/60" data-testid="po-rules">{t("chances.po_sub")}</p>
      </div>

      {ordered.map((s) => {
        const better = byId.get(s.betterId);
        const worse = byId.get(s.worseId);
        if (!better || !worse) return null;
        const mine = [s.betterId, s.worseId].includes(teamId);
        const fav = s.pBetter >= s.pWorse ? better : worse;
        const rows = [
          { tm: better, p: s.pBetter, seed: s.seeds[0] },
          { tm: worse, p: s.pWorse, seed: s.seeds[1] },
        ];
        const gd = (x: PoTeam) => (x.gf ?? 0) - (x.ga ?? 0);
        const stats: { key: string; label: string; a: string; b: string }[] = [
          { key: "pts", label: t("chances.po_stat_campaign"), a: String(better.points), b: String(worse.points) },
          { key: "win", label: t("chances.po_stat_wins"), a: String(better.win ?? "-"), b: String(worse.win ?? "-") },
          { key: "gd", label: t("chances.po_stat_gd"), a: String(gd(better)), b: String(gd(worse)) },
          { key: "str", label: t("chances.po_stat_strength"), a: String(better.strength ?? "-"), b: String(worse.strength ?? "-") },
          { key: "home", label: t("chances.po_stat_home"), a: better.homePpg != null ? ppg(better.homePpg) : "-", b: worse.homePpg != null ? ppg(worse.homePpg) : "-" },
        ];
        const legs = [
          { key: "leg1", title: t("chances.po_leg1"), leg: s.leg1 },
          { key: "leg2", title: t("chances.po_leg2"), leg: s.leg2 },
        ];
        return (
          <div
            key={`${s.betterId}-${s.worseId}`}
            className="space-y-3 rounded-xl border bg-black/30 p-3"
            style={{ borderColor: mine ? accent : "rgba(255,255,255,0.1)" }}
            data-testid="po-series"
            data-mine={mine ? "1" : "0"}
          >
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/50">
              <span>
                {s.seeds[0]}º × {s.seeds[1]}º
              </span>
              <span>{t("chances.po_chance")}</span>
            </div>

            {rows.map(({ tm, p, seed }) => (
              <div key={tm.id} data-testid="po-team" data-team-id={tm.id}>
                <div className="mb-1 flex items-center gap-2">
                  <ClubLogo src={tm.logo || undefined} alt={tm.name} clubName={tm.name} size="xs" className="h-6 w-6 shrink-0" />
                  <span className="min-w-0 flex-1 break-words text-[13px] font-bold leading-tight">
                    {seed}º {tm.name}
                  </span>
                  <span className="text-2xl font-black tabular-nums leading-none" style={{ color: tm.id === teamId ? accent : "#fff" }} data-testid="po-pct">
                    {pct(p)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(p > 0 ? 2 : 0, p * 100)}%`, background: tm.id === teamId ? accent : "rgba(255,255,255,0.55)" }} />
                </div>
              </div>
            ))}

            <p className="text-[11px] font-semibold text-white/80" data-testid="po-favorite">
              {s.decided ? t("chances.po_done", { club: fav.name }) : t("chances.po_favorite", { club: fav.name })}
              {" · "}
              {t("chances.po_decisive", { club: better.name })}
            </p>

            {/* Por que: campanha, força do time e jogo decisivo em casa */}
            <div className="overflow-hidden rounded-lg border border-white/10" data-testid="po-why">
              <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 bg-white/[0.04] px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-white/50">
                <span>{t("chances.po_why")}</span>
                <span className="w-14 truncate text-right">{better.name.split(" ")[0]}</span>
                <span className="w-14 truncate text-right">{worse.name.split(" ")[0]}</span>
              </div>
              {stats.map((r) => (
                <div key={r.key} className="grid grid-cols-[1fr_auto_auto] gap-x-3 border-t border-white/5 px-2.5 py-1 text-[11px]" data-testid="po-stat">
                  <span className="text-white/65">{r.label}</span>
                  <span className="w-14 text-right font-bold tabular-nums">{r.a}</span>
                  <span className="w-14 text-right font-bold tabular-nums">{r.b}</span>
                </div>
              ))}
            </div>

            {/* As duas partidas */}
            <ul className="space-y-1.5" data-testid="po-legs">
              {legs.map(({ key, title, leg }) => {
                const home = byId.get(leg.homeId);
                const away = byId.get(leg.awayId);
                if (!home || !away) return null;
                const played = leg.gh != null && leg.ga != null;
                return (
                  <li key={key} className="rounded-lg bg-white/[0.04] p-2" data-testid="po-leg">
                    <p className="text-[10px] font-black uppercase tracking-wide text-white/55">
                      {title} · {dateFmt(leg.date)}
                    </p>
                    <p className="mt-0.5 break-words text-[12px] font-bold leading-tight">
                      {home.name} {played ? `${leg.gh} × ${leg.ga}` : "×"} {away.name}
                    </p>
                    {!played && (
                      <p className="mt-1 text-[10px] leading-snug text-white/55" data-testid="po-leg-probs">
                        {t("chances.po_leg_probs", { home: home.name, h: pct(leg.pH), d: pct(leg.pD), away: away.name, a: pct(leg.pA) })}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
