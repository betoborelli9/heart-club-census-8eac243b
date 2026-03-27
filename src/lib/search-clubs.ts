/**
 * ARQUIVO: src/lib/search-clubs.ts
 * [CAMINHO]: src/lib/search-clubs.ts
 * CONTEXTO: Ajuste de Fallback para chamar a Edge Function 'enrich-club-colors'.
 */

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

  // Fallback: Chamar a Edge Function correta (enrich-club-colors)
  try {
    const { data, error } = await supabase.functions.invoke("enrich-club-colors", {
      body: { club_name: query },
    });

    if (error || !data || !data.success) return [];

    // Mapeia o retorno da API para o formato que o seu componente espera
    return [{
      id: String(Date.now()),
      name: data.club,
      shortName: data.club.substring(0, 3).toUpperCase(),
      location: "Internacional",
      logo: data.data?.[0]?.escudo_url || "",
      city: data.data?.[0]?.cidade || "",
      state: "",
      country: data.data?.[0]?.pais || "",
      mascote: "",
      source: "api" as const,
    }];
  } catch (err) {
    console.error("API-Football fallback failed:", err);
    return [];
  }
}

/**
 * [RODAPÉ TÉCNICO]
 * Sincronização: Chamada corrigida para 'enrich-club-colors'.
 * Próximo passo: git push e teste do Íbis.
 */