/**
 * [CAMINHO]: src/lib/active-competitions.ts
 * [MÓDULO]: Regra GERAL, para qualquer clube do mundo: só aparece competição em andamento. Sem jogo ao vivo nem próximo
 * jogo (até 30 dias) numa competição, ela some — nada de tabela de campeonato antigo nem de jogo velho com "Começando…".
 * É a mesma regra do servidor (league-standings); aqui é só a segunda camada de segurança na tela, caso uma resposta
 * velha ainda chegue.
 */
import { isUpcomingFixture } from "../../supabase/functions/_shared/upcoming-fixtures";

type MatchLike = { date: string; status?: string | null } | null | undefined;
type CompetitionLike = { liveMatch?: MatchLike; nextMatch?: MatchLike };

/** Jogo ao vivo (a tela só recebe como "ao vivo" o que o servidor confirmou) ou próximo jogo que ainda vai acontecer. */
export function onlyActiveCompetitions<T extends CompetitionLike>(competitions: T[] | null | undefined, now: number = Date.now()): T[] {
  const out: T[] = [];
  for (const c of competitions || []) {
    const next = c.nextMatch && isUpcomingFixture(c.nextMatch as { date: string; status?: string | null }, now) ? c.nextMatch : null;
    if (!c.liveMatch && !next) continue; // sem campeonato no momento
    out.push({ ...c, nextMatch: next });
  }
  return out;
}
