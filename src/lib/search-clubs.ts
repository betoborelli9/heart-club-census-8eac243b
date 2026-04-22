/**
 * [CAMINHO]: src/lib/search-clubs.ts
 * [CONTEXTO]: Busca de Clubes — Cache Supabase (acento-insensível) → API Football (somente leitura)
 * [REGRA]: NÃO persiste nada aqui. Persistência ocorre APENAS ao confirmar voto (Voting.tsx).
 */

import { supabase } from "@/integrations/supabase/client";

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

/** Remove acentos e normaliza para comparação. */
export function stripAccents(str: string): string {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

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

/**
 * Busca em duas camadas:
 * 1) clubes_cache (Supabase) com filtro client-side acento-insensível
 * 2) API-Football via edge function search-clubs (sem persistir)
 */
export async function searchClubsWithFallback(query: string, limit = 15): Promise<ClubSearchResult[]> {
  const term = (query || "").trim();
  if (term.length < 2) return [];

  const normalized = stripAccents(term);

  try {
    // 1) CACHE LOCAL — pega um conjunto razoável e filtra no cliente sem acento.
    const { data: cacheData } = await supabase
      .from("clubes_cache")
      .select("*")
      .limit(500);

    const localMatches = (cacheData || [])
      .filter((c: any) => stripAccents(c.nome).includes(normalized))
      .slice(0, limit)
      .map(mapCacheRow);

    if (localMatches.length > 0) return localMatches;

    // 2) FALLBACK API-FOOTBALL (apenas leitura — sem gravar no cache)
    const { data, error } = await supabase.functions.invoke("search-clubs", {
      body: { query: normalized },
    });

    if (error || !Array.isArray(data)) return [];

    return (data as any[]).slice(0, limit).map((t: any) => ({
      id: `api-${t.api_id}`,
      name: t.name,
      shortName: t.name,
      location: [t.city, t.country].filter(Boolean).join(", "),
      logo: (t.logo || "").trim(),
      city: t.city || "",
      state: "",
      country: t.country || "",
      api_id: t.api_id ?? null,
      source: "api",
    }));
  } catch (err) {
    console.error("[searchClubsWithFallback]", err);
    return [];
  }
}

// Alias retro-compatível
export const searchClubsLocal = searchClubsWithFallback;

/**
 * Persiste no clubes_cache APENAS clubes que vieram da API e ainda não existem.
 * Anti-duplicidade: onConflict: 'nome'. Chamada após o voto ser confirmado.
 */
export async function persistClubsIfMissing(clubs: ClubSearchResult[]): Promise<void> {
  const fromApi = clubs.filter((c) => c.source === "api");
  if (fromApi.length === 0) return;

  const rows = fromApi.map((c) => ({
    nome: c.name,
    nome_curto: c.shortName || c.name,
    cidade: c.city || "Desconhecida",
    pais: c.country || "Brasil",
    escudo_url: c.logo || null,
    api_id: c.api_id ? String(c.api_id) : null,
  }));

  const { error } = await supabase
    .from("clubes_cache")
    .upsert(rows, { onConflict: "nome", ignoreDuplicates: true });

  if (error) console.error("[persistClubsIfMissing]", error);
}

/**
 * [RODAPÉ TÉCNICO]
 * Versão: 40.0
 * - Cache primeiro (filtro acento-insensível client-side).
 * - API Football apenas como leitura no fallback.
 * - Persistência separada (persistClubsIfMissing) usada após confirmar voto.
 */
