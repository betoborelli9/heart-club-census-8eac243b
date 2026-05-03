/**
 * ResetTestDataButton.tsx — Limpa TODOS os votos via TRUNCATE CASCADE (master admin).
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ResetTestDataButton() {
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!confirm("⚠ ATENÇÃO: Limpar TODOS os votos? Essa ação não pode ser desfeita.")) return;
    setLoading(true);
    toast.loading("Limpando base de dados...", { id: "purge" });
    try {
      const { data, error } = await supabase.rpc("purge_fake_votes" as any);
      if (error) throw error;
      const r = data as any;
      toast.success(`Base limpa! ${r?.removidos ?? 0} votos removidos.`, { id: "purge" });
      setTimeout(() => window.location.reload(), 800);
    } catch (e: any) {
      toast.error(e.message || "Falha ao limpar dados", { id: "purge" });
      setLoading(false);
    }
  };

  return (
    <Button onClick={run} disabled={loading} size="sm" variant="destructive" className="gap-1">
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
      {loading ? "Limpando..." : "Resetar Dados de Teste"}
    </Button>
  );
}
