/**
 * [CAMINHO/ARQUIVO]: src/hooks/useClubTheme.ts
 * Hook que busca cores do clube no Supabase e gera tema dinâmico.
 * Fallback: teamColors.ts (lista estática) → defaultTeamTheme (laranja).
 */

/* [MÓDULO: IMPORTS] */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { type TeamTheme, defaultTeamTheme, teamColors, hexToTeamTheme } from "@/data/teamColors";

/* Tema fallback "Chumbo" enquanto enriquecimento não retornou cores reais */
const chumboTheme: TeamTheme = hexToTeamTheme("#111111", "#2a2a2a");

/* [MÓDULO: CACHE EM MEMÓRIA] */
const themeCache = new Map<string, TeamTheme>();

/* [MÓDULO: HOOK PRINCIPAL] */
export function useClubTheme(clubName: string | null | undefined): TeamTheme {
  const [theme, setTheme] = useState<TeamTheme>(() => {
    if (!clubName) return defaultTeamTheme;
    if (themeCache.has(clubName)) return themeCache.get(clubName)!;
    // Fallback imediato à lista estática; senão tema chumbo (sem orange acidental)
    return teamColors[clubName] ?? chumboTheme;
  });

  useEffect(() => {
    if (!clubName) {
      setTheme(defaultTeamTheme);
      return;
    }

    // Se já está no cache em memória, usa direto
    if (themeCache.has(clubName)) {
      setTheme(themeCache.get(clubName)!);
      return;
    }

    // Fallback imediato à lista estática
    const staticTheme = teamColors[clubName];
    if (staticTheme) {
      setTheme(staticTheme);
    }

    // Busca no banco de dados (club_colors primeiro, depois clubes_cache)
    const fetchFromDB = async () => {
      // 1. Tenta club_colors
      const { data: colorData } = await supabase
        .from("club_colors")
        .select("primary_color, secondary_color, accent_color")
        .eq("club_name", clubName)
        .maybeSingle();

      if (colorData?.primary_color) {
        const dbTheme = hexToTeamTheme(
          colorData.primary_color,
          colorData.secondary_color || "#ffffff"
        );
        themeCache.set(clubName, dbTheme);
        setTheme(dbTheme);
        return;
      }

      // 2. Tenta clubes_cache
      const { data: cacheData } = await supabase
        .from("clubes_cache")
        .select("cor_primaria, cor_secundaria")
        .eq("nome", clubName)
        .maybeSingle();

      if (cacheData?.cor_primaria) {
        const dbTheme = hexToTeamTheme(
          cacheData.cor_primaria,
          cacheData.cor_secundaria || "#ffffff"
        );
        themeCache.set(clubName, dbTheme);
        setTheme(dbTheme);
        return;
      }

      // 3. Se não encontrou no banco, tenta enriquecer via edge function
      if (!staticTheme) {
        try {
          await supabase.functions.invoke("enrich-club-colors", {
            body: { club_name: clubName },
          });
          // Refaz a busca após enriquecimento
          const { data: enriched } = await supabase
            .from("club_colors")
            .select("primary_color, secondary_color")
            .eq("club_name", clubName)
            .maybeSingle();

          if (enriched?.primary_color) {
            const enrichedTheme = hexToTeamTheme(
              enriched.primary_color,
              enriched.secondary_color || "#ffffff"
            );
            themeCache.set(clubName, enrichedTheme);
            setTheme(enrichedTheme);
          }
        } catch {
          // Silenciosamente falha — mantém fallback
        }
      }

      // Se tem tema estático, salva no cache
      if (staticTheme) {
        themeCache.set(clubName, staticTheme);
      }
    };

    fetchFromDB();
  }, [clubName]);

  return theme;
}
