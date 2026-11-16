/**
 * [CAMINHO]: src/components/clube/PlayoffTable.tsx
 * [MÓDULO]: TABELA DO PLAY-OFF DE ACESSO, em evidência: os 4 clubes que disputam as últimas vagas (ex.: Série B 2026, 3º × 6º e
 * 4º × 5º) com a campanha de cada um e a CHANCE DE SUBIR. É a primeira coisa que o torcedor vê quando o campeonato chega ao
 * play-off; a tabela geral do campeonato fica escondida atrás de um toque. Os números vêm prontos de league-prognosis.
 */
import { Trophy } from "lucide-react";
import { ClubLogo } from "@/components/ClubLogo";
import { useTranslationApp } from "@/hooks/useTranslationApp";
import type { PlayoffSeries } from "./PlayoffSection";

type PoTeam = { id: number; name: string; logo: string | null; position: number; points: number };

const pct = (p: number) => {
  const v = p * 100;
  if (v > 0 && v < 0.5) return "<1%";
  if (v > 99.5 && v < 100) return ">99%";
  return `${Math.round(v)}%`;
};

export default function PlayoffTable({
  series,
  teams,
  meTeamId,
  opponentId,
  onOpenTeam,
  accent = "#ff6200",
}: {
  series: PlayoffSeries[];
  teams: PoTeam[];
  meTeamId?: number | null;
  opponentId?: number | null;
  onOpenTeam?: (teamId: number) => void;
  accent?: string;
}) {
  const { t, language } = useTranslationApp();
  const byId = new Map(teams.map((x) => [x.id, x]));
  const dateFmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(language, { day: "2-digit", month: "2-digit" }) : null;
  // a disputa do clube do torcedor vem primeiro
  const ordered = [...series].sort((a, b) => Number([b.betterId, b.worseId].includes(meTeamId ?? -1)) - Number([a.betterId, a.worseId].includes(meTeamId ?? -1)));

  return (
    <section className="space-y-3 rounded-xl border p-3" style={{ borderColor: `${accent}55`, background: `${accent}0d` }} data-testid="playoff-table">
      <div>
        <h4 className="flex items-center gap-2 text-[11px] font-black uppercase italic tracking-widest text-white">
          <Trophy className="h-4 w-4" style={{ color: accent }} /> {t("playoff.title")}
        </h4>
        <p className="mt-0.5 text-[10px] leading-snug text-white/55">{t("playoff.sub")}</p>
      </div>

      {ordered.map((s) => {
        const rows = [
          { tm: byId.get(s.betterId), p: s.pBetter, seed: s.seeds[0] },
          { tm: byId.get(s.worseId), p: s.pWorse, seed: s.seeds[1] },
        ].filter((r): r is { tm: PoTeam; p: number; seed: number } => !!r.tm);
        if (rows.length < 2) return null;
        const d1 = dateFmt(s.leg1.date);
        const d2 = dateFmt(s.leg2.date);
        return (
          <div key={`${s.betterId}-${s.worseId}`} className="rounded-lg bg-black/30" data-testid="po-block">
            <div className="flex items-center justify-between px-2.5 pt-2 text-[9px] font-black uppercase tracking-widest text-white/45">
              <span>
                {s.seeds[0]}º × {s.seeds[1]}º
              </span>
              <span>{d1 && d2 ? t("playoff.dates", { a: d1, b: d2 }) : t("playoff.dates_tbc")}</span>
            </div>
            <ul>
              {rows.map(({ tm, p, seed }) => {
                const mine = tm.id === meTeamId;
                const target = tm.id === opponentId && !mine;
                return (
                  <li key={tm.id}>
                    <button
                      type="button"
                      onClick={() => onOpenTeam?.(tm.id)}
                      className="flex min-h-[48px] w-full items-center gap-2 px-2.5 py-1.5 text-left"
                      style={mine ? { background: `${accent}22` } : undefined}
                      data-testid="po-row"
                      data-team-id={tm.id}
                    >
                      <span className="w-6 shrink-0 text-center text-[11px] font-black text-white/60">{seed}º</span>
                      <ClubLogo src={tm.logo || undefined} alt={tm.name} clubName={tm.name} size="xs" className="h-6 w-6 shrink-0" />
                      <span className="min-w-0 flex-1 leading-tight">
                        <span className="block break-words text-[12px] font-bold">
                          {tm.name}
                          {target && <span className="ml-1.5 text-[9px] font-black uppercase tracking-wide" style={{ color: accent }}>{t("playoff.target")}</span>}
                        </span>
                        <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-white/10">
                          <span className="block h-full rounded-full" style={{ width: `${Math.max(p > 0 ? 2 : 0, p * 100)}%`, background: mine ? accent : "rgba(255,255,255,0.6)" }} />
                        </span>
                      </span>
                      <span className="w-12 shrink-0 text-right text-[10px] tabular-nums text-white/50">
                        {tm.points} {t("playoff.pts")}
                      </span>
                      <span className="w-14 shrink-0 text-right text-lg font-black tabular-nums leading-none" style={{ color: mine ? accent : "#fff" }} data-testid="po-row-pct">
                        {pct(p)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      <p className="text-[10px] text-white/45">{t("playoff.chance_note")}</p>
    </section>
  );
}
