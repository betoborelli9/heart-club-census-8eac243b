/**
 * [CAMINHO]: src/lib/playoff-view.ts
 * [MÓDULO]: Quais campeonatos têm disputa de acesso em mata-mata (play-off) e como achar a partida dentro da disputa.
 * Espelha o formato do servidor (supabase/functions/_shared/playoff.ts). Novo campeonato = uma linha nos dois lugares.
 */
import type { PlayoffSeries } from "@/components/clube/PlayoffSection";

/** Campeonato → primeira temporada com play-off de acesso (Série B do Brasil: 3º × 6º e 4º × 5º, ida e volta, a partir de 2026). */
export const PLAYOFF_LEAGUES: Record<number, number> = { 72: 2026 };

export function leagueHasPlayoff(leagueId?: number | null, season?: number | null): boolean {
  if (!leagueId || !season) return false;
  const from = PLAYOFF_LEAGUES[leagueId];
  return from !== undefined && season >= from;
}

/** A partida entre estes dois clubes é a ida (mandante = pior campanha) ou a volta (mandante = melhor campanha) da disputa? */
export function playoffLegOf(series: PlayoffSeries[] | null | undefined, homeId: number, awayId: number): { series: PlayoffSeries; kind: "leg1" | "leg2" } | null {
  for (const s of series || []) {
    const pair = [s.betterId, s.worseId];
    if (!pair.includes(homeId) || !pair.includes(awayId) || homeId === awayId) continue;
    return { series: s, kind: homeId === s.worseId ? "leg1" : "leg2" };
  }
  return null;
}
