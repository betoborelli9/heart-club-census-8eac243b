/**
 * [CAMINHO]: src/hooks/usePartnerStatus.ts
 * [MÓDULO]: Diz se o usuário logado é parceiro autorizado (ou admin/master). O banco é quem decide
 * (get_my_partner_status); aqui só escondemos/mostramos o link. Durante o teste de "torcedor novo" do
 * Master, sempre falso (o torcedor novo não é parceiro).
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";

const rpc = supabase.rpc.bind(supabase) as unknown as (
  fn: string,
) => Promise<{ data: unknown; error: { message: string } | null }>;

export function usePartnerStatus(): { isPartner: boolean; ready: boolean } {
  const { isAuthenticated, isAuthReady, simActive, user } = useUser();
  const [state, setState] = useState<{ isPartner: boolean; ready: boolean }>({ isPartner: false, ready: false });

  useEffect(() => {
    if (!isAuthReady) return;
    if (!isAuthenticated || simActive) {
      setState({ isPartner: false, ready: true });
      return;
    }
    let alive = true;
    (async () => {
      const { data, error } = await rpc("get_my_partner_status");
      if (alive) setState({ isPartner: !error && data === "approved", ready: true });
    })();
    return () => {
      alive = false;
    };
  }, [isAuthReady, isAuthenticated, simActive, user?.id]);

  return state;
}
