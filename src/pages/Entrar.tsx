/**
 * [CAMINHO]: src/pages/Entrar.tsx
 * [MÓDULO]: Porta de entrada NOVA do torcedor — "mostrar primeiro, pedir login depois".
 *  1) Splash curto  2) Escolha do clube (sem login)  3) Tela do clube com a torcida
 *  4) "Juro lealdade" → só aí pede o login (Google ou link por e-mail).
 * O voto em si é gravado em /confirmar-voto (depois do login, com simpatias e o quadradinho dos Termos).
 *
 * Segurança: enquanto NEW_ENTRY_FLOW_ENABLED for false, esta rota só abre para o Master em
 * modo teste (?sim=1), que NÃO grava nada e mostra as telas IDÊNTICAS às do torcedor.
 * O público segue no fluxo antigo.
 */
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Heart, Loader2, Mail, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslationApp } from "@/hooks/useTranslationApp";
import { isMasterEmail } from "@/lib/master";
import { NEW_ENTRY_FLOW_ENABLED, savePendingVote } from "@/lib/entry-flow";
import type { ClubSearchResult } from "@/lib/search-clubs";
import { ClubLogo } from "@/components/ClubLogo";
import { ResultsList, useClubSearch } from "@/components/entrar/ClubSearchBox";
import splashVideo from "@/assets/splash.mp4";
import logo from "@/assets/logo.png";

type Stage = "intro" | "pick" | "club" | "login";
const INTRO_MS = 4500;

