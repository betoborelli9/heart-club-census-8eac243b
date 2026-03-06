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
  const navigate = useNavigate();
  const { isAuthenticated, isProfileComplete, hasVoted, isLoading } = useUser();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      if (!isProfileComplete) navigate("/profile-setup", { replace: true });
      else if (!hasVoted) navigate("/voting", { replace: true });
      else navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, isProfileComplete, hasVoted, isLoading, navigate]);

  const handleOAuth = async (provider: "google" | "azure") => {
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

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoadingProvider("magic");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/login` },
    });
    if (error) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } else {
      toast({ title: "Link enviado! ✉️", description: "Verifique seu email para acessar sua conta." });
    }
    setLoadingProvider(null);
  };

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
        transition={{ duration: 0.6, type: "spring" }}
        className="w-full max-w-sm space-y-8 relative z-10"
      >
        <div className="text-center space-y-3">
          <motion.img src={logo} alt="Heart Club"
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
            className="mx-auto w-28 h-28 object-contain" />
          <p className="text-sm text-muted-foreground">O maior censo de torcidas do mundo</p>
        </div>

        <div className="space-y-3">
          <Button variant="outline" className="w-full h-13 font-medium glass-card-hover border-border/50 text-foreground"
            onClick={() => handleOAuth("google")} disabled={!!loadingProvider}>
            {loadingProvider === "google" ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : (
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Entrar com Google
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/50" /></div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-3 text-muted-foreground font-medium">
              Acesso Rápido por E-mail (Sem Senha)
            </span>
          </div>
        </div>

        <form onSubmit={handleMagicLink} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm text-muted-foreground">Email</Label>
            <Input id="email" type="email" placeholder="seu@email.com" value={email}
              onChange={(e) => setEmail(e.target.value)} required
              className="h-12 bg-secondary/50 border-border/50 focus:border-primary" />
          </div>
          <Button type="submit" className="w-full h-12 font-bold btn-orange-gradient rounded-xl" disabled={!!loadingProvider}>
            {loadingProvider === "magic" ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Mail className="w-5 h-5 mr-2" />}
            Enviar Link de Acesso
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
