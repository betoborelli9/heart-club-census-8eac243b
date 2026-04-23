/**
 * [CAMINHO]: src/lib/search-clubs.ts
 * [CONTEXTO]: Busca Híbrida - Une Cache Local + API Football Pro
 * [STATUS]: CORRIGIDO - Não trava mais no primeiro resultado do cache
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

export async function searchClubsWithFallback(query: string, limit = 20): Promise<ClubSearchResult[]> {
  const term = (query || "").trim();
  if (term.length < 3) return []; // Alinhado com a página de Debug que funcionou

  const normalized = stripAccents(term);

  try {
    // 1. BUSCA PARALELA: Lança as duas buscas ao mesmo tempo para ser ultra rápido
    const [cacheRes, apiRes] = await Promise.all([
      supabase.from("clubes_cache").select("*").limit(100),
      supabase.functions.invoke("search-clubs", { body: { query: normalized } }),
    ]);

    // 2. PROCESSA CACHE
    const localMatches = (cacheRes.data || [])
      .filter((c: any) => stripAccents(c.nome).includes(normalized))
      .map(mapCacheRow);

    // 3. PROCESSA API
    const apiMatches = (apiRes.data || []).map((t: any) => ({
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

    // 4. MERGE INTELIGENTE: Remove duplicados (prefere o da API por ser mais completo)
    const combined = [...apiMatches];
    localMatches.forEach((local) => {
      const exists = combined.some((c) => stripAccents(c.name) === stripAccents(local.name));
      if (!exists) combined.push(local);
    });

    return combined.slice(0, limit);
  } catch (err) {
    console.error("[searchClubsWithFallback]", err);
    return [];
  }
}

export const searchClubsLocal = searchClubsWithFallback;

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

  await supabase.from("clubes_cache").upsert(rows, { onConflict: "nome", ignoreDuplicates: true });
}

/**
 * [RODAPÉ TÉCNICO]
 * Versão: 41.0
 * - Busca Híbrida Ativada: Cache e API rodam em paralelo.
 * - Merge inteligente: Prioriza dados da API para evitar o erro "Brasil, Brasil".
 * - Limite aumentado para 20 resultados para cobrir todos os "Atléticos".
 */
