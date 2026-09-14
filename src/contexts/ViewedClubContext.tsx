/**
 * [CAMINHO]: src/contexts/ViewedClubContext.tsx
 * [MÓDULO]: Clube "em exibição" compartilhado entre páginas.
 *
 * Quando o torcedor pesquisa outro clube (no Dashboard, no Ranking ou no Mapa
 * de Calor), esse clube passa a valer em TODAS as páginas — não só na página
 * onde ele pesquisou — até ele voltar pro próprio time do coração. Antes,
 * cada página guardava esse estado sozinha (resetava ao trocar de página).
 */
import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";

interface ViewedClubContextType {
  /** Nome do time do coração de verdade do torcedor (o que ele votou). */
  heartClubName: string | null;
  /** Nome do clube sendo exibido nas páginas agora — pode ser o próprio ou outro pesquisado. */
  viewedClubName: string | null;
  /** Troca o clube em exibição (chamado ao selecionar um resultado de busca). */
  setViewedClubName: (name: string | null) => void;
  /** true quando o torcedor está vendo o próprio time do coração. */
  isViewingHeart: boolean;
  /** Volta a exibir o próprio time do coração em todas as páginas. */
  resetToHeart: () => void;
  /**
   * true assim que a primeira tentativa de descobrir o time do coração
   * termina (encontrando ou não) — permite páginas como o Mapa de Calor
   * diferenciarem "ainda não sei o clube" (não mostrar nada de errado
   * enquanto isso) de "não tem clube pesquisado mesmo, é intencional".
   */
  ready: boolean;
}

const ViewedClubContext = createContext<ViewedClubContextType | null>(null);

export function ViewedClubProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const [heartClubName, setHeartClubName] = useState<string | null>(null);
  const [viewedClubName, setViewedClubNameState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadHeartClub = async () => {
      if (!user) {
        setHeartClubName(null);
        setReady(true);
        return;
      }
      const { data } = await supabase
        .from("votos")
        .select("clube_nome")
        .eq("user_id", user.id)
        .eq("is_original_vote", true)
        .maybeSingle();
      if (cancelled) return;
      if (data?.clube_nome) {
        setHeartClubName(data.clube_nome);
        // Só define o clube em exibição pro time do coração automaticamente
        // se o torcedor ainda não estiver vendo nenhum outro clube pesquisado.
        setViewedClubNameState((prev) => prev ?? data.clube_nome);
      }
      setReady(true);
    };
    loadHeartClub();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const setViewedClubName = (name: string | null) => setViewedClubNameState(name);
  const resetToHeart = () => setViewedClubNameState(heartClubName);

  const value = useMemo(
    () => ({
      heartClubName,
      viewedClubName,
      setViewedClubName,
      isViewingHeart: viewedClubName === heartClubName,
      resetToHeart,
      ready,
    }),
    [heartClubName, viewedClubName, ready],
  );

  return <ViewedClubContext.Provider value={value}>{children}</ViewedClubContext.Provider>;
}

export function useViewedClub(): ViewedClubContextType {
  const ctx = useContext(ViewedClubContext);
  if (!ctx) throw new Error("useViewedClub deve ser usado dentro de um ViewedClubProvider");
  return ctx;
}
