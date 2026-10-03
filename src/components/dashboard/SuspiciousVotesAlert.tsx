/**
 * [CAMINHO]: src/components/dashboard/SuspiciousVotesAlert.tsx
 * [MÓDULO]: Alerta VERMELHO PISCANTE com os votos que o sistema de segurança
 * marcou como suspeitos (mesmo IP, mesmo aparelho, mesmo clube na mesma rede
 * etc.) e que aguardam a decisão do Beto: AUTORIZAR ou REMOVER.
 *
 * Só o Master vê (renderizado só pra ele no Dashboard). Zero votos pendentes
 * = não aparece nada. Se a leitura falhar, avisa (nunca some em silêncio).
 */
import { useCallback, useEffect, useState } from "react";
import { AlertOctagon, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Pending = {
  voto_id: string;
  nome: string;
  email: string | null;
  clube_nome: string | null;
  motivo: string;
  votou_em: string;
};

const BLINK_CSS = `
@keyframes hc-sus-blink { 0%,100%{opacity:1} 50%{opacity:.3} }
.hc-sus-blink{animation:hc-sus-blink 1s ease-in-out infinite}
`;

export default function SuspiciousVotesAlert() {
  const [items, setItems] = useState<Pending[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("admin_get_pending_suspicious_votes");
    if (error || !Array.isArray(data)) {
      setLoadFailed(true);
      return;
    }
    setLoadFailed(false);
    setItems(data as unknown as Pending[]);
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  const decide = async (p: Pending, action: "approve" | "delete") => {
    if (
      action === "delete" &&
      !window.confirm(
        `Remover o voto de ${p.nome} (${p.clube_nome || "sem clube"})? Ele poderá votar de novo.`,
      )
    ) {
      return;
    }
    setBusyId(p.voto_id);
    const { error } = await supabase.rpc(action === "approve" ? "admin_approve_vote" : "admin_delete_vote", {
      p_voto_id: p.voto_id,
    });
    setBusyId(null);
    if (error) {
      toast.error("Não consegui concluir agora. Tente de novo.");
      return;
    }
    toast.success(action === "approve" ? "Voto autorizado." : "Voto removido.");
    load();
  };

  if (loadFailed && !items) {
    return (
      <div className="rounded-[28px] border border-yellow-500/40 bg-[#0b0b0b] p-4 text-sm font-bold text-yellow-400">
        Não consegui verificar os votos suspeitos agora (a Supabase pode estar lenta). Tentando de novo a cada minuto.
      </div>
    );
  }

  if (!items || items.length === 0) return null;

  return (
    <div className="rounded-[28px] border-2 border-red-500/70 bg-gradient-to-br from-red-500/20 to-transparent bg-[#0b0b0b] p-5 space-y-4">
      <style dangerouslySetInnerHTML={{ __html: BLINK_CSS }} />
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-red-500/15 flex items-center justify-center shrink-0 text-red-500 hc-sus-blink">
          <AlertOctagon className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">
            Painel Master · Só você vê isso
          </p>
          <p className="text-sm font-black text-red-400 hc-sus-blink">
            {items.length} voto{items.length !== 1 ? "s" : ""} suspeito{items.length !== 1 ? "s" : ""} aguardando a sua
            decisão
          </p>
          <p className="text-xs text-white/50 mt-0.5">
            Enquanto você não decidir, o voto não conta no ranking. Autorizar libera; remover apaga o voto e a pessoa
            pode votar de novo.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((p) => (
          <div
            key={p.voto_id}
            className="rounded-2xl border border-red-500/30 bg-black/40 p-3 flex flex-col md:flex-row md:items-center gap-3"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">
                {p.nome} <span className="text-white/40 font-normal">· {p.clube_nome || "sem clube"}</span>
              </p>
              <p className="text-[11px] text-white/40 break-all">{p.email || "sem e-mail"}</p>
              <p className="text-[11px] text-red-300/90 mt-1 leading-snug">{p.motivo}</p>
              <p className="text-[10px] text-white/30 mt-0.5">
                Votou em {new Date(p.votou_em).toLocaleString("pt-BR")}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                disabled={busyId === p.voto_id}
                onClick={() => decide(p, "approve")}
                className="flex items-center gap-1.5 rounded-full bg-green-500 px-3 py-1.5 text-[11px] font-black uppercase text-black hover:bg-green-400 disabled:opacity-50"
              >
                {busyId === p.voto_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Autorizar
              </button>
              <button
                disabled={busyId === p.voto_id}
                onClick={() => decide(p, "delete")}
                className="flex items-center gap-1.5 rounded-full border border-red-500/60 px-3 py-1.5 text-[11px] font-black uppercase text-red-400 hover:bg-red-500/10 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remover
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
