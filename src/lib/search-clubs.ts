/**
 * ARQUIVO: src/lib/search-clubs.ts
 * [CAMINHO]: src/lib/search-clubs.ts
 * CONTEXTO: Fix de Emblemas (Mapeamento da coluna 'escudo')
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
  source: "local" | "api";
}

/** Mantida para compatibilidade de build em outros módulos */
export async function searchClubsLocal(query: string, limit = 10): Promise<ClubSearchResult[]> {
  return searchClubsWithFallback(query, limit);
}

/** * Busca principal com tripla camada de redundância.
 * CORREÇÃO CRÍTICA: Mapeia a coluna 'escudo' do banco para o campo 'logo'.
 */
export async function searchClubsWithFallback(query: string, limit = 10): Promise<ClubSearchResult[]> {
  const searchTerm = query?.trim();
  if (!searchTerm || searchTerm.length < 3) return [];

  try {
    // 1. CAMADA LOCAL: Busca no Supabase (clubes_cache)
    const { data: localData } = await supabase
      .from("clubes_cache")
      .select("*")
      .ilike("nome", `%${searchTerm}%`)
      .limit(limit);

    if (localData && localData.length > 0) {
      return localData.map((c) => ({
        id: String(c.api_id || c.id),
        name: c.nome,
        shortName: c.nome_curto || c.nome,
        location: `${c.cidade || ""}, ${c.pais || ""}`,
        logo: c.escudo || c.escudo_url || "", // MAPEIA COLUNA 'escudo' DO PRINT
        city: c.cidade || "",
        state: c.estado || "",
        country: c.pais || "",
        source: "local",
      }));
    }

    // 2. CAMADA EXTERNA: Chamada à Edge Function (API Football)
    const { data, error } = await supabase.functions.invoke("search-clubs", {
      body: { query: searchTerm, limit },
    });

    if (!error && data && data.length > 0) {
      return data.map((item: any) => ({
        id: String(item.api_id || item.id),
        name: item.name || item.nome,
        shortName: item.shortName || item.nome_curto || item.name,
        location: `${item.city || item.cidade || ""}, ${item.country || item.pais || ""}`,
        logo: item.logo || item.escudo || item.escudo_url || "", // MAPEIA POSSÍVEIS RETORNOS
        city: item.city || item.cidade || "",
        state: "",
        country: item.country || item.pais || "",
        source: item.source || "api",
      }));
    }

    throw new Error("API_UNAVAILABLE");
  } catch (err) {
    // 3. CAMADA DE IA: Fallback final via enrich-club-colors
    try {
      const { data: aiData } = await supabase.functions.invoke("enrich-club-colors", {
        body: { club_name: searchTerm },
      });

      if (aiData?.success && aiData.data) {
        const clubs = Array.isArray(aiData.data) ? aiData.data : [aiData.data];
        return clubs.map((club: any) => ({
          id: String(club.api_id || Date.now()),
          name: club.nome || aiData.club || searchTerm,
          shortName: (club.nome || searchTerm).substring(0, 3).toUpperCase(),
          location: `${club.cidade || ""}, ${club.pais || ""}`,
          logo: club.escudo || club.escudo_url || club.logo || "",
          city: club.cidade || "",
          state: "",
          country: club.pais || "",
          source: "api",
        }));
      }
    } catch (aiErr) {
      console.error("[IA ERROR]: Falha no enriquecimento via IA", aiErr);
    }

    return [];
  }
}

/**
 * [RODAPÉ TÉCNICO]
 * Versão: 25.0 - Ajustado para ler coluna 'escudo' conforme estrutura do banco.
 */
