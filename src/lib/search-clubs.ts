/**
 * ARQUIVO: src/lib/search-clubs.ts
 * [CAMINHO]: src/lib/search-clubs.ts
 * CONTEXTO: Unificação de Busca (Local -> IA/API Football -> Cache)
 * STATUS: FIX BUILD LOVABLE + TYPESAFE
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
  cor_primaria?: string;
  cor_secundaria?: string;
  cor_terciaria?: string;
}

function normalizeString(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function resolveLogoUrl(url?: string | null): string {
  const sanitizedUrl = url?.trim() || "";
  if (!sanitizedUrl) return "";
  if (sanitizedUrl.includes("api-sports.io")) return sanitizedUrl;

  if (/^https?:\/\/(upload|commons)\.wikimedia\.org\//i.test(sanitizedUrl)) {
    const decodedUrl = decodeURIComponent(sanitizedUrl);
    const thumbMatch = decodedUrl.match(/\/thumb\/[^/]+\/([^/]+\.(?:svg|png|jpg|jpeg|webp))\/\d+px-[^/?#]+(?:\?.*)?$/i);
    const directMatch = decodedUrl.match(/\/([^/?#]+\.(?:svg|png|jpg|jpeg|webp))(?:\?.*)?$/i);
    const rawFilename = thumbMatch?.[1] || directMatch?.[1]?.replace(/^\d+px-/, "");

    if (rawFilename) {
      return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(rawFilename)}`;
    }
  }
  return sanitizedUrl;
}

export async function searchClubsWithFallback(query: string, limit = 10): Promise<ClubSearchResult[]> {
  const searchTerm = query?.trim();
  if (!searchTerm || searchTerm.length < 3) return [];

  const normalizedQuery = normalizeString(searchTerm);

  try {
    // 1. CAMADA LOCAL: Busca o que já foi "cacheado" ou enriquecido
    const { data: localData } = await supabase
      .from("clubes_cache")
      .select("*")
      .or(`nome.ilike.%${searchTerm}%,nome.ilike.%${normalizedQuery}%`)
      .limit(limit);

    if (localData && localData.length > 0) {
      return localData.map((c: any) => ({
        id: String(c.api_id || c.id),
        name: c.nome,
        shortName: c.nome_curto || c.nome,
        location: `${c.cidade || ""}, ${c.pais || ""}`,
        logo: resolveLogoUrl(c.escudo_url || c.escudo || c.logo),
        city: c.cidade || "",
        state: c.estado || "",
        country: c.pais || "",
        mascote: c.mascote || undefined,
        cor_primaria: c.cor_primaria,
        cor_secundaria: c.cor_secundaria,
        source: "local",
      }));
    }

    // 2. CAMADA DE INTELIGÊNCIA: Se não está no banco, chama a função 'enrich-club-colors'
    const { data, error } = await supabase.functions.invoke("enrich-club-colors", {
      body: { club_name: searchTerm },
    });

    if (!error && data?.success && data.club) {
      const c = data.club;
      return [
        {
          id: String(c.api_id || c.id),
          name: c.nome,
          shortName: c.nome_curto || c.nome,
          location: `${c.cidade || ""}, ${c.pais || ""}`,
          logo: resolveLogoUrl(c.escudo_url || c.escudo || c.logo),
          city: c.cidade || "",
          state: "",
          country: c.pais || "",
          mascote: c.mascote || undefined,
          cor_primaria: c.cor_primaria,
          cor_secundaria: c.cor_secundaria,
          source: "api",
        },
      ];
    }

    return [];
  } catch (err) {
    console.error("Erro no motor de busca Heart Club:", err);
    return [];
  }
}

// Alias para manter compatibilidade com componentes que chamam searchClubsLocal
export const searchClubsLocal = searchClubsWithFallback;

/**
 * [RODAPÉ TÉCNICO]
 * Versão: 38.0 - Correção de Build Lovable (Module Path Fix).
 * [ESTRATÉGIA]: Sincronia Local -> Edge Function (Gemini + API Football).
 * [FIX]: Removidas dependências de scripts de importação que causavam erro de build.
 * AUTOR: Gemini (Especialista Sênior)
 */