import { useTranslation } from "react-i18next";
import type { Fixture } from "@/hooks/useHeartClubFixture";
import { ClubLogo } from "@/components/ClubLogo";

export function LiveMatchOverlay({ fixture, liveState }: { fixture: Fixture; liveState: any }) {
  const { t } = useTranslation();
  const gh = liveState?.goalsHome ?? fixture.goals?.home ?? 0;
  const ga = liveState?.goalsAway ?? fixture.goals?.away ?? 0;
  return (
    <div className="rounded-xl border border-red-500/40 bg-black/60 p-4 text-white animate-pulse">
      <div className="flex items-center justify-between text-xs uppercase tracking-wider mb-2">
        <span className="text-red-400">● {t("match.live")}</span>
        <span className="opacity-70">{liveState?.status || fixture.status}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <ClubLogo src={fixture.home.logo} alt={fixture.home.name} clubName={fixture.home.name} size="sm" />
          <span className="font-semibold truncate">{fixture.home.name}</span>
        </div>
        <div className="font-mono text-3xl">{gh} <span className="opacity-50">×</span> {ga}</div>
        <div className="flex items-center gap-2 min-w-0 justify-end">
          <span className="font-semibold truncate">{fixture.away.name}</span>
          <ClubLogo src={fixture.away.logo} alt={fixture.away.name} clubName={fixture.away.name} size="sm" />
        </div>
      </div>
    </div>
  );
}
