/**
 * [CAMINHO]: src/pages/Entrar.tsx
 * [MÓDULO]: Porta de entrada do torcedor — o caminho mais curto até o voto.
 *  1) Logo parado (no máximo 2 s)  2) "Qual é o time do seu coração?" (busca, sem login)
 *  3) Clube escolhido no topo + "Continuar com Google" / link por e-mail, com o aviso dos Termos.
 * Não há tela de "Juro lealdade" nem de "Confirme seu voto": o voto é gravado em /confirmar-voto assim que o
 * torcedor volta do login (Google) ou abre o link do e-mail, e o aceite dos Termos é registrado junto.
 * As simpatias ficam para depois, no painel.
 *
 * Segurança: enquanto NEW_ENTRY_FLOW_ENABLED for false, esta rota só abre para o Master em
 * modo teste (?sim=1), que NÃO grava nada e mostra as telas IDÊNTICAS às do torcedor.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Heart, Loader2, Mail, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslationApp } from "@/hooks/useTranslationApp";
import { isMasterEmail } from "@/lib/master";
import {
  NEW_ENTRY_FLOW_ENABLED,
  PENDING_VOTE_PARAM,
  decodePendingVoteParam,
  encodePendingVoteParam,
  loadPendingVote,
  savePendingVote,
} from "@/lib/entry-flow";
import { buildChromeIntentUrl, detectInAppBrowser } from "@/lib/in-app-browser";
import { GoogleIcon } from "@/components/GoogleIcon";
import { isSimActive, startSim } from "@/lib/sim-fan";
import type { ClubSearchResult } from "@/lib/search-clubs";
import { ClubLogo } from "@/components/ClubLogo";
import { ResultsList, useClubSearch } from "@/components/entrar/ClubSearchBox";
import logo from "@/assets/logo-384.png"; // cópia leve (67 KB) do logo de 1000 px: a abertura carrega rápido no celular

type Stage = "intro" | "pick" | "login";
const INTRO_MS = 1500; // logo parado: no máximo 2 s

const Entrar = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { t } = useTranslationApp();
  const { toast } = useToast();
  const { user, realUser, isAuthReady, isLoading, isAuthenticated, hasVoted } = useUser();

  // Durante o teste do Master, user é o torcedor novo de mentira; o Master de verdade é realUser.
  const isMaster = isMasterEmail((realUser ?? user)?.email);
  const sim = isMaster && params.get("sim") === "1";

  // Navegador interno (Instagram, Facebook, TikTok…): o Google bloqueia o login ali.
  const inApp = useMemo(() => detectInAppBrowser(), []);
  // Link com a escolha do time (vindo do "Abrir no Chrome"): o torcedor já escolheu, vai direto às opções de entrar.
  const linkVote = useMemo(() => (params.get("sim") === "1" ? null : decodePendingVoteParam(params.get(PENDING_VOTE_PARAM))), []); // eslint-disable-line react-hooks/exhaustive-deps

  const [stage, setStage] = useState<Stage>(() => {
    if (linkVote) return "login";
    try {
      return sessionStorage.getItem("hc_intro_seen") === "1" && params.get("sim") !== "1" ? "pick" : "intro";
    } catch {
      return "intro";
    }
  });
  const [heartClub, setHeartClub] = useState<ClubSearchResult | null>(linkVote?.club ?? null);
  const [email, setEmail] = useState("");
  const [newsOptIn, setNewsOptIn] = useState(!!linkVote?.news); // OPCIONAL: começa sempre desmarcada
  const [busy, setBusy] = useState<"google" | "magic" | null>(null);
  // Simpatias não são mais pedidas aqui (ficam para o painel); só preserva as que vierem num link antigo.
  const sympathies = useMemo<ClubSearchResult[]>(() => linkVote?.sympathies ?? [], [linkVote]);
  const heartSearch = useClubSearch();
  const simStarted = useRef(false);

  // Teste do Master: começa do zero como um torcedor novo (nada do perfil/voto real aparece).
  useEffect(() => {
    if (!sim || simStarted.current) return;
    simStarted.current = true;
    if (!isSimActive() || stage === "intro") startSim();
  }, [sim, stage]);

  // Escolha vinda no link: guarda no aparelho (o login com Google volta para "/" e precisa achá-la).
  // Guardada SEM o sinal de "Termos mostrados": link de fora nunca grava voto sozinho; o aceite só vale no clique de entrar.
  const linkVoteSaved = useRef(false);
  useEffect(() => {
    if (!linkVote || linkVoteSaved.current) return;
    linkVoteSaved.current = true;
    savePendingVote(linkVote.club, linkVote.sympathies);
  }, [linkVote]);
  // Já logado, ainda sem voto, e já escolheu o clube (link ?pv= ou guardado no aparelho): segue para o voto.
  useEffect(() => {
    if (!isAuthReady || isLoading || sim) return;
    if (!isAuthenticated || hasVoted || isMasterEmail((realUser ?? user)?.email)) return;
    if (linkVote || loadPendingVote()) navigate("/confirmar-voto", { replace: true });
  }, [linkVote, isAuthReady, isLoading, sim, isAuthenticated, hasVoted, realUser, user, navigate]);

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

  // ── Logo parado: some sozinho em 1,5 s (ou ao tocar na tela).
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

  const pickHeart = (club: ClubSearchResult) => {
    heartSearch.reset();
    // Já logado e sem voto (caso raro): sem o aviso dos Termos na tela, vai pela confirmação normal.
    if (!sim && isAuthenticated) {
      savePendingVote(club, []);
      navigate("/confirmar-voto", { replace: true });
      return;
    }
    setHeartClub(club);
    setStage("login");
  };

  const changeClub = () => {
    setHeartClub(null);
    heartSearch.reset();
    setStage("pick");
  };

  // Quem toca em "Continuar" já viu o aviso "Ao continuar, você aceita os Termos…" logo abaixo dos botões.
  const flags = { terms: true, news: newsOptIn };

  // No teste do Master os botões de login têm o mesmo visual, mas só avançam a tela (sem login de verdade).
  const loginGoogle = async () => {
    if (!heartClub) return;
    savePendingVote(heartClub, sympathies, flags); // antes de sair para o Google: ao voltar, o voto é gravado na hora
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
    if (!email.trim() || !heartClub) return;
    savePendingVote(heartClub, sympathies, flags);
    if (sim) {
      navigate("/confirmar-voto?sim=1");
      return;
    }
    setBusy("magic");
    try {
      const { data, error } = await supabase.functions.invoke("heart-club-auth", {
        body: {
          email: email.trim(),
          redirectOrigin: window.location.origin,
          // a escolha do time vai junto no link do e-mail (ele pode abrir em outro navegador)
          pendingVote: encodePendingVoteParam(heartClub, sympathies, flags),
        },
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

  // "Abrir no Chrome" (Android): abre esta mesma página no Chrome, levando a escolha do time se ele já escolheu.
  const openInChrome = () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("sim");
      const pv = stage === "login" && heartClub ? encodePendingVoteParam(heartClub, sympathies, { news: newsOptIn }) : null;
      if (pv) url.searchParams.set(PENDING_VOTE_PARAM, pv);
      else url.searchParams.delete(PENDING_VOTE_PARAM);
      window.location.href = buildChromeIntentUrl(url.toString());
    } catch (err) {
      console.error("[ENTRAR] não abriu no Chrome", err);
    }
  };

  if (!isAuthReady || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── 1) LOGO PARADO (sem vídeo: nada pesado no primeiro carregamento)
  if (stage === "intro") {
    return (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black"
        onClick={finishIntro}
        data-testid="entrar-intro"
      >
        <img src={logo} alt="Heart Club" className="h-40 w-40 object-contain sm:h-48 sm:w-48" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white">
      <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-6 px-4 py-8">
        {/* NAVEGADOR INTERNO (Instagram/Facebook…): o Google não deixa entrar aqui — Chrome no Android, aviso no iPhone */}
        {inApp.inApp && inApp.platform === "android" && (
          <div className="w-full space-y-2" data-testid="inapp-android">
            <Button
              onClick={openInChrome}
              className="btn-orange-gradient h-16 w-full rounded-2xl text-lg font-black italic shadow-xl shadow-primary/20 active:scale-95"
            >
              {t("entrar.inapp_open_chrome")}
            </Button>
            <p className="text-center text-xs text-white/60">{t("entrar.inapp_open_chrome_hint")}</p>
          </div>
        )}
        {inApp.inApp && inApp.platform === "ios" && (
          <p
            className="w-full rounded-2xl border border-primary/40 bg-primary/10 p-3 text-center text-sm font-bold text-white/90"
            data-testid="inapp-ios"
          >
            {t("entrar.inapp_ios_notice")}
          </p>
        )}

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

        {/* ── 3) CLUBE ESCOLHIDO NO TOPO + OPÇÕES DE ENTRAR */}
        {stage === "login" && heartClub && (
          <div className="w-full space-y-5">
            <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-card p-3" data-testid="entrar-chosen-club">
              <ClubLogo src={heartClub.logo} alt={heartClub.name} size="md" />
              <p className="flex-1 truncate text-lg font-black uppercase italic">{heartClub.name}</p>
              <Heart className="h-5 w-5 fill-current text-primary" />
            </div>
            <div className="space-y-2 text-center">
              <h1 className="text-3xl font-black italic uppercase tracking-tighter">{t("entrar.login_title")}</h1>
              <p className="text-sm text-white/60">{t("entrar.login_sub")}</p>
            </div>

            <div className="space-y-4">
              {/* Novidades por e-mail (LGPD): OPCIONAL e desmarcada; fica ACIMA dos botões para valer no toque de entrar */}
              <label htmlFor="news-optin" className="flex cursor-pointer items-start gap-3 text-xs leading-snug text-white/70">
                <Checkbox
                  id="news-optin"
                  checked={newsOptIn}
                  onCheckedChange={(v) => setNewsOptIn(v === true)}
                  className="mt-0.5"
                />
                <span>{t("entrar.news_optin")}</span>
              </label>

              {!inApp.inApp && (
                <>
                  {/* mesmo estilo do botão de Google da página /login: fundo escuro, borda fina, logo colorido, texto claro */}
                  <Button
                    variant="outline"
                    onClick={loginGoogle}
                    disabled={!!busy}
                    className="glass-card-hover h-14 w-full border-border/50 text-base font-medium text-foreground"
                  >
                    {busy === "google" ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <GoogleIcon />}
                    {t("entrar.google")}
                  </Button>
                  <div className="flex items-center gap-3 text-[11px] uppercase text-white/40">
                    <div className="h-px flex-1 bg-white/10" />
                    {t("entrar.or_email")}
                    <div className="h-px flex-1 bg-white/10" />
                  </div>
                </>
              )}
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
                  variant={inApp.inApp ? "default" : "outline"}
                  className={inApp.inApp ? "btn-orange-gradient h-14 w-full gap-2 rounded-xl font-bold" : "h-12 w-full gap-2 rounded-xl font-bold"}
                >
                  {busy === "magic" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  {t("entrar.send_link")}
                </Button>
              </form>

              {/* Aviso dos Termos logo abaixo das opções de entrar: continuar = aceitar (registrado junto com o voto) */}
              <p className="text-center text-xs leading-snug text-white/60" data-testid="entrar-terms-notice">
                {t("entrar.terms_notice_pre")}
                <Link to="/termos" target="_blank" className="text-primary underline">
                  {t("entrar.terms_link")}
                </Link>
                {t("entrar.terms_and")}
                <Link to="/privacidade" target="_blank" className="text-primary underline">
                  {t("entrar.privacy_link")}
                </Link>
                .
              </p>
            </div>
            <p className="text-center text-xs text-white/50">{t("entrar.privacy_line")}</p>
            <button
              onClick={changeClub}
              className="mx-auto block text-xs font-bold uppercase text-white/40 hover:text-white/70"
            >
              {t("entrar.change_club")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Entrar;