const Entrar = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { t } = useTranslationApp();
  const { toast } = useToast();
  const { user, isAuthReady, isLoading, isAuthenticated, hasVoted } = useUser();

  const isMaster = isMasterEmail(user?.email);
  const sim = isMaster && params.get("sim") === "1";

  const [stage, setStage] = useState<Stage>(() => {
    try {
      return sessionStorage.getItem("hc_intro_seen") === "1" && params.get("sim") !== "1" ? "pick" : "intro";
    } catch {
      return "intro";
    }
  });
  const [heartClub, setHeartClub] = useState<ClubSearchResult | null>(null);
  const [fans, setFans] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<"google" | "magic" | null>(null);
  const heartSearch = useClubSearch();

  // ── Porteiro: rota nova só abre para o Master em teste (enquanto o fluxo novo não estiver ligado).
  useEffect(() => {
    if (!isAuthReady || isLoading) return;
    if (isMaster && !sim) {
      navigate("/entrar?sim=1", { replace: true });
      return;
    }
    if (!NEW_ENTRY_FLOW_ENABLED && !sim) {
      navigate("/", { replace: true });
      return;
    }
    if (isAuthenticated && hasVoted && !isMaster) navigate("/dashboard", { replace: true });
  }, [isAuthReady, isLoading, isMaster, sim, isAuthenticated, hasVoted, navigate]);

  // ── Splash: some sozinho em 4,5 s (ou ao tocar em "Pular").
  const finishIntro = useCallback(() => {
    try {
      sessionStorage.setItem("hc_intro_seen", "1");
    } catch {
      /* ignora */
    }
    setStage((s) => (s === "intro" ? "pick" : s));
  }, []);
  useEffect(() => {
    if (stage !== "intro") return;
    const timer = setTimeout(finishIntro, INTRO_MS);
    return () => clearTimeout(timer);
  }, [stage, finishIntro]);

  // ── Quantos torcedores já votaram no clube (número somado, sem dado de pessoa).
  useEffect(() => {
    if (!heartClub) {
      setFans(null);
      return;
    }
    let alive = true;
    (async () => {
      const { data, error } = await supabase.rpc("public_get_club_fans" as any, { p_club: heartClub.name });
      if (alive) setFans(error || typeof data !== "number" ? null : data);
    })();
    return () => {
      alive = false;
    };
  }, [heartClub]);

  const pickHeart = (club: ClubSearchResult) => {
    heartSearch.reset();
    setHeartClub(club);
    setStage("club");
  };

  const changeClub = () => {
    setHeartClub(null);
    setStage("pick");
  };

  const onSwear = () => {
    if (!heartClub) return;
    savePendingVote(heartClub, []);
    if (!sim && isAuthenticated) {
      navigate("/confirmar-voto", { replace: true });
      return;
    }
    setStage("login");
  };

  // No teste do Master os botões de login têm o mesmo visual, mas só avançam a tela (sem login de verdade).
  const loginGoogle = async () => {
    if (sim) {
      navigate("/confirmar-voto?sim=1");
      return;
    }
    setBusy("google");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) {
      toast({ variant: "destructive", title: t("entrar.login_error") });
      setBusy(null);
    }
  };

  const loginMagic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    if (sim) {
      navigate("/confirmar-voto?sim=1");
      return;
    }
    setBusy("magic");
    try {
      const { data, error } = await supabase.functions.invoke("heart-club-auth", {
        body: { email: email.trim(), redirectOrigin: window.location.origin },
      });
      if (error || (data && (data as any).error)) throw new Error("auth_failed");
      toast({ title: t("entrar.link_sent") });
    } catch (err) {
      console.error("[ENTRAR] link por e-mail falhou", err);
      toast({ variant: "destructive", title: t("entrar.login_error") });
    } finally {
      setBusy(null);
    }
  };

  if (!isAuthReady || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── 1) SPLASH
  if (stage === "intro") {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black">
        <video
          autoPlay
          muted
          playsInline
          src={splashVideo}
          onEnded={finishIntro}
          className="h-full w-full max-h-[100vh] max-w-[100vw] object-contain sm:max-h-[800px] sm:max-w-[450px]"
          style={{ pointerEvents: "none" }}
        />
        <button
          onClick={finishIntro}
          className="absolute right-4 top-4 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold uppercase text-white/80 hover:bg-white/20"
        >
          {t("entrar.skip")}
        </button>
      </div>
    );
  }

  const primary = (heartClub as any)?.cor_primaria || "#ff6200";
  const secondary = (heartClub as any)?.cor_secundaria || "#1a1a1a";

  return (
    <div className="min-h-screen bg-background text-white">
      <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-6 px-4 py-8">
        <img src={logo} alt="Heart Club" className="h-20 w-20 object-contain" />

        {/* ── 2) ESCOLHA DO CLUBE */}
        {stage === "pick" && (
          <div className="w-full space-y-5">
            <div className="space-y-2 text-center">
              <h1 className="text-3xl font-black italic uppercase leading-tight tracking-tighter">{t("entrar.pick_title")}</h1>
              <p className="text-sm text-white/60">{t("entrar.pick_sub")}</p>
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary opacity-60" />
              <Input
                autoFocus
                value={heartSearch.query}
                onChange={(e) => heartSearch.setQuery(e.target.value)}
                onFocus={() => heartSearch.setOpen(true)}
                onBlur={() => setTimeout(() => heartSearch.setOpen(false), 200)}
                placeholder={t("entrar.search_placeholder")}
                className="h-14 rounded-2xl border-white/10 bg-card pl-11 text-base"
              />
              <ResultsList
                results={heartSearch.results}
                loading={heartSearch.loading}
                open={heartSearch.open}
                onPick={pickHeart}
              />
            </div>
            <p className="text-center text-xs text-white/50">{t("entrar.privacy_line")}</p>
            <p className="text-center text-xs text-white/40">
              <Link to="/login" className="underline underline-offset-2 hover:text-white/70">
                {t("entrar.already_voted")}
              </Link>
            </p>
          </div>
        )}

        {/* ── 3) TELA DO CLUBE */}
        {stage === "club" && heartClub && (
          <div className="w-full space-y-5">
            <div
              className="relative overflow-hidden rounded-3xl p-6 text-center"
              style={{ background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)` }}
            >
              <div className="absolute inset-0 bg-black/35" />
              <div className="relative space-y-3">
                <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-white shadow-xl">
                  <ClubLogo src={heartClub.logo} alt={heartClub.name} size="xl" />
                </div>
                <h2 className="text-3xl font-black italic uppercase leading-tight tracking-tighter drop-shadow">
                  {heartClub.name}
                </h2>
                <p className="text-xs font-bold uppercase text-white/80">{heartClub.location}</p>
                <p className="mx-auto inline-flex items-center gap-2 rounded-full bg-black/45 px-4 py-1.5 text-sm font-bold">
                  <Heart className="h-4 w-4 fill-current" />
                  {fans === null
                    ? "…"
                    : fans > 0
                      ? t("entrar.fans", { count: fans, defaultValue: String(fans) })
                      : t("entrar.first_fan", { club: heartClub.name })}
                </p>
              </div>
            </div>

            <Button
              onClick={onSwear}
              className="btn-orange-gradient h-16 w-full rounded-2xl text-xl font-black italic shadow-xl shadow-primary/20 active:scale-95"
            >
              {t("entrar.swear")}
            </Button>
            <p className="text-center text-xs text-white/50">{t("entrar.privacy_line")}</p>
            <button
              onClick={changeClub}
              className="mx-auto block text-xs font-bold uppercase text-white/40 hover:text-white/70"
            >
              {t("entrar.change_club")}
            </button>
          </div>
        )}

        {/* ── 4) LOGIN (só aqui!) */}
        {stage === "login" && heartClub && (
          <div className="w-full space-y-5">
            <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-card p-3">
              <ClubLogo src={heartClub.logo} alt={heartClub.name} size="md" />
              <p className="flex-1 truncate text-lg font-black uppercase italic">{heartClub.name}</p>
              <Heart className="h-5 w-5 fill-current text-primary" />
            </div>
            <div className="space-y-2 text-center">
              <h1 className="text-3xl font-black italic uppercase tracking-tighter">{t("entrar.login_title")}</h1>
              <p className="text-sm text-white/60">{t("entrar.login_sub")}</p>
            </div>

            <div className="space-y-4">
              <Button
                onClick={loginGoogle}
                disabled={!!busy}
                className="h-14 w-full gap-3 rounded-xl bg-white text-base font-bold text-black hover:bg-white/90"
              >
                {busy === "google" ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                {t("entrar.google")}
              </Button>
              <div className="flex items-center gap-3 text-[11px] uppercase text-white/40">
                <div className="h-px flex-1 bg-white/10" />
                {t("entrar.or_email")}
                <div className="h-px flex-1 bg-white/10" />
              </div>
              <form onSubmit={loginMagic} className="space-y-3">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("entrar.email_placeholder")}
                  className="h-12 rounded-xl border-white/10 bg-card"
                />
                <Button
                  type="submit"
                  disabled={!!busy || !email.trim()}
                  variant="outline"
                  className="h-12 w-full gap-2 rounded-xl font-bold"
                >
                  {busy === "magic" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  {t("entrar.send_link")}
                </Button>
              </form>
            </div>
            <p className="text-center text-xs text-white/50">{t("entrar.privacy_line")}</p>
            <button
              onClick={() => setStage("club")}
              className="mx-auto block text-xs font-bold uppercase text-white/40 hover:text-white/70"
            >
              {t("entrar.back")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Entrar;
