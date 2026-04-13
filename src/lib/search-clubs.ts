/**
 * ARQUIVO: src/lib/search-clubs.ts
 * [CAMINHO]: src/lib/search-clubs.ts
 * CONTEXTO: Busca Híbrida — Cache Local + Edge Function (search-clubs)
 * AUTOR: Gemini (Especialista Sênior)
 */

import { supabase } from "@/integrations/supabase/client";

export interface ClubSearchResult {
  id: string;
  name: string;
  shortName: string;
  location: string;
  logo: string;
  escudo_url: string;
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

/** FUNÇÃO RESTAURADA PARA EVITAR ERRO DE IMPORT NO DASHBOARD */
export async function searchClubsLocal(query: string, limit = 10): Promise<ClubSearchResult[]> {
  return searchClubsWithFallback(query, limit);
}

/** Busca principal: 1) clubes_cache local → 2) Edge Function search-clubs */
export async function searchClubsWithFallback(query: string, limit = 10): Promise<ClubSearchResult[]> {
  if (!query || query.length < 3) return [];

  try {
    // ── CAMADA 1: BUSCA LOCAL (clubes_cache) com normalização NFD ──
    const { data: dbClubs, error: dbError } = await supabase.from("clubes_cache").select("*");

    if (!dbError && dbClubs && dbClubs.length > 0) {
      const normalizedQuery = normalize(query);
      const filtered = dbClubs
        .filter(
          (c) =>
            normalize(c.nome).includes(normalizedQuery) ||
            normalize(c.cidade || "").includes(normalizedQuery),
        )
        .slice(0, limit);

      if (filtered.length > 0) {
        return filtered.map((c) => {
          const logo = c.escudo_url || "";
          return {
            id: String(c.id),
            name: c.nome,
            shortName: c.nome_curto || c.nome,
            location: `${c.cidade || ""}, ${c.pais || ""}`,
            logo,
            escudo_url: logo,
            city: c.cidade || "",
            state: "",
            country: c.pais || "",
            mascote: c.mascote || "",
            source: "local" as const,
          };
        });
      }
    }

    // ── CAMADA 2: EDGE FUNCTION search-clubs (API Football no backend) ──
    console.log("[Search] Cache vazio, chamando Edge Function search-clubs:", query);
    const { data: efData, error: efError } = await supabase.functions.invoke("search-clubs", {
      body: { query: query.trim() },
    });

    if (efError) {
      console.error("[Search] Edge Function error:", {
        message: efError.message,
        name: efError.name,
        context: efError.context,
      });
    } else {
      const results = Array.isArray(efData)
        ? efData
        : Array.isArray((efData as any)?.data)
          ? (efData as any).data
          : [];

      if (results.length > 0) {
        return results.slice(0, limit).map((item: any, index: number) => {
          const logo = item.logo || item.escudo_url || "";
          const clubName = item.name || item.nome || query;
          const shortName = item.shortName || item.nome_curto || clubName.substring(0, 3).toUpperCase();
          return {
            id: String(item.api_id || item.id || `${clubName}-${index}`),
            name: clubName,
            shortName,
            location: `${item.city || item.cidade || ""}, ${item.country || item.pais || ""}`,
            logo,
            escudo_url: logo,
            city: item.city || item.cidade || "",
            state: item.state || item.estado || "",
            country: item.country || item.pais || "",
            mascote: item.mascote || "",
            source: (item.source as "local" | "api") || "api",
          };
        });
      }
    }

    // ── CAMADA 3: FALLBACK IA (enrich-club-colors) ──
    const { data: aiData } = await supabase.functions.invoke("enrich-club-colors", {
      body: { club_name: query },
    });

    if (aiData && aiData.success) {
      const logo = aiData.data?.[0]?.escudo_url || "";
      return [
        {
          id: String(aiData.data?.[0]?.api_id || Date.now()),
          name: aiData.club || query,
          shortName: (aiData.club || query).substring(0, 3).toUpperCase(),
          location: `${aiData.data?.[0]?.cidade || ""}, ${aiData.data?.[0]?.pais || ""}`,
          logo,
          escudo_url: logo,
          city: aiData.data?.[0]?.cidade || "",
          state: "",
          country: aiData.data?.[0]?.pais || "",
          mascote: aiData.data?.[0]?.mascote || "",
          source: "api" as const,
        },
      ];
    }

    return [];
  } catch (err) {
    console.error("[Search Engine] Erro crítico:", err);
    return [];
  }
}

/**
 * [RODAPÉ TÉCNICO]
 * Versão: 16.0 - Hierarquia: Cache Local → Edge Function → IA
 * Normalização NFD client-side. Sem chamada direta à API Football no front.
 */
