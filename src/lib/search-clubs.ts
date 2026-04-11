/**
 * ARQUIVO: src/lib/search-clubs.ts
 * [CAMINHO]: src/lib/search-clubs.ts
 * CONTEXTO: Restauração de compatibilidade para evitar erro de Build (Vercel)
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

/** * FUNÇÃO RESTAURADA PARA EVITAR ERRO DE IMPORT NO DASHBOARD
 * Agora ela apenas redireciona para a busca com fallback.
 */
export async function searchClubsLocal(query: string, limit = 10): Promise<ClubSearchResult[]> {
  return searchClubsWithFallback(query, limit);
}

/** * Realiza busca na tabela 'clubes_cache' do Supabase 
 * Busca todos os registros e filtra client-side com normalização NFD
 * para garantir insensibilidade a acentos (ex: "vitoria" encontra "Vitória")
 */
export async function searchClubsWithFallback(
  query: string,
  limit = 10
): Promise<ClubSearchResult[]> {
  if (!query || query.length < 2) return [];

  try {
    // 1. BUSCA NO BANCO DE DADOS (clubes_cache) — busca ampla, filtra client-side
    const { data: dbClubs, error: dbError } = await supabase
      .from("clubes_cache")
      .select("*");

    if (dbError) throw dbError;

    if (dbClubs && dbClubs.length > 0) {
      const normalizedQuery = normalize(query);
      const filtered = dbClubs
        .filter((c) =>
          normalize(c.nome).includes(normalizedQuery) ||
          normalize(c.cidade).includes(normalizedQuery)
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
          state: "",
          country: c.pais || "",
          mascote: c.mascote || "",
          source: "local" as const,
        }));
      }
    }

    // 2. FALLBACK: Chamar a Edge Function (IA)
    const { data: aiData, error: aiError } = await supabase.functions.invoke("enrich-club-colors", {
      body: { club_name: query },
    });

    if (aiError || !aiData || !aiData.success) return [];

    return [{
      id: String(aiData.data?.[0]?.api_id || Date.now()),
      name: aiData.club || query,
      shortName: (aiData.club || query).substring(0, 3).toUpperCase(),
      location: "Busca Internacional",
      logo: aiData.data?.[0]?.escudo_url || "",
      city: aiData.data?.[0]?.cidade || "",
      state: "",
      country: aiData.data?.[0]?.pais || "",
      mascote: aiData.data?.[0]?.mascote || "",
      source: "api" as const,
    }];

  } catch (err) {
    console.error("[Search Engine] Erro na busca:", err);
    return [];
  }
}

/**
 * [RODAPÉ TÉCNICO]
 * Versão: 12.0 - Export searchClubsLocal restaurado para compatibilidade de Build.
 */