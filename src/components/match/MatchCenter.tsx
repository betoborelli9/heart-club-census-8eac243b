/**
 * MatchCenter — wrapper isolado. Mostra Toast, Countdown, Lineups ou Live conforme estado.
 * Para montar no Dashboard, basta importar: <MatchCenter userId={user?.id} />
 * Não interfere com nenhum componente existente.
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useHeartClubFixture } from "@/hooks/useHeartClubFixture";
import { MatchCountdownCard } from "./MatchCountdownCard";
import { MatchLineupsCard } from "./MatchLineupsCard";
import { LiveMatchOverlay } from "./LiveMatchOverlay";

const LIVE = new Set(["1H", "2H", "HT", "ET", "BT", "P", "LIVE"]);

export function MatchCenter({ userId }: { userId?: string }) {
  const { t } = useTranslation();
  const { upcoming, liveState, lineups, loading } = useHeartClubFixture(userId);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Toast "Hoje tem jogo!" — 1x por dia.
  useEffect(() => {
    if (!upcoming) return;
    const d = new Date(upcoming.date);
    const isToday = new Date().toDateString() === d.toDateString();
    if (!isToday) return;
    const key = `match-toast-${upcoming.id}-${d.toDateString()}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
    toast(t("match.today_toast", { home: upcoming.home.name, away: upcoming.away.name }), {
      duration: 6000,
    });
  }, [upcoming, t]);

  if (loading || !upcoming) return null;

  const kickoff = new Date(upcoming.date).getTime();
  const diff = kickoff - now;
  const isLive = LIVE.has((liveState?.status || upcoming.status) as string);

  if (isLive) {
    return <LiveMatchOverlay fixture={upcoming} liveState={liveState} />;
  }
  // T-40min em diante: mostra escalações se prontas; senão segue o countdown.
  if (diff <= 40 * 60 * 1000 && lineups?.ready) {
    return <MatchLineupsCard fixture={upcoming} lineups={lineups.data || []} />;
  }
  return <MatchCountdownCard fixture={upcoming} diffMs={diff} />;
}
