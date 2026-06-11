/**
 * ═══════════════════════════════════════════════════════════════════
 * [CAMINHO]: src/pages/Verify.tsx
 * [MÓDULO]: AUTH - GUARDIAO VERIFICATION
 * [STATUS]: CORREÇÃO DE BUILD
 * [DESCRIÇÃO]: Validação de tokens de custódia.
 * ═══════════════════════════════════════════════════════════════════
 */

import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client"; // CAMINHO CORRETO LOVABLE
import { toast } from "sonner";
import { useTranslationApp } from "@/hooks/useTranslationApp";
import i18n from "@/i18n";

const VERIFY_TIMEOUT_MS = 8000;

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timeoutId: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(i18n.t("auth.verify.timeout") as string)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
};

/* ═══════════════════════════════════════════════════════════
    MÓDULO: LOGICA DE VALIDAÇÃO
   ═══════════════════════════════════════════════════════════ */
const Verify = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslationApp();

  useEffect(() => {
    const validateToken = async () => {
      try {
        const token = searchParams.get("token");
        const redirect = searchParams.get("redirect") || "/voting";

        if (!token) {
          toast.error(t("auth.verify.missing_token"));
          navigate("/login");
          return;
        }

      // Validação via Edge Function (service role) — evita bloqueio de RLS
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

      // Estabelecer sessão real no Supabase Auth via verifyOtp (token_hash do magic link admin)
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
        navigate(redirect);
      } catch (error) {
        console.error("[VERIFY] conexão instável", error);
        toast.error(t("auth.verify.unstable"));
        navigate("/login");
      }
    };

    validateToken();
  }, [searchParams, navigate, t]);

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">{t("auth.verify.validating")}</h2>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">{t("auth.verify.checking")}</p>
      </div>
    </div>
  );
};

export default Verify;

/**
 * ═══════════════════════════════════════════════════════════════════
 * [RODAPÉ TÉCNICO]
 * - Import corrigido para @/integrations/supabase/client.
 * - Mantida a estrutura de feedback via Sonner.
 * ═══════════════════════════════════════════════════════════════════
 */