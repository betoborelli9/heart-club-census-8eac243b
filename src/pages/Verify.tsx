/**
 * ═══════════════════════════════════════════════════════════════════
 * [CAMINHO]: src/pages/Verify.tsx
 * [MÓDULO]: AUTH - GUARDIAO VERIFICATION
 * [DESCRIÇÃO]: Validação de tokens de custódia com clique explícito
 *              para evitar consumo por scanners de e-mail
 *              (Gmail/Outlook SafeLinks).
 * ═══════════════════════════════════════════════════════════════════
 */

import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslationApp } from "@/hooks/useTranslationApp";
import i18n from "@/i18n";

const VERIFY_TIMEOUT_MS = 8000;

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timeoutId: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(
      () => reject(new Error(i18n.t("auth.verify.timeout") as string)),
      timeoutMs,
    );
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
};

const Verify = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslationApp();
  const [loading, setLoading] = useState(false);
  const hasStartedRef = useRef(false);

  const token = searchParams.get("token");
  const redirect = "/voting";

  const handleConfirm = async () => {
    if (!token) {
      toast.error(t("auth.verify.missing_token"));
      navigate("/login");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await withTimeout(
        supabase.functions.invoke("verify-auth-token", { body: { token } }),
        VERIFY_TIMEOUT_MS,
      );

      if (error || !data?.valid) {
        const reason = data?.error;
        if (reason === "already_used") toast.error(t("auth.verify.already_used"));
        else if (reason === "expired") toast.error(t("auth.verify.expired"));
        else toast.error(t("auth.verify.invalid"));
        navigate("/login");
        return;
      }

      if (data.token_hash) {
        const { error: otpErr } = await withTimeout(
          supabase.auth.verifyOtp({
            token_hash: data.token_hash,
            type: data.type === "signup" ? "signup" : "magiclink",
          }),
          VERIFY_TIMEOUT_MS,
        );
        if (otpErr) {
          console.error("[VERIFY] verifyOtp falhou", otpErr);
          toast.error(t("auth.verify.session_failed"));
          navigate("/login");
          return;
        }
      } else {
        toast.error(t("auth.verify.session_missing"));
        navigate("/login");
        return;
      }

      toast.success(t("auth.verify.success"));
      // Sempre direciona para a página de votação após validação.
      navigate(redirect || "/voting", { replace: true });
    } catch (err) {
      console.error("[VERIFY] conexão instável", err);
      toast.error(t("auth.verify.unstable"));
      navigate("/login");
    }
  };

  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    void handleConfirm();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center space-y-6">
        <Mail className="mx-auto w-12 h-12 text-primary" />
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">{t("auth.verify.validating")}</h2>
          <p className="text-sm text-muted-foreground">{t("auth.verify.checking")}</p>
        </div>
        <Button
          onClick={handleConfirm}
          disabled={loading || !token}
          className="w-full h-12 font-bold btn-orange-gradient rounded-xl"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Mail className="w-5 h-5 mr-2" />
          )}
          {t("auth.verify.validating")}
        </Button>
      </div>
    </div>
  );
};

export default Verify;
