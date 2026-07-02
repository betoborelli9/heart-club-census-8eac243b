import { useTranslation } from "react-i18next";
import type { Fixture } from "@/hooks/useHeartClubFixture";
import { ClubLogo } from "@/components/ClubLogo";

export function MatchLineupsCard({ fixture, lineups }: { fixture: Fixture; lineups: any[] }) {
  const { t } = useTranslation();
  const [home, away] = lineups;
  return (
    <div className="rounded-xl border border-white/10 bg-black/40 p-4 text-white">
      <div className="text-center text-xs uppercase tracking-wider opacity-70 mb-2">
        {t("match.lineups_title")}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[home, away].map((side: any, i: number) => side ? (
          <div key={i}>
            <div className="flex items-center gap-2 mb-2">
              <ClubLogo src={side.team?.logo} alt={side.team?.name || ""} clubName={side.team?.name} size="sm" />
              <span className="ml-auto text-xs opacity-70">{side.formation}</span>
            </div>
            <ul className="text-xs space-y-1">
              {(side.startXI || []).map((p: any) => (
                <li key={p.player?.id} className="truncate">
                  <span className="opacity-50 mr-1">{p.player?.number}</span>
                  {p.player?.name}
                </li>
              ))}
            </ul>
            {!!side.substitutes?.length && (
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer opacity-70">{t("match.substitutes")}</summary>
                <ul className="mt-1 space-y-1">
                  {side.substitutes.map((p: any) => (
                    <li key={p.player?.id} className="truncate opacity-80">{p.player?.name}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        ) : null)}
      </div>
    </div>
  );
}
