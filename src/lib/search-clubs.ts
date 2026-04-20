/**
 * ARQUIVO: src/lib/search-clubs.ts
 * [CAMINHO]: src/lib/search-clubs.ts
 * CONTEXTO: Restauração de Normalização NFD + Fix Emblemas (Versão Completa)
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

/** * NORMALIZAÇÃO OBRIGATÓRIA: Remove acentos para busca
 */
function normalizeString(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function resolveLogoUrl(url?: string | null): string {
  const sanitizedUrl = url?.trim() || "";
  if (!sanitizedUrl) return "";

  if (/^https?:\/\/upload\.wikimedia\.org\//i.test(sanitizedUrl)) {
    const proxySafeUrl = sanitizedUrl.replace(/^https?:\/\//i, "");
    return `https://wsrv.nl/?url=${encodeURIComponent(proxySafeUrl)}&w=128&output=png`;
  }

  return sanitizedUrl;
}

export async function searchClubsLocal(query: string, limit = 10): Promise<ClubSearchResult[]> {
  return searchClubsWithFallback(query, limit);
}

export async function searchClubsWithFallback(query: string, limit = 10): Promise<ClubSearchResult[]> {
  const searchTerm = query?.trim();
  if (!searchTerm || searchTerm.length < 3) return [];

  const normalizedQuery = normalizeString(searchTerm);

  try {
    // 1. CAMADA LOCAL: busca TUDO em clubes_cache e filtra client-side (insensível a acentos)
    const { data: allLocal } = await supabase
      .from("clubes_cache")
      .select("id, nome, nome_curto, cidade, pais, escudo_url, mascote")
      .limit(2000);

    const filteredLocal = (allLocal || []).filter((c) =>
      normalizeString(c.nome || "").includes(normalizedQuery) ||
      normalizeString(c.nome_curto || "").includes(normalizedQuery),
    );

    if (filteredLocal.length > 0) {
      return filteredLocal.slice(0, limit).map((c) => ({
        id: String(c.id),
        name: c.nome,
        shortName: c.nome_curto || c.nome,
        location: `${c.cidade || ""}, ${c.pais || ""}`,
        logo: resolveLogoUrl(c.escudo_url),
        city: c.cidade || "",
        state: "",
        country: c.pais || "",
        mascote: c.mascote || undefined,
        source: "local",
      }));
    }

    // 2. CAMADA EXTERNA: Edge Function
    const { data, error } = await supabase.functions.invoke("search-clubs", {
      body: { query: searchTerm, limit },
    });

    const efResults = Array.isArray(data) ? data : (data as any)?.data || [];

    if (!error && efResults.length > 0) {
      return efResults.map((item: any) => ({
        id: String(item.api_id || item.id),
        name: item.name || item.nome,
        shortName: item.shortName || item.nome_curto || item.name,
        location: `${item.city || item.cidade || ""}, ${item.country || item.pais || ""}`,
        logo: resolveLogoUrl(item.escudo_url || item.escudo || item.logo || ""),
        city: item.city || item.cidade || "",
        state: "",
        country: item.country || item.pais || "",
        mascote: item.mascote || undefined,
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
          logo: resolveLogoUrl(club.escudo_url || club.escudo || club.logo || ""),
          city: club.cidade || "",
          state: "",
          country: club.pais || "",
          mascote: club.mascote || undefined,
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
 * Versão: 28.0 - Substituição integral.
 * Normalização NFD e mapeamento exaustivo de colunas de imagem (escudo_url).
 */
