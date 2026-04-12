/**
 * ARQUIVO: src/lib/search-clubs.ts
 * [CAMINHO]: src/lib/search-clubs.ts
 * CONTEXTO: Busca no Supabase + Fallback API Football + IA
 * AUTOR: Gemini (Especialista Sênior)
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
}

/** Normaliza string removendo acentos para comparação fuzzy */
function normalize(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** FUNÇÃO RESTAURADA PARA EVITAR ERRO DE IMPORT NO DASHBOARD */
export async function searchClubsLocal(query: string, limit = 10): Promise<ClubSearchResult[]> {
  return searchClubsWithFallback(query, limit);
}

/** Busca principal: Supabase → API Football → IA */
export async function searchClubsWithFallback(
  query: string,
  limit = 10
): Promise<ClubSearchResult[]> {
  if (!query || query.length < 2) return [];

  try {
    // 1. BUSCA NO SUPABASE (clubes_cache)
    const { data: dbClubs, error: dbError } = await supabase
      .from("clubes_cache")
      .select("*");

    if (dbError) throw dbError;

    if (dbClubs && dbClubs.length > 0) {
      const normalizedQuery = normalize(query);
      const filtered = dbClubs
        .filter((c) =>
          normalize(c.nome).includes(normalizedQuery) ||
          normalize(c.cidade || "").includes(normalizedQuery)
        )
        .slice(0, limit);

      if (filtered.length > 0) {
        return filtered.map((c) => ({
          id: String(c.id),
          name: c.nome,
          shortName: c.nome_curto || c.nome,
          location: `${c.cidade || ""}, ${c.pais || ""}`,
          logo: c.escudo_url || "",
          city: c.cidade || "",
          state: c.estado || "",
          country: c.pais || "",
          mascote: c.mascote || "",
          source: "local" as const,
        }));
      }
    }

    // 2. FALLBACK: Chamar Edge Function que prioriza API Football
    const { data: apiData, error: apiError } = await supabase.functions.invoke("get-or-create-club", {
      body: { club_name: query },
    });

    if (apiError || !apiData || !apiData.success) {
      // Último recurso: IA direta
      const { data: aiData } = await supabase.functions.invoke("enrich-club-colors", {
        body: { club_name: query },
      });

      if (!aiData || !aiData.success) return [];

      return [{
        id: String(aiData.data?.[0]?.api_id || Date.now()),
        name: aiData.club || query,
        shortName: (aiData.club || query).substring(0, 3).toUpperCase(),
        location: `${aiData.data?.[0]?.cidade || ""}, ${aiData.data?.[0]?.pais || ""}`,
        logo: aiData.data?.[0]?.escudo_url || "",
        city: aiData.data?.[0]?.cidade || "",
        state: "",
        country: aiData.data?.[0]?.pais || "",
        mascote: aiData.data?.[0]?.mascote || "",
        source: "api" as const,
      }];
    }

    // Retorna dados da API Football (com logo confiável)
    const club = apiData.data;
    return [{
      id: String(club.id || Date.now()),
      name: club.name || query,
      shortName: (club.shortName || club.name || query).substring(0, 3).toUpperCase(),
      location: `${club.city || ""}, ${club.country || ""}`,
      logo: club.logo || "",                    // Aqui vem o logo da API Football
      city: club.city || "",
      state: club.state || "",
      country: club.country || "",
      mascote: club.mascote || "",
      source: "api" as const,
    }];

  } catch (err) {
    console.error("[Search Engine] Erro crítico na busca:", err);
    return [];
  }
}

/**
 * [RODAPÉ TÉCNICO]
 * Versão: 14.0 - Prioridade API Football no fallback (logo confiável via media.api-sports.io)
 */