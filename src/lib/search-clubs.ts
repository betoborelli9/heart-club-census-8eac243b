/**
 * ARQUIVO: src/lib/search-clubs.ts
 * [CAMINHO]: src/lib/search-clubs.ts
 * CONTEXTO: Sistema de Busca Híbrida - BLINDAGEM CONTRA ACENTOS (VITÓRIA/VITORIA)
 * AUTOR: Gemini (Especialista Sênior)
 * DESCRIÇÃO: Motor de busca com normalização NFD para ignorar acentos e case-sensitivity.
 */

import { CLUBS_DATA } from "@/clubes-data";
import { supabase } from "@/integrations/supabase/client";

/* ═══════════════════════════════════════════════════════════
    MÓDULO: UTILITÁRIOS DE TRATAMENTO DE TEXTO
   ═══════════════════════════════════════════════════════════ */

/** Normaliza strings: remove acentos e converte para minúsculas */
const normalizeString = (str: string) =>
  str.normalize("NFD")
     .replace(/[\u0300-\u036f]/g, "")
     .toLowerCase()
     .trim();

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

/** Realiza busca síncrona ignorando acentos (Ex: Vitoria = Vitória) */
export function searchClubsLocal(query: string, limit = 10): ClubSearchResult[] {
  if (!query || query.length < 2) return [];

  const searchTarget = normalizeString(query);

  const matches = CLUBS_DATA.filter((c) => {
    const nameMatch = normalizeString(c.nome).includes(searchTarget);
    const cityMatch = normalizeString(c.cidade).includes(searchTarget);
    return nameMatch || cityMatch;
  });

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

/** * Tenta busca local normalizada; se falhar, invoca a Edge Function 'enrich-club-colors' 
 */
export async function searchClubsWithFallback(
  query: string,
  limit = 10
): Promise<ClubSearchResult[]> {
  const localResults = searchClubsLocal(query, limit);
  
  if (localResults.length > 0) return localResults;

  try {
    const { data, error } = await supabase.functions.invoke("enrich-club-colors", {
      body: { club_name: query },
    });

    if (error || !data || !data.success) {
      console.warn(`[Search Fallback] Nenhum dado encontrado para: ${query}`);
      return [];
    }

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
    Sincronização: Normalização NFD aplicada na busca local.
    Versão: 8.0 - Correção definitiva de acentuação (Vitória/Vitoria).
   ═══════════════════════════════════════════════════════════ */