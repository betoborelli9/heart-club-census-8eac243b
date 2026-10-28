import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { isMasterEmail } from "@/lib/master";
import { notVotedTarget } from "@/lib/entry-flow";
import { buildChromeIntentUrl, detectInAppBrowser } from "@/lib/in-app-browser";
import { GoogleIcon } from "@/components/GoogleIcon";
import { useTranslationApp } from "@/hooks/useTranslationApp";
import logo from "@/assets/logo.png";

const Login = () => {
  const navigate = useNavigate();
  const { t } = useTranslationApp();
  const { user, isAuthenticated, isProfileComplete, hasVoted, isLoading } = useUser();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  // Navegador interno (Instagram, Facebook, TikTok…): o Google bloqueia o login ali — mesmo cuidado da tela /entrar.
  const inApp = useMemo(() => detectInAppBrowser(), []);

  // Android: abre esta mesma página no Chrome.
  const openInChrome = () => {
    try {
      window.location.href = buildChromeIntentUrl(window.location.href);
    } catch (err) {
      console.error("[LOGIN] não abriu no Chrome", err);
    }
  };

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      // Master Admin entra sempre direto no dashboard (como torcedor comum).
      // Os fluxos de "primeira vez" só são reabertos via MasterTestPanel.
      if (isMasterEmail(user?.email)) {
        navigate("/dashboard", { replace: true });
        return;
      }
      if (!hasVoted) navigate(notVotedTarget(), { replace: true });
      else navigate("/dashboard", { replace: true });
    }
  }, [user, isAuthenticated, isProfileComplete, hasVoted, isLoading, navigate]);

  const handleOAuth = async (provider: "google" | "azure") => {
    setLoadingProvider(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) {
      toast({ variant: "destructive", title: t("common.error"), description: error.message });
      setLoadingProvider(null);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoadingProvider("magic");
    try {
      console.log("[LOGIN] → invocando heart-club-auth para", email.trim());
      const { data, error } = await supabase.functions.invoke("heart-club-auth", {
        body: { email: email.trim(), redirectOrigin: window.location.origin },
      });
      console.log("[LOGIN] ← resposta heart-club-auth", { data, error });
      if (error || (data && (data as any).error)) {
        throw new Error(((data as any)?.error as string) || error?.message || "auth_failed");
      }
      toast({
        title: t("auth.login.link_sent_title"),
        description: t("auth.login.link_sent_desc"),
      });
    } catch (err) {
      console.error("[LOGIN] magic link falhou", err);
      toast({
        variant: "destructive",
        title: t("auth.login.error_title"),
        description: t("auth.login.error_desc"),
      });
    } finally {
      setLoadingProvider(null);
    }
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
          <motion.img
            src={logo}
            alt="Heart Club"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
            className="mx-auto w-28 h-28 object-contain"
          />
          <p className="text-sm text-muted-foreground">{t("header.tagline")}</p>
        </div>

        {inApp.inApp && inApp.platform === "android" && (
          <div className="space-y-2" data-testid="inapp-android">
            <Button
              onClick={openInChrome}
              className="btn-orange-gradient h-16 w-full rounded-2xl text-lg font-black italic shadow-xl shadow-primary/20 active:scale-95"
            >
              {t("entrar.inapp_open_chrome")}
            </Button>
            <p className="text-center text-xs text-muted-foreground">{t("entrar.inapp_open_chrome_hint")}</p>
          </div>
        )}
        {inApp.inApp && inApp.platform === "ios" && (
          <p
            className="rounded-2xl border border-primary/40 bg-primary/10 p-3 text-center text-sm font-bold text-foreground"
            data-testid="inapp-ios"
          >
            {t("entrar.inapp_ios_notice")}
          </p>
        )}

        {!inApp.inApp && (
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full h-13 font-medium glass-card-hover border-border/50 text-foreground"
            onClick={() => handleOAuth("google")}
            disabled={!!loadingProvider}
          >
            {loadingProvider === "google" ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            {t("auth.login.google")}
          </Button>
        </div>
        )}

        {!inApp.inApp && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/50" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-3 text-muted-foreground font-medium">
              {t("auth.login.divider")}
            </span>
          </div>
        </div>
        )}

        <form onSubmit={handleMagicLink} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm text-muted-foreground">
              {t("auth.login.email_label")}
            </Label>
            <Input
              id="email"
              type="email"
              placeholder={t("auth.login.email_placeholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 bg-secondary/50 border-border/50 focus:border-primary"
            />
          </div>
          <Button
            type="submit"
            className={inApp.inApp ? "w-full h-14 font-bold btn-orange-gradient rounded-xl" : "w-full h-12 font-bold btn-orange-gradient rounded-xl"}
            disabled={!!loadingProvider || !email.trim()}
          >
            {loadingProvider === "magic" ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Mail className="w-5 h-5 mr-2" />
            )}
            {t("auth.login.send_link")}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          {t("auth.login.terms")}
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
