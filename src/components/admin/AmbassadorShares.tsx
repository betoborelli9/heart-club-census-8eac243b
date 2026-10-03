/**
 * [CAMINHO]: src/components/admin/AmbassadorShares.tsx
 * [MÓDULO]: Convites dos embaixadores — quem usou o botão de compartilhar o
 * link, quantas vezes, por qual canal, e quantas pessoas realmente entraram
 * pelo link dele. O site NÃO sabe para quem a mensagem foi (isso fica só no
 * celular do embaixador). Somente do administrador.
 */
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  user_id: string;
  nome: string;
  email: string | null;
  clube_nome: string | null;
  total: number;
  whatsapp: number;
  telegram: number;
  nativo: number;
  copiado: number;
  instagram: number;
  ultimo_envio: string | null;
  cadastros: number;
};

export default function AmbassadorShares() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase.rpc("admin_get_share_summary" as any);
    if (err || !Array.isArray(data)) {
      setError(err?.message || "resposta inesperada do servidor");
      setRows(null);
    } else {
      setError(null);
      setRows(data as unknown as Row[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !rows) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !rows) {
    return (
      <div className="max-w-xl space-y-3 rounded-2xl border border-red-500/40 bg-red-500/10 p-5">
        <p className="flex items-center gap-2 text-sm font-black text-red-400">
          <AlertTriangle className="h-4 w-4" /> Não consegui carregar os convites
        </p>
        <p className="text-xs text-muted-foreground">Detalhe técnico: {error}</p>
        <Button size="sm" variant="outline" onClick={load}>
          <RefreshCw className="mr-1.5 h-4 w-4" /> Tentar de novo
        </Button>
      </div>
    );
  }

  const totalShares = rows.reduce((a, r) => a + Number(r.total), 0);
  const totalSignups = rows.reduce((a, r) => a + Number(r.cadastros), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Send className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-black uppercase italic tracking-wider">Convites dos embaixadores</h3>
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
          <p className="text-xl font-black text-primary">{rows.filter((r) => Number(r.total) > 0).length}</p>
          <p className="text-[10px] font-bold uppercase text-muted-foreground">embaixadores que compartilharam</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
          <p className="text-xl font-black text-primary">{totalShares}</p>
          <p className="text-[10px] font-bold uppercase text-muted-foreground">compartilhamentos</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
          <p className="text-xl font-black text-primary">{totalSignups}</p>
          <p className="text-[10px] font-bold uppercase text-muted-foreground">pessoas entraram pelo link</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10">
        <div className="max-h-[460px] overflow-auto">
          <table className="w-full min-w-[640px] text-xs">
            <thead className="sticky top-0 bg-[#141414] text-[10px] uppercase text-muted-foreground">
              <tr>
                <th className="p-2.5 text-left">Embaixador</th>
                <th className="p-2.5 text-left">Clube</th>
                <th className="p-2.5 text-left">Compartilhou</th>
                <th className="p-2.5 text-left">Por onde</th>
                <th className="p-2.5 text-left">Último</th>
                <th className="p-2.5 text-left">Entraram</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    Ninguém compartilhou ainda. O registro começou agora.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.user_id} className="border-t border-white/5 align-top">
                  <td className="p-2.5">
                    <p className="font-bold">{r.nome}</p>
                    <p className="break-all text-[10px] text-muted-foreground">{r.email}</p>
                  </td>
                  <td className="p-2.5">{r.clube_nome || "—"}</td>
                  <td className="p-2.5 font-black text-primary">{Number(r.total)}x</td>
                  <td className="p-2.5 text-[10px] text-muted-foreground">
                    {[
                      Number(r.whatsapp) > 0 && `WhatsApp ${r.whatsapp}`,
                      Number(r.telegram) > 0 && `Telegram ${r.telegram}`,
                      Number(r.nativo) > 0 && `Menu do celular ${r.nativo}`,
                      Number(r.copiado) > 0 && `Copiou link ${r.copiado}`,
                      Number(r.instagram) > 0 && `Instagram ${r.instagram}`,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </td>
                  <td className="whitespace-nowrap p-2.5 text-muted-foreground">
                    {r.ultimo_envio ? new Date(r.ultimo_envio).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="p-2.5 font-black">{Number(r.cadastros)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        O site registra quem apertou o botão de compartilhar, mas não sabe para quem a mensagem foi — isso fica só no
        celular do embaixador. "Entraram" são as pessoas que de fato se cadastraram pelo link dele.
      </p>
    </div>
  );
}
