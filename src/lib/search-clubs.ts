/**
 * ARQUIVO: src/lib/search-clubs.ts
 * [CAMINHO]: src/lib/search-clubs.ts
 * CONTEXTO: Compatibilidade de nomes para evitar erro de build no Voting.tsx
 * STATUS: Motor Híbrido com Export Duplo
 */

import { supabase } from "@/integrations/supabase/client";
import { CLUBS_DATA } from "@/clubes-data";

/** [MANTIDO PARA COMPATIBILIDADE]: Busca apenas local */
export function searchClubsLocal(query: string) {
  if (!query || query.length < 2) return [];
  const normalized = query.toLowerCase().trim();
  return CLUBS_DATA.filter((c) => c.nome.toLowerCase().includes(normalized)).map((c) => ({
    name: c.nome,
    logo: c.logoUrl,
    source: "local" as const,
  }));
}

/** [MOTOR PRINCIPAL]: Busca Local -> API-Football */
export async function searchClubsWithFallback(query: string) {
  const local = searchClubsLocal(query);
  if (local.length > 0) return local;

  try {
    const { data, error } = await supabase.functions.invoke("enrich-club-colors", {
      body: { club_name: query },
    });

    if (error || !data?.success) return [];

    return [
      {
        name: data.club,
        logo: data.data?.[0]?.logo || data.data?.[0]?.escudo_url || "",
        source: "api" as const,
      },
    ];
  } catch (err) {
    return [];
  }
}

/**
 * [RODAPÉ TÉCNICO]
 * ARQUIVO: src/lib/search-clubs.ts
 * DECISÃO: Re-export de searchClubsLocal para corrigir erro de import no Voting.tsx.
 * PRÓXIMO PASSO: git push origin main --force.
 */
