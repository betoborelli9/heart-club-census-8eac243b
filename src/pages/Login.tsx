/**
 * Caminho: src/pages/Login.tsx
 * Contexto: Interface de Autenticação Otimizada (Google OAuth + Magic Link)
 * Projeto: HEART CLUB GLOBAL
 * Objetivo: Eliminar loops de redirecionamento, corrigir erro de DNS NXDOMAIN e garantir entrada instantânea.
 * Localhost: C:\Users\betob\Desktop\GitHub\heart-club
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { supabase, SUPABASE_URL } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";

// Configuração de Resiliência: Torcedor não pode esperar mais de 5s
const NETWORK_TIMEOUT_MS = 5000;
const SUPABASE_CONNECTION_ERROR = "Estamos com instabilidade na conexão com o banco de dados. Tente o acesso por e-mail.";

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

const verifySupabaseConnection = () =>
  fetch(`${SUPABASE_URL}/auth/v1/health`, {
    method: "GET",
    mode: "no-cors",
    cache: "no-store",
  });

const Login = () => {
  // --- MÓDULO 1: ESTADOS, REDIRECIONAMENTO E LIMPEZA DE LOOP ---
  const navigate = useNavigate();
  const { isAuthenticated, isProfileComplete, hasVoted, isLoading, isAuthReady } = useUser();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [isConnectingSlow, setIsConnectingSlow] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Monitor de redirecionamento: Se logou, despacha o torcedor para o lugar certo imediatamente
  useEffect(() => {
    if (!isLoading && isAuthenticated && isAuthReady) {
      if (!isProfileComplete) navigate("/profile-setup", { replace: true });
      else if (!hasVoted) navigate("/voting", { replace: true });
      else navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, isProfileComplete, hasVoted, isLoading, isAuthReady, navigate]);

  // Monitor de lentidão: Feedback visual para não parecer que o site travou
  useEffect(() => {
    const isWaiting = !!loadingProvider || !isAuthReady || (isAuthenticated && isLoading);
    if (!isWaiting) {
      setIsConnectingSlow(false);
      return;
    }
    const timer = window.setTimeout(() => setIsConnectingSlow(true), 3000);
    return () => window.clearTimeout(timer);
  }, [loadingProvider, isAuthReady, isAuthenticated, isLoading]);

  // --- MÓDULO 2: AUTH GOOGLE (OAUTH2 COM FIX DE DNS E FLUXO IMPLÍCITO) ---
  const handleOAuth = async (provider: "google") => {
    setLoadingProvider(provider);
    setConnectionError(null);
    try {
      // Limpeza de barra final na URL para evitar erro de Redirect URI no Supabase
      const safeRedirect = window.location.origin.replace(/\/$/, "");

      await withTimeout(verifySupabaseConnection(), NETWORK_TIMEOUT_MS);

      const { data, error } = await withTimeout(
        supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: safeRedirect,
            skipBrowserRedirect: true,
            flowType: "implicit",
            queryParams: {
              prompt: "select_account",
              access_type: "offline",
            },
          } as Parameters<typeof supabase.auth.signInWithOAuth>[0]["options"] & { flowType: "implicit" },
        }),
        NETWORK_TIMEOUT_MS,
      );

      if (error) throw error;
      if (!data.url) throw new Error("URL de autenticação indisponível");

      window.location.assign(data.url);
    } catch (error: unknown) {
      console.error("[LOGIN_ERROR] Falha no OAuth:", error instanceof Error ? error.message : error);
      toast({
        variant: "destructive",
        title: "Conexão instável",
        description: SUPABASE_CONNECTION_ERROR,
      });
      setConnectionError(SUPABASE_CONNECTION_ERROR);
      setLoadingProvider(null);
    }
  };

  // --- MÓDULO 3: AUTH EMAIL (MAGIC LINK DIRETO) ---
  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || loadingProvider) return;

    setLoadingProvider("email");
    setConnectionError(null);
    const normalizedEmail = email.trim().toLowerCase();
    const safeRedirect = window.location.origin.replace(/\/$/, "");

    try {
      const { error } = await withTimeout(
        supabase.auth.signInWithOtp({
          email: normalizedEmail,
          options: {
            emailRedirectTo: safeRedirect,
            shouldCreateUser: true,
          },
        }),
        NETWORK_TIMEOUT_MS,
      );

      if (error) throw error;

      toast({
        title: "Email enviado! ✉️",
        description: "Verifique sua caixa de entrada para acessar o Heart Club.",
      });
    } catch (error: unknown) {
      console.error("[LOGIN_ERROR] Falha no Magic Link:", error instanceof Error ? error.message : error);
      toast({
        variant: "destructive",
        title: "Erro ao enviar",
        description: SUPABASE_CONNECTION_ERROR,
      });
      setConnectionError(SUPABASE_CONNECTION_ERROR);
    } finally {
      setLoadingProvider(null);
    }
  };

  // --- MÓDULO 4: INTERFACE E LOADING STATE ---
  if (!isAuthReady || (isAuthenticated && isLoading)) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        {isConnectingSlow && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-xs text-sm text-muted-foreground"
          >
            Sincronizando com o estádio... A conexão está um pouco lenta.
          </motion.p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-sm space-y-8 relative z-10"
      >
        <div className="text-center space-y-3">
          <img src={logo} alt="Heart Club" className="mx-auto w-28 h-28 object-contain" />
          <p className="text-sm text-muted-foreground uppercase tracking-tighter">O maior censo de torcidas do mundo</p>
        </div>

        <div className="space-y-4">
          <Button
            variant="outline"
            className="w-full h-14 font-bold text-base rounded-md border-primary/35 bg-background text-foreground hover:bg-secondary hover:border-primary/60 transition-all duration-300 shadow-[0_0_24px_hsl(var(--primary)/0.2)] hover:shadow-[0_0_34px_hsl(var(--primary)/0.4)]"
            onClick={() => handleOAuth("google")}
            disabled={!!loadingProvider}
          >
            {loadingProvider === "google" ? (
              <Loader2 className="mr-3 w-6 h-6 animate-spin" />
            ) : (
              <svg className="mr-3 w-6 h-6" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            Entrar com Google
          </Button>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
              <span className="bg-background px-3 text-muted-foreground italic">ou por email</span>
            </div>
          </div>

          <form onSubmit={handleSendLink} className="space-y-4">
            {connectionError && (
              <p className="rounded-md border border-primary/25 bg-secondary/40 px-3 py-2 text-center text-xs text-foreground shadow-[0_0_24px_hsl(var(--primary)/0.16)]">
                {connectionError}
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs uppercase ml-1">
                Seu melhor e-mail
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="nome@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 bg-secondary/30 border-border/50 focus:border-primary/50"
              />
            </div>

            <Button
              type="submit"
              variant="outline"
              className="w-full h-12 font-bold rounded-md hover:bg-secondary transition-all"
              disabled={!!loadingProvider}
            >
              {loadingProvider === "email" ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Mail className="w-5 h-5 mr-2" />
              )}
              Receber link de acesso
            </Button>
          </form>
        </div>

        <p className="text-center text-[10px] text-muted-foreground px-8">
          Ao entrar, você concorda com nossos Termos de Uso. O Heart Club protege seus dados.
        </p>
      </motion.div>
    </div>
  );
};

/**
 * Rodapé: Controle de Autenticação Unificada Heart Club.
 * Notas: Implementado fix de redirect para evitar erro NXDOMAIN no desktop.
 * Recomenda-se verificar se o domínio heartclubapp.com está na whitelist do Supabase.
 */
export default Login;
