/**
 * [CAMINHO]: supabase/functions/_shared/upcoming-fixtures.ts
 * [MÓDULO]: Regra GERAL (vale para qualquer clube do mundo) de "este clube tem campeonato no momento?":
 * só existe "próximo jogo" quando o jogo AINDA VAI ACONTECER (ou acabou de começar) e está perto o bastante para
 * ser "agora". Jogo "não iniciado" com data já passada (cache velho) nunca é "próximo jogo", e nada de jogo a
 * meses de distância (clube sem campeonato no momento não mostra tabela nem jogo).
 * Sem nenhum jogo ao vivo ou próximo numa competição, a competição não aparece para o torcedor.
 */

/** Jogo que ainda não começou segundo a API: NS (não iniciado), TBD (horário a definir), PST (adiado). */
export const NOT_STARTED = new Set(["NS", "TBD", "PST"]);

/** Folga para atraso de apito: um jogo "não iniciado" até 3 h depois do horário ainda pode estar começando. */
export const KICKOFF_GRACE_MS = 3 * 60 * 60 * 1000;

/** Janela de "campeonato no momento": o próximo jogo precisa estar a, no máximo, 30 dias. */
export const UPCOMING_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export type FixtureLike = { date: string; status?: string | null };

/** O jogo ainda vai acontecer (ou está começando) e está dentro da janela de 30 dias? */
export function isUpcomingFixture(f: FixtureLike, now: number = Date.now()): boolean {
  const status = f.status || "NS";
  if (!NOT_STARTED.has(status)) return false; // encerrado, cancelado, ao vivo (o ao vivo vem do nosso banco), etc.
  const t = new Date(f.date).getTime();
  if (!Number.isFinite(t)) return false;
  return t >= now - KICKOFF_GRACE_MS && t <= now + UPCOMING_WINDOW_MS;
}

/** Só os próximos jogos de verdade, em ordem de data. */
export function upcomingOnly<T extends FixtureLike>(list: T[] | null | undefined, now: number = Date.now()): T[] {
  return (list || [])
    .filter((f) => isUpcomingFixture(f, now))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/** A resposta da API-Football veio com erro (limite de requisições, instabilidade)? Resposta vazia SEM erro é válida. */
export function apiResponseFailed(j: any): boolean {
  const errs = j?.errors;
  if (!errs) return false;
  return Array.isArray(errs) ? errs.length > 0 : Object.keys(errs).length > 0;
}
