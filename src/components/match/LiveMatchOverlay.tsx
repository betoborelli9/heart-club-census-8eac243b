import { useTranslation } from "react-i18next";
import type { Fixture } from "@/hooks/useHeartClubFixture";
import { ClubLogo } from "@/components/ClubLogo";

export function LiveMatchOverlay({ fixture, liveState }: { fixture: Fixture; liveState: any }) {
  const { t } = useTranslation();
  const gh = liveState?.goalsHome ?? fixture.goals?.home ?? 0;
  const ga = liveState?.goalsAway ?? fixture.goals?.away ?? 0;
  const elapsed = liveState?.elapsed;
  return (
    <div className="rounded-xl border border-red-500/40 bg-black/60 p-3 sm:p-4 text-white animate-pulse">
      <div className="flex items-center justify-between text-[10px] sm:text-xs uppercase tracking-wider mb-3">
        <span className="text-red-400">● {t("match.live")}</span>
        <span className="opacity-70">{elapsed != null ? `${elapsed}'` : liveState?.status || fixture.status}</span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <ClubLogo src={fixture.home.logo} alt={fixture.home.name} clubName={fixture.home.name} size="sm" />
          <span className="font-semibold text-xs sm:text-sm truncate min-w-0">{fixture.home.name}</span>
        </div>
        <div className="flex flex-col items-center justify-center font-mono tabular-nums whitespace-nowrap px-1 leading-none">
          {elapsed != null && <span className="mb-1 text-[10px] sm:text-xs font-bold text-red-300">{elapsed}'</span>}
          <span className="text-lg sm:text-2xl font-bold">
            {gh} <span className="opacity-50">×</span> {ga}
          </span>
        </div>
        <div className="flex items-center gap-2 min-w-0 justify-end">
          <span className="font-semibold text-xs sm:text-sm truncate min-w-0 text-right">{fixture.away.name}</span>
          <ClubLogo src={fixture.away.logo} alt={fixture.away.name} clubName={fixture.away.name} size="sm" />
        </div>
      </div>
    </div>
  );
}
