/**
 * ResetMyVoteButton.tsx — Reset SOMENTE do voto do master admin (testes).
 * Não toca em nenhum voto de terceiros.
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslationApp } from "@/hooks/useTranslationApp";

export default function ResetMyVoteButton() {
  const { t } = useTranslationApp();
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!confirm(t("components.reset_my_vote.confirm"))) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("master_reset_my_vote" as any);
      if (error) throw error;
      const r = data as any;
      toast.success(t("components.reset_my_vote.success", { count: r?.removidos ?? 0 }));
      setTimeout(() => (window.location.href = "/voting"), 700);
    } catch (e: any) {
      toast.error(e.message || t("components.reset_my_vote.error"));
      setLoading(false);
    }
  };

  return (
    <Button onClick={run} disabled={loading} size="sm" variant="outline" className="gap-1">
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
      {loading ? t("components.reset_my_vote.loading") : t("components.reset_my_vote.label")}
    </Button>
  );
}
