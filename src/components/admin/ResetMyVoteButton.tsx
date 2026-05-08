/**
 * ResetMyVoteButton.tsx — Reset SOMENTE do voto do master admin (testes).
 * Não toca em nenhum voto de terceiros.
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ResetMyVoteButton() {
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!confirm("Resetar SEU próprio voto para refazer testes? (Outros usuários não são afetados)")) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("master_reset_my_vote" as any);
      if (error) throw error;
      const r = data as any;
      toast.success(`Seu voto foi resetado (${r?.removidos ?? 0}). Pronto para novo teste.`);
      setTimeout(() => (window.location.href = "/voting"), 700);
    } catch (e: any) {
      toast.error(e.message || "Falha ao resetar voto");
      setLoading(false);
    }
  };

  return (
    <Button onClick={run} disabled={loading} size="sm" variant="outline" className="gap-1">
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
      {loading ? "Resetando..." : "Resetar Meu Voto"}
    </Button>
  );
}
