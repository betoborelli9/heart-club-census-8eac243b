/**
 * ARQUIVO: src/lib/search-clubs.ts
 * [CAMINHO]: src/lib/search-clubs.ts
 * CONTEXTO: Conexão Front-end -> Edge Function (API-Football)
 * STATUS: Motor de Busca Híbrida Ativado
 */

import { supabase } from "@/integrations/supabase/client";
import { CLUBS_DATA } from "@/clubes-data";

export async function searchClubsWithFallback(query: string) {
  if (!query || query.length < 3) return [];

  // 1. Busca na lista local (Rápida)
  const normalizedQuery = query.toLowerCase().trim();
  const localMatches = CLUBS_DATA.filter((c) => c.nome.toLowerCase().includes(normalizedQuery)).map((c) => ({
    name: c.nome,
    logo: c.logoUrl,
    source: "local" as const,
  }));

  if (localMatches.length > 0) return localMatches;

  // 2. Fallback para API-Football (O que fará o gráfico subir)
  try {
    console.log("Acionando API-Football para:", query);

    const { data, error } = await supabase.functions.invoke("enrich-club-colors", {
      body: { club_name: query },
    });

    if (error || !data?.success) {
      console.error("Erro na Edge Function:", error);
      return [];
    }

    // Retorna o clube injetado pela API
    return [
      {
        name: data.club,
        logo: data.data?.[0]?.logo || data.data?.[0]?.escudo_url || "",
        source: "api" as const,
      },
    ];
  } catch (err) {
    console.error("Falha crítica na busca externa:", err);
    return [];
  }
}

/**
 * [RODAPÉ TÉCNICO]
 * ARQUIVO: src/lib/search-clubs.ts
 * PROJETO: Heart Club (C:\Users\betob\Desktop\GitHub\heart-club)
 * DECISÃO: Substituição da busca estática por invoke direto da Edge Function.
 * PRÓXIMO PASSO: git push origin main --force e teste do Ibis.
 */
