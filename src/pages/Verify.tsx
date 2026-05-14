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

const VERIFY_TIMEOUT_MS = 8000;

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timeoutId: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error("Tempo de conexão excedido")), timeoutMs);
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

  useEffect(() => {
    const validateToken = async () => {
      const token = searchParams.get("token");
      const redirect = searchParams.get("redirect") || "/voting";

      if (!token) {
        toast.error("Token de acesso ausente.");
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
        if (reason === "already_used") toast.error("Este link já foi utilizado.");
        else if (reason === "expired") toast.error("Link expirado. Solicite um novo.");
        else toast.error("Link inválido ou expirado.");
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
          toast.error("Falha ao iniciar sessão. Tente novamente.");
          navigate("/login");
          return;
        }
      } else {
        toast.error("Sessão não pôde ser criada.");
        navigate("/login");
        return;
      }

      toast.success("Acesso autorizado! Bem-vindo ao Heart Club.");
      navigate(redirect);
    };

    validateToken();
  }, [searchParams, navigate]);

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Validando seu acesso...</h2>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">O Heart Club está verificando suas credenciais.</p>
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