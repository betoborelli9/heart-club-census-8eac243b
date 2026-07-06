/**
 * Lê fixtures do time-do-coração do usuário a partir de team_fixtures_cache.
 * Não chama API-Football: depende apenas do cache populado pelo cron `fixtures-sync`.
 * Isolado: não modifica nada do dashboard existente.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Fixture = {
  id: number;
  date: string;
  status: string;
  venue?: string;
  league: { id: number; name: string; logo: string; round: string };
  home: { id: number; name: string; logo: string };
  away: { id: number; name: string; logo: string };
  goals?: { home: number | null; away: number | null };
};

export type FixturePayload = {
  next?: Fixture[];
  lineups?: Record<string, { ready: boolean; data?: any[] }>;
  live_state?: Record<string, { status: string; goalsHome: number; goalsAway: number; elapsed?: number | null; finished: boolean }>;
};

export function useHeartClubFixture(userId?: string) {
  const [teamId, setTeamId] = useState<number | null>(null);
  const [payload, setPayload] = useState<FixturePayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let active = true;
    (async () => {
      const { data: prof } = await supabase
        .from("profiles").select("time_do_coracao_id").eq("id", userId).maybeSingle();
      const tid = (prof as any)?.time_do_coracao_id || null;
      if (!active) return;
      setTeamId(tid);
      if (!tid) { setLoading(false); return; }
      const { data: row } = await supabase
        .from("team_fixtures_cache").select("payload").eq("team_id", tid).maybeSingle();
      if (!active) return;
      setPayload((row as any)?.payload || null);
      setLoading(false);
    })();

    return () => { active = false; };
  }, [userId]);

  useEffect(() => {
    if (!teamId) return;
    const ch = supabase.channel(`fx-${teamId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "team_fixtures_cache", filter: `team_id=eq.${teamId}` },
        (p: any) => setPayload(p.new?.payload || null))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [teamId]);

  const next = (payload?.next || [])
    .filter((f) => !payload?.live_state?.[f.id]?.finished)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const upcoming = next[0] || null;
  const liveState = upcoming ? payload?.live_state?.[upcoming.id] : null;
  const lineups = upcoming ? payload?.lineups?.[upcoming.id] : null;

  return { teamId, payload, upcoming, liveState, lineups, loading };
}
