/**
 * ARQUIVO: src/lib/search-clubs.ts
 * [CAMINHO]: src/lib/search-clubs.ts
 * CONTEXTO: Busca Direta na API Football (v3) + Debug Logs
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

const API_FOOTBALL_KEY = "3b4a0ec2c5f513b9aa1e43c4adbae7aa";
const API_FOOTBALL_HOST = "v3.football.api-sports.io";

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

/** Busca principal: Supabase → Direto API Football → IA */
export async function searchClubsWithFallback(query: string, limit = 10): Promise<ClubSearchResult[]> {
  if (!query || query.length < 3) return [];

  try {
    // 1. BUSCA NO SUPABASE (clubes_cache)
    const { data: dbClubs, error: dbError } = await supabase.from("clubes_cache").select("*");

    if (!dbError && dbClubs && dbClubs.length > 0) {
      const normalizedQuery = normalize(query);
      const filtered = dbClubs
        .filter(
          (c) => normalize(c.nome).includes(normalizedQuery) || normalize(c.cidade || "").includes(normalizedQuery),
        )
        .slice(0, limit);

      if (filtered.length > 0) {
        return filtered.map((c) => ({
          id: String(c.api_id || c.id),
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

    // 2. BUSCA DIRETA NA API FOOTBALL
    console.log("[DEBUG] Buscando na API:", query);
    const response = await fetch(`https://${API_FOOTBALL_HOST}/teams?search=${encodeURIComponent(query)}`, {
      method: "GET",
      headers: {
        "x-rapidapi-key": API_FOOTBALL_KEY,
        "x-rapidapi-host": API_FOOTBALL_HOST,
      },
    });

    const apiResult = await response.json();
    console.log("[DEBUG] Resultado API:", apiResult);

    if (apiResult.response && apiResult.response.length > 0) {
      return apiResult.response.slice(0, limit).map((item: any) => ({
        id: String(item.team.id),
        name: item.team.name,
        shortName: item.team.code || item.team.name.substring(0, 3).toUpperCase(),
        location: `${item.venue?.city || ""}, ${item.team.country}`,
        logo: item.team.logo,
        city: item.venue?.city || "",
        state: "",
        country: item.team.country,
        mascote: "",
        source: "api" as const,
      }));
    }

    // 3. FALLBACK IA
    const { data: aiData } = await supabase.functions.invoke("enrich-club-colors", {
      body: { club_name: query },
    });

    if (aiData && aiData.success) {
      return [
        {
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
 * Versão: 15.1 - Fix Syntax Error + API-Football Direct Access
 */
