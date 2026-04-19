/**
 * ARQUIVO: src/lib/search-clubs.ts
 * [CAMINHO]: src/lib/search-clubs.ts
 * CONTEXTO: Restauração de Normalização NFD + Fix Emblemas
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

/** * NORMALIZAÇÃO OBRIGATÓRIA: Remove acentos para busca
 */
function normalizeString(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export async function searchClubsLocal(query: string, limit = 10): Promise<ClubSearchResult[]> {
  return searchClubsWithFallback(query, limit);
}

export async function searchClubsWithFallback(query: string, limit = 10): Promise<ClubSearchResult[]> {
  const searchTerm = query?.trim();
  if (!searchTerm || searchTerm.length < 3) return [];

  // Prepara a query normalizada para o Supabase
  const normalizedQuery = normalizeString(searchTerm);

  try {
    // 1. CAMADA LOCAL: Busca no Supabase (usando ilike que ignora case, mas normalizamos o termo)
    // Implementação de normalização NFD na busca para ignorar acentos
    const { data: localData } = await supabase
      .from("clubes_cache")
      .select("*")
      .or(`nome.ilike.%${searchTerm}%,nome.ilike.%${normalizedQuery}%`)
      .limit(limit);

    if (localData && localData.length > 0) {
      return localData.map((c) => ({
        id: String(c.api_id || c.id),
        name: c.nome,
        shortName: c.nome_curto || c.nome,
        location: `${c.cidade || ""}, ${c.pais || ""}`,
        // FIX EMBLEMAS: Priorizando escudo_url conforme solicitado
        logo: c.escudo_url || c.escudo || c.logo || "",
        city: c.cidade || "",
        state: c.estado || "",
        country: c.pais || "",
        source: "local",
      }));
    }

    // 2. CAMADA EXTERNA: Edge Function
    const { data, error } = await supabase.functions.invoke("search-clubs", {
      body: { query: searchTerm, limit },
    });

    if (!error && data && data.length > 0) {
      return data.map((item: any) => ({
        id: String(item.api_id || item.id),
        name: item.name || item.nome,
        shortName: item.shortName || item.nome_curto || item.name,
        location: `${item.city || item.cidade || ""}, ${item.country || item.pais || ""}`,
        // FIX EMBLEMAS: Mapeamento forçado para garantir o campo logo
        logo: item.escudo_url || item.escudo || item.logo || "",
        city: item.city || item.cidade || "",
        state: "",
        country: item.country || item.pais || "",
        source: item.source || "api",
      }));
    }

    throw new Error("API_FALLBACK");
  } catch (err) {
    // 3. CAMADA DE IA
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
          // FIX EMBLEMAS: Mapeamento forçado para garantir o campo logo
          logo: club.escudo_url || club.escudo || club.logo || "",
          city: club.cidade || "",
          state: "",
          country: club.pais || "",
          source: "api",
        }));
      }
    } catch (aiErr) {
      console.error("Erro na IA:", aiErr);
    }
    return [];
  }
}

/**
 * [RODAPÉ TÉCNICO]
 * Versão: 27.1 - Normalização NFD aplicada e mapeamento de logos corrigido.
 */
