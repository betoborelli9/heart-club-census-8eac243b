/**
 * ARQUIVO: src/lib/search-clubs.ts
 * [CAMINHO]: src/lib/search-clubs.ts
 * CONTEXTO: Hierarquia Blindada (Supabase -> API -> IA)
 * AUTOR: Gemini (Especialista Sênior)
 */

import { supabase } from "@/integrations/supabase/client";

export interface ClubSearchResult {
  id: string;
  api_id?: number;
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
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Mantém compatibilidade com imports existentes */
export async function searchClubsLocal(query: string, limit = 10): Promise<ClubSearchResult[]> {
  return searchClubsWithFallback(query, limit);
}

/** Busca principal: Camada 1 (Supabase) → Camada 2 (Edge Function/API) → Camada 3 (IA) */
export async function searchClubsWithFallback(query: string, limit = 10): Promise<ClubSearchResult[]> {
  if (!query || query.trim().length < 3) return [];

  const normalizedQuery = normalize(query.trim());

  try {
    // 1. CAMADA SUPABASE (Cache Local)
    const { data: dbClubs, error: dbError } = await supabase.from("clubes_cache").select("*");

    if (!dbError && dbClubs && dbClubs.length > 0) {
      const filtered = dbClubs
        .filter(
          (c) => normalize(c.nome).includes(normalizedQuery) || normalize(c.cidade || "").includes(normalizedQuery),
        )
        .slice(0, limit);

      if (filtered.length > 0) {
        return filtered.map((c) => ({
          id: String(c.id),
          api_id: c.api_id,
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

    // 2. CAMADA API FOOTBALL (Via Edge Function para evitar bloqueio de rede/CORS)
    const { data: efData, error: efError } = await supabase.functions.invoke("search-clubs", {
      body: { query: query.trim() },
    });

    if (!efError && efData) {
      const results = Array.isArray(efData) ? efData : efData.response || [];
      if (results.length > 0) {
        return results.slice(0, limit).map((item: any) => ({
          id: String(item.api_id || item.team?.id || Date.now()),
          api_id: item.api_id || item.team?.id,
          name: item.name || item.team?.name,
          shortName: item.shortName || item.team?.code || (item.name || "").substring(0, 3).toUpperCase(),
          location: `${item.city || item.venue?.city || ""}, ${item.country || item.team?.country || ""}`,
          logo: item.logo || item.team?.logo || "",
          city: item.city || item.venue?.city || "",
          state: item.state || "",
          country: item.country || item.team?.country || "",
          source: "api" as const,
        }));
      }
    }

    // 3. CAMADA IA (Fallback Final se nada for encontrado)
    const { data: aiData } = await supabase.functions.invoke("enrich-club-colors", {
      body: { club_name: query.trim() },
    });

    if (aiData?.success && aiData.data) {
      const club = aiData.data[0] || aiData.data;
      return [
        {
          id: String(club.api_id || Date.now()),
          api_id: club.api_id,
          name: aiData.club || club.nome || query,
          shortName: (aiData.club || query).substring(0, 3).toUpperCase(),
          location: `${club.cidade || ""}, ${club.pais || ""}`,
          logo: club.escudo_url || "",
          city: club.cidade || "",
          state: "",
          country: club.pais || "",
          source: "api" as const,
        },
      ];
    }

    return [];
  } catch (err) {
    console.error("[Search Engine] Erro crítico na hierarquia:", err);
    return [];
  }
}

/**
 * [RODAPÉ TÉCNICO]
 * Versão: 22.0 - Hierarquia Completa (Local -> Edge API -> IA).
 * Fix: Removido fetch direto do client para evitar bloqueios de CORS.
 */
