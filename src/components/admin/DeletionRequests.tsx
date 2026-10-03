/**
 * [CAMINHO]: src/components/admin/DeletionRequests.tsx
 * [MÓDULO]: Pedidos de ocultação de dados — SÓ quando o torcedor pede. O voto
 * NUNCA é apagado: continua contando, sem nome e sem ligação com a pessoa.
 * Somente do administrador (tem nome e e-mail).
 */
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, EyeOff, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Req = {
  user_id: string;
  nome: string;
  email: string;
  clube_nome: string | null;
  pediu_em: string;
  situacao: string;
};

export default function DeletionRequests() {
  const [rows, setRows] = useState<Req[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase.rpc("admin_get_deletion_requests" as any);
    if (err || !Array.isArray(data)) {
      setError(err?.message || "resposta inesperada do servidor");
      return;
    }
    setError(null);
    setRows(data as unknown as Req[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const hide = async (r: Req) => {
    if (
      !window.confirm(
        `Ocultar os dados pessoais de ${r.nome}?\n\nO voto em ${r.clube_nome || "seu clube"} continua contando, sem nome, e-mail, telefone, localização exata nem IP. Isso não tem volta.`,
      )
    ) {
      return;
    }
    setBusy(r.user_id);
    const { error: err } = await supabase.rpc("admin_anonymize_user" as any, { p_user_id: r.user_id });
    setBusy(null);
    if (err) {
      toast.error("Não consegui ocultar agora. Tente de novo.");
      return;
    }
    toast.success("Dados ocultados. O voto continua contando.");
    load();
  };

  if (error && !rows) {
    return (
      <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-3 text-xs text-yellow-400 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" /> Não consegui ler os pedidos de ocultação de dados agora.
        <button onClick={load} className="underline underline-offset-2 inline-flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> tentar de novo
        </button>
      </div>
    );
  }

  if (!rows) return <Loader2 className="w-4 h-4 animate-spin text-primary" />;

  const pending = rows.filter((r) => r.situacao !== "anonymized");

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
      <div className="flex items-start gap-2">
        <EyeOff className="mt-0.5 h-4 w-4 text-primary" />
        <div>
          <h4 className="text-sm font-black uppercase italic tracking-wider">
            Pedidos de ocultação de dados {pending.length > 0 && <span className="text-red-400">({pending.length})</span>}
          </h4>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Só aparece quem pediu. Ao ocultar, o voto continua contando, sem nome e sem dados pessoais. Voto efetuado é
            definitivo.
          </p>
        </div>
      </div>

      {rows.length === 0 && <p className="text-xs text-muted-foreground">Nenhum pedido até agora.</p>}

      <div className="space-y-2">
        {rows.map((r) => {
          const done = r.situacao === "anonymized";
          return (
            <div
              key={r.user_id}
              className={`flex flex-col gap-2 rounded-xl border px-3 py-2.5 md:flex-row md:items-center ${
                done ? "border-white/5 bg-black/20 opacity-60" : "border-red-500/30 bg-black/30"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">
                  {r.nome} <span className="font-normal text-white/40">· {r.clube_nome || "sem clube"}</span>
                </p>
                <p className="break-all text-[11px] text-muted-foreground">{r.email}</p>
                <p className="text-[10px] text-white/30">
                  Pediu em {new Date(r.pediu_em).toLocaleDateString("pt-BR")}
                </p>
              </div>
              {done ? (
                <span className="text-[10px] font-black uppercase text-green-400">Dados ocultados</span>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === r.user_id}
                  onClick={() => hide(r)}
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                >
                  {busy === r.user_id ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <EyeOff className="mr-1.5 h-3.5 w-3.5" />}
                  Ocultar dados (manter o voto)
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
