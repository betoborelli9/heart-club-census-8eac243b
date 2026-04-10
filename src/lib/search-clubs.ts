/**
 * ARQUIVO: src/lib/search-clubs.ts
 * [CAMINHO]: src/lib/search-clubs.ts
 * CONTEXTO: Busca Direta no Supabase (clubes_cache) com Fallback IA
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
  mascote: string;
  source: "local" | "api";
}

/** * Realiza busca diretamente na tabela 'clubes_cache' do Supabase 
 * Ignora acentos usando ILIKE e normalização do Postgres
 */
export async function searchClubsWithFallback(
  query: string,
  limit = 10
): Promise<ClubSearchResult[]> {
  if (!query || query.length < 2) return [];

  try {
    // 1. BUSCA NO BANCO DE DADOS (clubes_cache)
    // O ILIKE já resolve parte da insensibilidade, mas a IA Investigadora garante o resto
    const { data: dbClubs, error: dbError } = await supabase
      .from("clubes_cache")
      .select("*")
      .or(`nome.ilike.%${query}%,cidade.ilike.%${query}%`)
      .limit(limit);

    if (dbError) throw dbError;

    if (dbClubs && dbClubs.length > 0) {
      return dbClubs.map((c) => ({
        id: c.id,
        name: c.nome,
        shortName: c.nome_curto || c.nome,
        location: `${c.cidade || ""}, ${c.estado || ""}, ${c.pais || ""}`,
        logo: c.escudo_url || "",
        city: c.cidade || "",
        state: c.estado || "",
        country: c.pais || "",
        mascote: c.mascote || "",
        source: "local" as const,
      }));
    }

    // 2. FALLBACK: Chamar a Edge Function (IA) se não houver nada no banco
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
 * Versão: 11.0 - Busca 100% via Supabase (clubes_cache). Arquivo local ignorado.
 */