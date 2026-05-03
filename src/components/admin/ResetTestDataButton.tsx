/**
 * ResetTestDataButton.tsx — Limpa votos fictícios (somente master admin).
 * Roda RPC purge_fake_votes em loop até zerar.
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ResetTestDataButton() {
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!confirm("⚠ ATENÇÃO: Limpar TODOS os votos fictícios? Essa ação não pode ser desfeita.")) return;
    setLoading(true);
    let total = 0;
    try {
      while (true) {
        const { data, error } = await supabase.rpc("purge_fake_votes" as any);
        if (error) throw error;
        const r = data as any;
        total += r?.removidos ?? 0;
        if (!r?.has_more) break;
      }
      toast.success(`Base limpa! ${total} votos fictícios removidos.`);
    } catch (e: any) {
      toast.error(e.message || "Falha ao limpar dados");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={run} disabled={loading} size="sm" variant="destructive" className="gap-1">
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
      Resetar Dados de Teste
    </Button>
  );
}
