/**
 * [CAMINHO]: src/lib/entry-flow.ts
 * [MÓDULO]: Fluxo novo de entrada do torcedor: escolhe o clube ANTES do login,
 * entra com Google/e-mail só no "Juro lealdade", aceita os Termos e vota.
 *
 * NEW_ENTRY_FLOW_ENABLED = true  → LIGADO para o público em 07/10/2026, com OK do Beto.
 * Para voltar ao fluxo antigo (Login → Voting), troque para false e publique (fácil de desfazer).
 * Com false, /entrar e /confirmar-voto só abrem para o Master em modo simulação (?sim=1), que NÃO grava voto.
 */
import type { ClubSearchResult } from "@/lib/search-clubs";

export const NEW_ENTRY_FLOW_ENABLED = true;

const KEY = "hc_pending_vote";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type PendingVote = {
  club: ClubSearchResult;
  sympathies: ClubSearchResult[];
  savedAt: number;
};

/** Guarda a escolha do torcedor no aparelho enquanto ele faz o login. */
export function savePendingVote(club: ClubSearchResult, sympathies: ClubSearchResult[]) {
  try {
    const value: PendingVote = { club, sympathies, savedAt: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* sem armazenamento: o torcedor escolhe de novo depois do login */
  }
}

export function loadPendingVote(): PendingVote | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingVote;
    if (!parsed?.club?.name || Date.now() - (parsed.savedAt || 0) > MAX_AGE_MS) return null;
    return { ...parsed, sympathies: Array.isArray(parsed.sympathies) ? parsed.sympathies : [] };
  } catch {
    return null;
  }
}

export function clearPendingVote() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignora */
  }
}

/** Para onde mandar quem JÁ fez login mas ainda não votou (fluxo novo ou antigo). */
export function notVotedTarget(): string {
  if (!NEW_ENTRY_FLOW_ENABLED) return "/voting";
  return loadPendingVote() ? "/confirmar-voto" : "/entrar";
}

/** Para onde mandar quem chegou sem login. */
export function anonymousTarget(): string {
  return NEW_ENTRY_FLOW_ENABLED ? "/entrar" : "/login";
}
