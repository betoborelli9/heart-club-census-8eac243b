/* src/lib/search-clubs.ts
   Busca Local-First com fallback para API-Football via Edge Function.
   Logos vêm exclusivamente do campo logoUrl de cada clube local. */

import { CLUBS_DATA } from "@/clubes-data";
import { supabase } from "@/integrations/supabase/client";

const removeAccents = (str: string) =>
  str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export interface ClubSearchResult {
  id: string;
  name: string;
  shortName: string;
  location: string;
  logo: string;
  city: string;
  state: string;
  country: string;
  mascote: string;
  source: "local" | "api";
}

/** Busca 100% local no dataset mestre */
export function searchClubsLocal(query: string, limit = 10): ClubSearchResult[] {
  if (!query || query.length < 2) return [];

  const normalizedQuery = removeAccents(query.toLowerCase().trim());

  const matches = CLUBS_DATA.filter((c) =>
    removeAccents(c.nome.toLowerCase()).includes(normalizedQuery) ||
    removeAccents(c.cidade.toLowerCase()).includes(normalizedQuery)
  );

  return matches.slice(0, limit).map((c, i) => ({
    id: String(i),
    name: c.nome,
    shortName: c.nome_curto,
    location: `${c.cidade}, ${c.estado}, ${c.pais}`,
    logo: c.logoUrl,
    city: c.cidade,
    state: c.estado,
    country: c.pais,
    mascote: c.mascote,
    source: "local" as const,
  }));
}

/** Busca com fallback: local primeiro, API-Football se local retornar vazio */
export async function searchClubsWithFallback(
  query: string,
  limit = 10
): Promise<ClubSearchResult[]> {
  const localResults = searchClubsLocal(query, limit);
  if (localResults.length > 0) return localResults;

  // Fallback: chamar Edge Function que consulta API-Football
  try {
    const { data, error } = await supabase.functions.invoke("search-clubs", {
      body: { query },
    });

    if (error || !Array.isArray(data)) return [];

    return data.slice(0, limit).map((item: any) => ({
      id: item.id || String(item.api_id || ""),
      name: item.name,
      shortName: item.shortName || item.name,
      location: [item.city, item.country].filter(Boolean).join(", "),
      logo: item.logo || "",
      city: item.city || "",
      state: "",
      country: item.country || "",
      mascote: "",
      source: "api" as const,
    }));
  } catch (err) {
    console.error("API-Football fallback failed:", err);
    return [];
  }
}
