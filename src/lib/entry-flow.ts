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

// ── Escolha levada junto no link (e-mail / "abrir no Chrome") ─────────────────────────────────────────
// O voto pendente fica só no aparelho (localStorage). Quando o link do e-mail abre em OUTRO navegador
// (o Chrome, fora do Instagram), o aparelho novo não tem a escolha — por isso ela viaja no próprio link,
// em um parâmetro curto (?pv=…), e é refeita na chegada se o localStorage estiver vazio.
export const PENDING_VOTE_PARAM = "pv";
const MAX_PARAM_LENGTH = 1800; // limite que a função de e-mail também confere
const MAX_SYMPATHIES = 4;

type CompactClub = { i?: string; n: string; l?: string; g?: string; y?: string; c?: string; a?: number | null; o?: "api" | "local" };

const toCompact = (c: ClubSearchResult, withLogo: boolean): CompactClub => ({
  i: c.id,
  n: c.name,
  l: c.location || undefined,
  g: withLogo ? c.logo || undefined : undefined,
  y: c.city || undefined,
  c: c.country || undefined,
  a: c.api_id ?? undefined,
  o: c.source,
});

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

const fromCompact = (c: any): ClubSearchResult | null => {
  const name = str(c?.n, 100).trim();
  if (!name) return null;
  const logo = str(c?.g, 300);
  const apiId = Number(c?.a);
  const location = str(c?.l, 120);
  return {
    id: str(c?.i, 60) || name,
    name,
    shortName: name,
    location,
    logo: /^https:\/\//i.test(logo) ? logo : "", // só endereço seguro (https) vira imagem
    city: str(c?.y, 80),
    state: "",
    country: str(c?.c, 80),
    api_id: Number.isInteger(apiId) && apiId > 0 ? apiId : null,
    source: c?.o === "api" ? "api" : "local",
  };
};

const toBase64Url = (s: string) =>
  btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const fromBase64Url = (s: string) => {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  return decodeURIComponent(escape(atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4))));
};

/** Texto curto (seguro para URL) com o clube do coração e as simpatias. Null se não couber no link. */
export function encodePendingVoteParam(club: ClubSearchResult, sympathies: ClubSearchResult[]): string | null {
  try {
    for (const withLogo of [true, false]) {
      const payload = { c: toCompact(club, withLogo), s: sympathies.slice(0, MAX_SYMPATHIES).map((x) => toCompact(x, withLogo)) };
      const out = toBase64Url(JSON.stringify(payload));
      if (out.length <= MAX_PARAM_LENGTH) return out;
    }
  } catch {
    /* cai no null */
  }
  return null;
}

/** Refaz a escolha a partir do texto do link. Qualquer coisa estranha → null (nunca quebra a tela). */
export function decodePendingVoteParam(raw: string | null | undefined): { club: ClubSearchResult; sympathies: ClubSearchResult[] } | null {
  if (!raw || raw.length > MAX_PARAM_LENGTH || !/^[A-Za-z0-9_-]+$/.test(raw)) return null;
  try {
    const parsed = JSON.parse(fromBase64Url(raw));
    const club = fromCompact(parsed?.c);
    if (!club) return null;
    const sympathies = (Array.isArray(parsed?.s) ? parsed.s : [])
      .slice(0, MAX_SYMPATHIES)
      .map(fromCompact)
      .filter((x: ClubSearchResult | null): x is ClubSearchResult => !!x && x.name !== club.name)
      .filter((x: ClubSearchResult, i: number, all: ClubSearchResult[]) => all.findIndex((y) => y.name === x.name) === i);
    return { club, sympathies };
  } catch {
    return null;
  }
}

/**
 * Chegou por um link com a escolha (?pv=…) e o aparelho não tem voto pendente guardado?
 * Então guarda a escolha do link no aparelho. Devolve o voto pendente que valerá daqui em diante (ou null).
 */
export function adoptPendingVoteFromLink(raw: string | null | undefined): PendingVote | null {
  const existing = loadPendingVote();
  if (existing) return existing;
  const fromLink = decodePendingVoteParam(raw);
  if (!fromLink) return null;
  savePendingVote(fromLink.club, fromLink.sympathies);
  return loadPendingVote();
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
