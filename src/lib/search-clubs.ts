/**
 * [CAMINHO]: src/lib/search-clubs.ts
 * [CONTEXTO]: Busca Híbrida - Une Cache Local + API Football Pro
 * [STATUS]: CORRIGIDO - Não trava mais no primeiro resultado do cache
 */

import { supabase } from "@/integrations/supabase/client";
import { canonicalClubKey, canonicalTokens } from "@/lib/canonical-club";

export interface ClubSearchResult {
  id: string;
  name: string;
  shortName: string;
  location: string;
  logo: string;
  city: string;
  state: string;
  country: string;
  mascote?: string;
  source: "local" | "api";
  api_id?: number | null;
  cor_primaria?: string;
  cor_secundaria?: string;
  cor_terciaria?: string;
}

export function stripAccents(str: string): string {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const AMBIGUOUS_CANONICAL_KEYS = new Set([
  "america",
  "atletico",
  "nacional",
  "internacional",
  "real",
  "vitoria",
  "goiania",
  "sport",
  "racing",
  "union",
  "central",
]);

const dedupeClubKey = (club: Pick<ClubSearchResult, "name" | "city" | "country" | "api_id">) => {
  if (club.api_id) return `api:${club.api_id}`;
  const canonical = canonicalClubKey(club.name);
  const normalizedName = stripAccents(club.name);
  const location = [club.city, club.country].map(stripAccents).filter(Boolean).join("|");
  if (!canonical || AMBIGUOUS_CANONICAL_KEYS.has(canonical)) return `name:${normalizedName}|${location}`;
  return `canon:${canonical}|${location}`;
};

function mapCacheRow(c: any): ClubSearchResult {
  return {
    id: String(c.id),
    name: c.nome,
    shortName: c.nome_curto || c.nome,
    location: [c.cidade, c.pais].filter(Boolean).join(", "),
    logo: (c.escudo_url || "").trim(),
    city: c.cidade || "",
    state: "",
    country: c.pais || "",
    mascote: c.mascote || undefined,
    api_id: c.api_id ? Number(c.api_id) : null,
    cor_primaria: c.cor_primaria || undefined,
    cor_secundaria: c.cor_secundaria || undefined,
    cor_terciaria: c.cor_terciaria || undefined,
    source: "local",
  };
}

export async function searchClubsWithFallback(query: string, limit = 20): Promise<ClubSearchResult[]> {
  const term = (query || "").trim();
  if (term.length < 3) return []; // Alinhado com a página de Debug que funcionou

  const normalized = stripAccents(term);

  try {
    // BUSCA HÍBRIDA EM PARALELO: cache local + API-Football juntos.
    // Cache aparece como "LOCAL"; API mostra TODOS os homônimos do mundo (ex: todos os Operário).
    //
    // ✦ Canonicalização da query: "Clube de Regatas do Flamengo" → tokens ["flamengo"].
    //   Assim o cache encontra o Flamengo mesmo quando o torcedor digitou o nome longo.
    const canonKey = canonicalClubKey(term);
    const tokens = canonicalTokens(term);
    const orFilters = [
      `nome.ilike.%${term}%`,
      `nome_curto.ilike.%${term}%`,
      ...tokens.flatMap((tok) => [`nome.ilike.%${tok}%`, `nome_curto.ilike.%${tok}%`]),
    ].join(",");

    const [cacheResp, apiResp] = await Promise.all([
      supabase
        .from("clubes_cache")
        .select("*")
        .or(orFilters)
        .limit(limit * 2),
      supabase.functions.invoke("search-clubs", { body: { query: term } }),
    ]);

    const matchesCanon = (clubName: string) => {
      if (!canonKey) return false;
      const ck = canonicalClubKey(clubName);
      return ck === canonKey || (!!ck && (ck.includes(canonKey) || canonKey.includes(ck)));
    };

    const localMatches = (cacheResp.data || [])
      .filter(
        (c: any) =>
          isValidClubName(c.nome) &&
          (stripAccents(c.nome).includes(normalized) || matchesCanon(c.nome)),
      )
      .map(mapCacheRow);

    const apiMatches: ClubSearchResult[] = (apiResp.data || [])
      .filter(
        (t: any) =>
          isValidClubName(t.name) &&
          (stripAccents(t.name).includes(normalized) || matchesCanon(t.name)),
      )
      .map((t: any) => ({
        id: `api-${t.api_id}`,
        name: t.name,
        shortName: t.name,
        location: [t.city, t.country].filter(Boolean).join(", "),
        logo: (t.logo || "").trim(),
        city: t.city || "",
        state: "",
        country: t.country || "",
        api_id: t.api_id ?? null,
        source: "api" as const,
      }));

    // Dedupe por identificador único. Homônimos nunca podem colapsar por chave canônica
    // (ex.: América-MG, América-RJ, América-RN, América de Cali).
    const localApiIds = new Set(localMatches.map((c) => c.api_id).filter(Boolean));
    const localNames = new Set(localMatches.map((c) => stripAccents(c.name)));
    const seenClubKeys = new Set<string>();
    const pushUnique = (acc: ClubSearchResult[], c: ClubSearchResult) => {
      const k = dedupeClubKey(c);
      if (seenClubKeys.has(k)) return acc;
      seenClubKeys.add(k);
      acc.push(c);
      return acc;
    };
    const merged: ClubSearchResult[] = [];
    localMatches.forEach((c) => pushUnique(merged, c));
    apiMatches
      .filter((a) => !(a.api_id && localApiIds.has(a.api_id)) && !localNames.has(stripAccents(a.name)))
      .forEach((c) => pushUnique(merged, c));

    return merged.slice(0, limit);
  } catch (err) {
    console.error("[searchClubsWithFallback]", err);
    return [];
  }
}

export const searchClubsLocal = searchClubsWithFallback;

/**
 * Validação anti-spam: nome precisa ter ao menos 3 chars, não pode ser
 * placeholder ("selecione...", "seu clube", "novo time", etc) e precisa
 * conter ao menos uma letra. Bloqueia entrada de lixo no cache.
 */
export function isValidClubName(raw: string | null | undefined): boolean {
  const name = (raw || "").trim();
  if (name.length < 3) return false;
  if (!/[A-Za-zÀ-ÿ]/.test(name)) return false;
  const blacklist = /^(selecione|seu clube|novo time|teste|test|xxx|n\/a|na|nenhum|sem nome)/i;
  if (blacklist.test(name)) return false;
  if (/seu\s+clube/i.test(name)) return false;
  return true;
}

export async function persistClubsIfMissing(clubs: ClubSearchResult[]): Promise<void> {
  // Só persistimos clubes vindos da API oficial (com api_id) e com nome válido.
  // A gravação passa pela Edge Function, que revalida o clube na API-Football.
  const fromApi = clubs.filter(
    (c) => c.source === "api" && !!c.api_id && isValidClubName(c.name) && !!c.logo,
  );
  if (fromApi.length === 0) return;

  await Promise.all(
    fromApi.map(async (club) => {
      const { error } = await supabase.functions.invoke("enrich-club-colors", {
        body: { club_name: club.name, api_id: club.api_id },
      });
      if (error) console.warn("[persistClubsIfMissing] não persistiu:", club.name, error.message);
    }),
  );
}

/**
 * [RODAPÉ TÉCNICO]
 * Versão: 41.0
 * - Busca Híbrida Ativada: Cache e API rodam em paralelo.
 * - Merge inteligente: Prioriza dados da API para evitar o erro "Brasil, Brasil".
 * - Limite aumentado para 20 resultados para cobrir todos os "Atléticos".
 */
