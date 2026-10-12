/**
 * [CAMINHO]: src/hooks/useMyTeamIds.ts
 * [MÓDULO]: Ids (API-Football) dos times do torcedor: coração + simpatias. Alimenta a seção "Meus times" da aba Jogos.
 * Sem login ou sem times conhecidos: lista vazia (a aba funciona igual, sem a seção).
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { useViewedClub } from "@/contexts/ViewedClubContext";

export function useMyTeamIds(): number[] {
  const { user, profile, simActive } = useUser();
  const { heartClubName } = useViewedClub();
  const [ids, setIds] = useState<number[]>([]);

  useEffect(() => {
    let alive = true;
    if (!user || simActive) {
      setIds([]);
      return;
    }
    (async () => {
      const found = new Set<number>();
      const heartId = Number((profile as any)?.time_do_coracao_id);
      if (Number.isInteger(heartId) && heartId > 0) found.add(heartId);

      const names: string[] = heartClubName ? [heartClubName] : [];
      const { data: v } = await supabase
        .from("votos")
        .select("sympathy_1, sympathy_2, sympathy_3, sympathy_4")
        .eq("user_id", user.id)
        .eq("is_original_vote", true)
        .maybeSingle();
      if (v) names.push(...([v.sympathy_1, v.sympathy_2, v.sympathy_3, v.sympathy_4].filter(Boolean) as string[]));

      if (names.length) {
        const { data: rows } = await supabase.from("clubes_cache").select("nome, api_id").in("nome", names);
        for (const r of (rows || []) as any[]) {
          const n = Number(r.api_id);
          if (Number.isInteger(n) && n > 0) found.add(n);
        }
      }
      if (alive) setIds([...found]);
    })();
    return () => {
      alive = false;
    };
  }, [user?.id, simActive, heartClubName, (profile as any)?.time_do_coracao_id]);

  return ids;
}
