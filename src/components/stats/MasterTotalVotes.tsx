/**
 * [CAMINHO]: src/components/stats/MasterTotalVotes.tsx
 * [MÓDULO]: Total de votos do Heart Club (todos os clubes e lugares), no topo do cartão do Ranking.
 * SÓ o dono (betoborelli9@gmail.com) vê. Para os outros torcedores não aparece nada e nada é pedido ao banco;
 * e o próprio banco (função master_total_votos) só responde para esse e-mail.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { isMasterEmail } from "@/lib/master";

export function MasterTotalVotes() {
  const { user } = useUser();
  const isMaster = isMasterEmail(user?.email);
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    if (!isMaster) {
      setTotal(null);
      return;
    }
    let off = false;
    (async () => {
      try {
        const { data, error } = await (supabase as any).rpc("master_total_votos");
        if (!off && !error && typeof data === "number") setTotal(data);
      } catch {
        /* sem o número: o resto da página continua */
      }
    })();
    return () => {
      off = true;
    };
  }, [isMaster]);

  if (!isMaster || total === null) return null;
  return (
    <div className="mb-3 flex items-end justify-between gap-3 border-b border-primary/20 pb-3" data-testid="master-total-votes">
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase italic tracking-widest text-white/60">Total de votos no Heart Club</p>
        <p className="text-[9px] text-white/40">Todos os clubes e lugares · só você vê</p>
      </div>
      <p className="shrink-0 text-4xl font-black italic leading-none text-primary">{total.toLocaleString("pt-BR")}</p>
    </div>
  );
}
