/**
 * ARQUIVO: src/lib/search-clubs.ts
 * [CAMINHO]: src/lib/search-clubs.ts
 * CONTEXTO: Sistema de Busca Híbrida - Local (Mestre) + Fallback IA (enrich-club-colors)
 * AUTOR: Gemini (Especialista Sênior)
 * DESCRIÇÃO: Este motor gerencia a busca de clubes priorizando o dataset local. 
 * Caso não encontre resultados, aciona a Edge Function investigadora para buscar dados na rede.
 */

import { CLUBS_DATA } from "@/clubes-data";
import { supabase } from "@/integrations/supabase/client";

/* ═══════════════════════════════════════════════════════════
    MÓDULO: UTILITÁRIOS DE TRATAMENTO DE TEXTO
   ═══════════════════════════════════════════════════════════ */

/** Normaliza strings removendo acentos para busca insensível */
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

/* ═══════════════════════════════════════════════════════════
    MÓDULO: BUSCA LOCAL (DATASET MASTER)
   ═══════════════════════════════════════════════════════════ */

/** Realiza busca síncrona no arquivo clubes-data.ts */
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

/* ═══════════════════════════════════════════════════════════
    MÓDULO: BUSCA COM FALLBACK (IA / EDGE FUNCTION)
   ═══════════════════════════════════════════════════════════ */

/** * Tenta busca local; se falhar, invoca a Edge Function 'enrich-club-colors' 
 * para investigar dados externos (IA Investigadora).
 */
export async function searchClubsWithFallback(
  query: string,
  limit = 10
): Promise<ClubSearchResult[]> {
  const localResults = searchClubsLocal(query, limit);
  
  // Se encontrou localmente, retorna imediatamente para evitar latência de rede
  if (localResults.length > 0) return localResults;

  // Fallback: Chamar a Edge Function investigadora
  try {
    const { data, error } = await supabase.functions.invoke("enrich-club-colors", {
      body: { club_name: query },
    });

    if (error || !data || !data.success) {
      console.warn(`[Search Fallback] Nenhum dado encontrado para: ${query}`);
      return [];
    }

    // Mapeia o retorno da Edge Function para o formato ClubSearchResult
    // Garante que o ID seja único e os campos não venham nulos para não travar a UI
    return [{
      id: String(data.data?.[0]?.api_id || Date.now()),
      name: data.club || query,
      shortName: (data.club || query).substring(0, 3).toUpperCase(),
      location: data.data?.[0]?.pais ? `${data.data?.[0]?.cidade || '---'}, ${data.data?.[0]?.pais}` : "Busca Internacional",
      logo: data.data?.[0]?.escudo_url || "",
      city: data.data?.[0]?.cidade || "",
      state: "",
      country: data.data?.[0]?.pais || "",
      mascote: data.data?.[0]?.mascote || "",
      source: "api" as const,
    }];
  } catch (err) {
    console.error("[Search Fallback] Erro crítico na invocação da Edge Function:", err);
    return [];
  }
}

/* ═══════════════════════════════════════════════════════════
    [RODAPÉ TÉCNICO]
    Sincronização: Chamada para 'enrich-club-colors' restaurada.
    Versão: 7.0 - Blindagem contra retornos nulos da IA.
   ═══════════════════════════════════════════════════════════ */