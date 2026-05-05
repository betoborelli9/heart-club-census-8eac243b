/**
 * Caminho: src/pages/Login.tsx
 * Contexto: Interface de Autenticação Unificada (Google OAuth + Edge Function Resend)
 * Projeto: HEART CLUB GLOBAL
 * Objetivo: Corrigir loop de redirecionamento para novos usuários.
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";

const Login = () => {
  // --- MÓDULO 1: ESTADOS E REDIRECIONAMENTO ---
  const navigate = useNavigate();
  const { isAuthenticated, isProfileComplete, hasVoted, isLoading } = useUser();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  // Lógica de Redirecionamento Blindada para evitar Loops
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      console.log("Status Auth:", { isProfileComplete, hasVoted });
      
      if (!isProfileComplete) {
        navigate("/profile-setup", { replace: true });
      } else if (!hasVoted) {
        navigate("/voting", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [isAuthenticated, isProfileComplete, hasVoted, isLoading, navigate]);

  // --- MÓDULO 2: AUTH GOOGLE (OAUTH2) ---
  const handleOAuth = async (provider: "google") => {
    setLoadingProvider(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/login` },
    });

    if (error) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
      setLoadingProvider(null);
    }
  };

  // --- MÓDULO 3: AUTH EMAIL (FETCH DIRETO PARA EDGE FUNCTION) ---
  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoadingProvider("email");

    try {
      const response = await fetch('https://tmttlchkqjtbusfdwyrx.supabase.co/functions/v1/heart-club-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao processar login");
      }

      toast({
        title: "Email enviado! ✉️",
        description: "Verifique sua caixa de entrada e clique no link.",
      });
    } catch (error: any) {
      console.error("Erro no disparo:", error);
      toast({
        variant: "destructive",
        title: "Erro ao enviar email",
        description: error.message || "Tente novamente em instantes.",
      });
    } finally {
      setLoadingProvider(null);
    }
  };

  // --- MÓDULO 4: INTERFACE ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
          <p className="text-sm text-muted-foreground">O maior censo de torcidas do mundo</p>
        </div>

        <Button
          variant="outline"
          className="w-full h-13 font-medium border-border/50 text-foreground"
          onClick={() => handleOAuth("google")}
          disabled={!!loadingProvider}
        >
          {loadingProvider === "google" ? (
            <Loader2 className="mr-2 animate-spin" />
          ) : (
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          )}
          Entrar com Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/50" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-3 text-muted-foreground font-medium">ou entrar com email</span>
          </div>
        </div>

        <form onSubmit={handleSendLink} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 bg-secondary/50 border-border/50"
            />
          </div>

          <Button
            type="submit"
            className="w-full h-12 font-bold btn-orange-gradient rounded-xl"
            disabled={loadingProvider === "email"}
          >
            {loadingProvider === "email" ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5 mr-2" />}
            Entrar com email
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Ao entrar, você concorda com os Termos de Uso e Política de Privacidade.
        </p>
      </motion.div>
    </div>
  );
};

export default Login;