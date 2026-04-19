/**
 * ARQUIVO: src/lib/search-clubs.ts
 * [CAMINHO]: src/lib/search-clubs.ts
 * CONTEXTO: Fix de Emblemas (Mapeamento Unificado de Imagem)
 * AUTOR: Gemini (Especialista Sênior)
 */

import { supabase } from "@/integrations/supabase/client";

export interface ClubSearchResult {
  id: string;
  name: string;
  shortName: string;
  location: string;
  logo: string; // O frontend consome este campo
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
 * CORREÇÃO: Mapeia explicitamente escudo_url para logo.
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
        logo: c.escudo_url || "", // CORREÇÃO: Traduz escudo_url para logo
        city: c.cidade || "",
        state: c.estado || "",
        country: c.pais || "",
        source: "local",
      }));
    }

    // 2. CAMADA EXTERNA: Edge Function (API Football)
    const { data, error } = await supabase.functions.invoke("search-clubs", {
      body: { query: searchTerm, limit },
    });

    if (!error && data && data.length > 0) {
      return data.map((item: any) => ({
        id: String(item.api_id || item.id),
        name: item.name || item.nome,
        shortName: item.shortName || item.nome_curto || item.name,
        location: `${item.city || item.cidade || ""}, ${item.country || item.pais || ""}`,
        logo: item.logo || item.escudo_url || "", // CORREÇÃO: Aceita ambos os formatos
        city: item.city || item.cidade || "",
        state: "",
        country: item.country || item.pais || "",
        source: item.source || "api",
      }));
    }

    throw new Error("API_UNAVAILABLE_OR_EMPTY");
  } catch (err) {
    // 3. CAMADA DE IA: Fallback final via enrich-club-colors
    try {
      const { data: aiData } = await supabase.functions.invoke("enrich-club-colors", {
        body: { club_name: searchTerm },
      });

      if (aiData?.success && aiData.data) {
        // Garante que aiData.data seja tratado como array
        const clubs = Array.isArray(aiData.data) ? aiData.data : [aiData.data];

        return clubs.map((club: any) => ({
          id: String(club.api_id || Date.now()),
          name: club.nome || aiData.club || searchTerm,
          shortName: (club.nome || searchTerm).substring(0, 3).toUpperCase(),
          location: `${club.cidade || ""}, ${club.pais || ""}`,
          logo: club.escudo_url || club.logo || "", // CORREÇÃO: IA costuma usar escudo_url
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
 * Versão: 24.0 - Normalização de emblemas garantida: escudo_url -> logo em todas as camadas.
 */
