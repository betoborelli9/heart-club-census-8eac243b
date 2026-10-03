import { useTranslation } from "react-i18next";
import { MapPin, Tv } from "lucide-react";
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

// "#C60C30" -> "rgba(198, 12, 48, 0.18)"; qualquer outro formato cai num laranja suave.
function withAlpha(color: string, alpha: number) {
  const m = /^#?([0-9a-f]{6})$/i.exec((color || "").trim());
  if (!m) return `rgba(255, 98, 0, ${alpha})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export function MatchCountdownCard({
  fixture,
  diffMs,
  primaryColor = "#ff6200",
}: {
  fixture: Fixture;
  diffMs: number;
  primaryColor?: string;
}) {
  const { t, i18n } = useTranslation();
  const dt = new Intl.DateTimeFormat(i18n.language, {
    weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  }).format(new Date(fixture.date));
  const broadcasters = (fixture.broadcasters || []).filter(Boolean);

  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-4 text-white"
      style={{
        borderColor: withAlpha(primaryColor, 0.35),
        background: `linear-gradient(135deg, ${withAlpha(primaryColor, 0.18)} 0%, rgba(0,0,0,0.55) 55%)`,
        boxShadow: `0 0 40px -18px ${primaryColor}`,
      }}
    >
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-1"
        style={{ background: primaryColor }}
      />
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <ClubLogo src={fixture.home.logo} alt={fixture.home.name} clubName={fixture.home.name} size="sm" />
          <span className="font-semibold truncate">{fixture.home.name}</span>
        </div>
        <span className="text-xs opacity-70">×</span>
        <div className="flex items-center gap-2 min-w-0 justify-end">
          <span className="font-semibold truncate">{fixture.away.name}</span>
          <ClubLogo src={fixture.away.logo} alt={fixture.away.name} clubName={fixture.away.name} size="sm" />
        </div>
      </div>
      <div className="mt-2 text-xs opacity-70">{fixture.league.name} • {dt}</div>
      <div className="mt-3 text-center">
        <div className="text-[11px] uppercase tracking-wider opacity-70">{t("match.starts_in")}</div>
        <div className="font-mono text-2xl" style={{ color: primaryColor }}>{fmt(diffMs)}</div>
      </div>
      {(fixture.venue || broadcasters.length > 0) && (
        <div className="mt-3 flex flex-col items-center gap-1 border-t border-white/10 pt-3">
          {fixture.venue && (
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-white/60">
              <MapPin className="w-3 h-3" style={{ color: primaryColor }} /> {fixture.venue}
            </div>
          )}
          {broadcasters.length > 0 && (
            <div className="flex items-center justify-center gap-1.5 text-[11px] italic text-white/50">
              <Tv className="w-3 h-3" style={{ color: primaryColor }} /> Onde assistir: {broadcasters.join(" · ")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
