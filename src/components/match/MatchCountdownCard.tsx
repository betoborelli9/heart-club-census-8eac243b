import { useTranslation } from "react-i18next";
import type { Fixture } from "@/hooks/useHeartClubFixture";
import { ClubLogo } from "@/components/ClubLogo";

function fmt(ms: number) {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function MatchCountdownCard({ fixture, diffMs }: { fixture: Fixture; diffMs: number }) {
  const { t, i18n } = useTranslation();
  const dt = new Intl.DateTimeFormat(i18n.language, {
    weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  }).format(new Date(fixture.date));

  return (
    <div className="rounded-xl border border-white/10 bg-black/40 p-4 text-white">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <ClubLogo clubName={fixture.home.name} logoUrl={fixture.home.logo} size="sm" />
          <span className="font-semibold truncate">{fixture.home.name}</span>
        </div>
        <span className="text-xs opacity-70">×</span>
        <div className="flex items-center gap-2 min-w-0 justify-end">
          <span className="font-semibold truncate">{fixture.away.name}</span>
          <ClubLogo clubName={fixture.away.name} logoUrl={fixture.away.logo} size="sm" />
        </div>
      </div>
      <div className="mt-2 text-xs opacity-70">{fixture.league.name} • {dt}</div>
      <div className="mt-3 text-center">
        <div className="text-[11px] uppercase tracking-wider opacity-70">{t("match.starts_in")}</div>
        <div className="font-mono text-2xl">{fmt(diffMs)}</div>
      </div>
    </div>
  );
}
