/**
 * [CAMINHO]: src/components/admin/PartnerRequests.tsx
 * [MÓDULO]: Aba "Parceiros" do Admin: pedidos de acesso à página do parceiro. Só admin/master (o banco recusa os demais).
 * Autorizar libera a página exclusiva; Retirar acesso encerra na hora.
 */
import { useCallback, useEffect, useState } from "react";
import { Handshake, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Req = {
  user_id: string;
  nome: string;
  email: string;
  company: string;
  contact: string;
  message: string | null;
  status: "pending" | "approved" | "rejected" | "revoked";
  requested_at: string;
  decided_at: string | null;
  clube: string | null;
};

const rpc = supabase.rpc.bind(supabase) as unknown as (
  fn: string,
  args?: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

const LABEL: Record<Req["status"], { text: string; cls: string }> = {
  pending: { text: "Aguardando", cls: "bg-amber-500/15 text-amber-300" },
  approved: { text: "Autorizado", cls: "bg-green-500/15 text-green-400" },
  rejected: { text: "Recusado", cls: "bg-red-500/15 text-red-400" },
  revoked: { text: "Acesso retirado", cls: "bg-white/10 text-white/60" },
};

export default function PartnerRequests() {
  const [rows, setRows] = useState<Req[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: err } = await rpc("admin_list_partner_requests");
    if (err || !Array.isArray(data)) {
      setError(err?.message || "resposta inesperada");
      return;
    }
    setError(null);
    setRows(data as Req[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (r: Req, status: Req["status"], confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(r.user_id);
    const { error: err } = await rpc("admin_decide_partner", { p_user_id: r.user_id, p_status: status });
    setBusy(null);
    if (err) {
      toast.error("Não consegui salvar agora. Tente de novo.");
      return;
    }
    toast.success(status === "approved" ? `${r.company} agora é parceiro.` : "Feito.");
    void load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-black uppercase italic tracking-wider">
          <Handshake className="h-4 w-4 text-primary" /> Pedidos de parceiros
        </h3>
        <Button size="sm" variant="ghost" onClick={() => void load()} className="gap-1 text-xs">
          <RefreshCw className="h-3.5 w-3.5" /> Atualizar
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        O parceiro vota como torcedor, toca em "Sou parceiro" e o pedido aparece aqui. Só quem você autoriza ganha a página
        exclusiva do parceiro. Você (este e-mail) sempre tem acesso a tudo.
      </p>

      {error && <p className="text-sm text-yellow-400">Não consegui ler os pedidos agora: {error}</p>}
      {!rows && !error && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
      {rows && rows.length === 0 && <p className="rounded-xl border border-white/10 p-6 text-center text-sm text-muted-foreground">Nenhum pedido ainda.</p>}

      <div className="space-y-2">
        {(rows || []).map((r) => (
          <div key={r.user_id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-base font-black italic">{r.company}</p>
                <p className="text-xs text-white/60">
                  {r.nome || "—"} · {r.email} {r.clube ? `· torce para ${r.clube}` : ""}
                </p>
                <p className="mt-1 text-xs text-white/80">Contato: {r.contact}</p>
                {r.message && <p className="mt-1 text-xs italic text-white/60">“{r.message}”</p>}
                <p className="mt-1 text-[10px] text-white/40">Pedido em {new Date(r.requested_at).toLocaleString("pt-BR")}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${LABEL[r.status].cls}`}>{LABEL[r.status].text}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {r.status !== "approved" && (
                <Button size="sm" disabled={busy === r.user_id} onClick={() => decide(r, "approved")} className="btn-orange-gradient font-black uppercase italic">
                  Autorizar
                </Button>
              )}
              {r.status === "pending" && (
                <Button size="sm" variant="outline" disabled={busy === r.user_id} onClick={() => decide(r, "rejected", `Recusar o pedido de ${r.company}?`)}>
                  Recusar
                </Button>
              )}
              {r.status === "approved" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === r.user_id}
                  onClick={() => decide(r, "revoked", `Retirar o acesso de ${r.company}? Ele perde a página do parceiro na hora.`)}
                  className="border-red-500/40 text-red-400"
                >
                  Retirar acesso
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
