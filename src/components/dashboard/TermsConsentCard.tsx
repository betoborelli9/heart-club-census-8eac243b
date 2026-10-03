/**
 * Card de aceite dos Termos e da Privacidade (LGPD). Só aparece quando a
 * chavinha "form_termos" estiver LIGADA no Admin e o torcedor ainda não tiver
 * aceito. Se algo falhar ao ler (chavinha, perfil), NÃO aparece e nada trava.
 */
import { useState } from "react";
import { FileCheck2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import { useFeatureFlag } from "@/lib/feature-flags";
import { supabase } from "@/integrations/supabase/client";
import FormReasonCard from "@/components/FormReasonCard";

const SKIP_KEY = "hc_terms_skip_session";

export default function TermsConsentCard() {
  const { profile, isAuthenticated, refreshProfile } = useUser();
  const flag = useFeatureFlag("form_termos");
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [skipped, setSkipped] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(SKIP_KEY) === "1";
    } catch {
      return false;
    }
  });

  const needsAccept =
    flag.enabled && isAuthenticated && !!profile && !(profile as any).terms_accepted_at && !skipped;

  if (!needsAccept) return null;

  const accept = async () => {
    setSaving(true);
    setFailed(false);
    const { error } = await supabase.rpc("accept_terms" as any, { p_version: "1.0" });
    if (error) {
      setFailed(true);
      setSaving(false);
      return;
    }
    await refreshProfile().catch(() => {});
    setSaving(false);
  };

  const skipForNow = () => {
    try {
      sessionStorage.setItem(SKIP_KEY, "1");
    } catch {}
    setSkipped(true);
  };

  return (
    <Dialog open>
      <DialogContent
        className="max-w-md border-0 bg-transparent p-0 shadow-none [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Termos de Uso e Privacidade</DialogTitle>
        <DialogDescription className="sr-only">Aceite dos Termos de Uso e da Política de Privacidade</DialogDescription>
        <FormReasonCard
          icon={FileCheck2}
          step="Sua torcida, seus direitos"
          title="Antes de seguir: nós e você, de acordo"
          subtitle="Um combinado simples, escrito para você entender."
          reasons={[
            "Usamos o que você informa só para contar e mapear torcidas.",
            "Seu nome e seu e-mail nunca aparecem em rankings, mapas ou relatórios.",
            "Se um dia quiser, você pede e nós ocultamos seus dados — o seu voto continua, sem o seu nome.",
          ]}
        >
          <div className="space-y-3">
            <p className="text-center text-[12px] text-white/50">
              Ao tocar em aceitar, você concorda com os{" "}
              <a href="/termos" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">
                Termos de Uso
              </a>{" "}
              e a{" "}
              <a href="/privacidade" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">
                Política de Privacidade
              </a>
              .
            </p>
            <Button
              onClick={accept}
              disabled={saving}
              className="h-12 w-full rounded-xl font-black uppercase italic btn-orange-gradient"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Aceitar e continuar
            </Button>
            {failed && (
              <p className="text-center text-xs text-yellow-400">
                Não deu certo agora. Tente de novo ou{" "}
                <button onClick={skipForNow} className="underline underline-offset-2">
                  continue por enquanto
                </button>
                .
              </p>
            )}
          </div>
        </FormReasonCard>
      </DialogContent>
    </Dialog>
  );
}
