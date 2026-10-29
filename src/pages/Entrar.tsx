/**
 * [CAMINHO]: src/pages/Entrar.tsx
 * [MÓDULO]: Porta de entrada do torcedor — SÓ DUAS AÇÕES:
 *  1) Escolher o time: digita o clube do coração e toca nele.
 *  2) Entrar: com o clube no topo aparecem "Continuar com Google" e o link por e-mail, com o aviso dos Termos.
 * O voto é gravado em /confirmar-voto assim que o torcedor volta do login (Google) ou abre o link do e-mail,
 * e o aceite dos Termos é registrado junto. Sem "Juro lealdade", sem "Confirme seu voto", sem simpatias
 * (as simpatias são opcionais e ficam no painel).
 *
 * Dentro do Instagram/Facebook o Google é bloqueado: o botão é o MESMO "Continuar com Google".
 *  - Android: abre esta página no Chrome (levando o clube) e o login com Google começa SOZINHO ao chegar lá (?go=google).
 *  - iPhone: avisa para abrir no navegador; o link por e-mail funciona normalmente.
 *
 * Aparelho que já teve um voto e voltou sem login vê "Bem-vindo de volta!" no lugar da busca.
 * Segurança: enquanto NEW_ENTRY_FLOW_ENABLED for false, esta rota só abre para o Master em modo teste (?sim=1).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Heart, Loader2, Mail, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslationApp } from "@/hooks/useTranslationApp";
import { isMasterEmail } from "@/lib/master";
import {
  AUTO_GOOGLE_PARAM,
  NEW_ENTRY_FLOW_ENABLED,
  PENDING_VOTE_PARAM,
  decodePendingVoteParam,
  deviceHasVoted,
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
const AUTO_GOOGLE_GUARD_KEY = "hc_auto_google_at";
const AUTO_GOOGLE_GUARD_MS = 60_000; // evita laço se o torcedor voltar do Google com o "voltar" do navegador

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
  // Link com a escolha do time (vindo do Instagram pelo Chrome): o torcedor já escolheu, vai direto às opções de entrar.
  const linkVote = useMemo(() => (params.get("sim") === "1" ? null : decodePendingVoteParam(params.get(PENDING_VOTE_PARAM))), []); // eslint-disable-line react-hooks/exhaustive-deps
  // Veio do Instagram para o Chrome pedindo para o login com Google começar sozinho.
  const wantsAutoGoogle = useMemo(() => params.get("sim") !== "1" && params.get(AUTO_GOOGLE_PARAM) === "google", []); // eslint-disable-line react-hooks/exhaustive-deps

  const [stage, setStage] = useState<Stage>(() => {
    if (linkVote) return "login";
    try {
      return sessionStorage.getItem("hc_intro_seen") === "1" && params.get("sim") !== "1" ? "pick" : "intro";
    } catch {
      return "intro";
    }
  });
  const [heartClub, setHeartClub] = useState<ClubSearchResult | null>(linkVote?.club ?? null);
  // Este aparelho já teve um torcedor que votou: quem volta sem login vê "Bem-vindo de volta!" no lugar da busca.
  const [returning, setReturning] = useState(() => !linkVote && params.get("sim") !== "1" && deviceHasVoted());
  const showWelcomeBack = returning && !isAuthenticated && !sim;
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<"google" | "magic" | null>(null);
  const [iosHint, setIosHint] = useState(false);
  // Simpatias não são mais pedidas aqui (ficam para o painel); só preserva as que vierem num link antigo.
  const sympathies = useMemo<ClubSearchResult[]>(() => linkVote?.sympathies ?? [], [linkVote]);
  const heartSearch = useClubSearch();
  const simStarted = useRef(false);
  const autoGoogleStarted = useRef(false);

  // Nada nesta tela pode alargar a página no celular (o Chrome do Android "estica" a tela e corta o lado direito):
  // enquanto a porta de entrada está aberta, o que passar da borda é cortado em vez de empurrar o resto.
  useEffect(() => {
    const root = document.documentElement;
    const before = root.style.overflowX;
    root.style.overflowX = "clip";
    return () => {
      root.style.overflowX = before;
    };
  }, []);

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
    setIosHint(false);
    heartSearch.reset();
    setStage("pick");
  };

  // Quem toca em "Continuar" já viu o aviso "Ao continuar, você aceita os Termos…" logo abaixo dos botões.
  const flags = { terms: true };

  // Login com Google no navegador de verdade. Com clube escolhido, guarda a escolha ANTES de sair para o Google:
  // ao voltar, o voto é gravado na hora. No teste do Master só avança a tela (sem login de verdade).
  const startGoogle = useCallback(async () => {
    const choosing = stage === "login" && heartClub;
    if (choosing) savePendingVote(heartClub, sympathies, flags);
    if (sim) {
      if (choosing) navigate("/confirmar-voto?sim=1");
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, heartClub, sympathies, sim, navigate, toast, t]);

  // Android dentro do Instagram/Facebook: abre ESTA página no Chrome (levando o clube escolhido) e o Google começa sozinho lá.
  const openInChromeForGoogle = () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("sim");
      const pv = stage === "login" && heartClub ? encodePendingVoteParam(heartClub, sympathies) : null;
      if (pv) url.searchParams.set(PENDING_VOTE_PARAM, pv);
      else url.searchParams.delete(PENDING_VOTE_PARAM);
      url.searchParams.set(AUTO_GOOGLE_PARAM, "google");
      setBusy("google");
      window.location.href = buildChromeIntentUrl(url.toString());
      // se o Chrome não abrir, o botão volta ao normal (nada fica travado)
      setTimeout(() => setBusy((b) => (b === "google" ? null : b)), 4000);
    } catch (err) {
      console.error("[ENTRAR] não abriu no Chrome", err);
      setBusy(null);
    }
  };

  // O MESMO botão "Continuar com Google" em qualquer navegador; o que ele faz depende de onde a página está aberta.
  const onGoogleClick = () => {
    if (inApp.inApp && inApp.platform === "android") return openInChromeForGoogle();
    if (inApp.inApp && inApp.platform === "ios") return setIosHint(true);
    void startGoogle();
  };

  // Chegou no Chrome vindo do Instagram com ?go=google: o login com Google começa sozinho, sem outro toque.
  useEffect(() => {
    if (!wantsAutoGoogle || autoGoogleStarted.current || inApp.inApp || sim) return;
    if (!isAuthReady || isLoading || isAuthenticated) return;
    autoGoogleStarted.current = true;
    // tira o ?go=google do endereço: se o torcedor voltar do Google com "voltar", não começa de novo sozinho
    try {
      const clean = new URL(window.location.href);
      clean.searchParams.delete(AUTO_GOOGLE_PARAM);
      window.history.replaceState(window.history.state, "", clean.pathname + clean.search + clean.hash);
    } catch {
      /* ignora */
    }
    try {
      const last = Number(sessionStorage.getItem(AUTO_GOOGLE_GUARD_KEY) || 0);
      if (last && Date.now() - last < AUTO_GOOGLE_GUARD_MS) return;
      sessionStorage.setItem(AUTO_GOOGLE_GUARD_KEY, String(Date.now()));
    } catch {
      /* sem armazenamento: segue */
    }
    void startGoogle();
  }, [wantsAutoGoogle, inApp.inApp, sim, isAuthReady, isLoading, isAuthenticated, startGoogle]);

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
          // a escolha do time vai junto no link do e-mail (ele pode abrir em outro navegador) e fica guardada como voto pendente
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

  // "Bem-vindo de volta!": só entra na conta por e-mail. NÃO guarda escolha de clube nem grava voto.
  const welcomeMagic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy("magic");
    try {
      const { data, error } = await supabase.functions.invoke("heart-club-auth", {
        body: { email: email.trim(), redirectOrigin: window.location.origin },
      });
      if (error || (data && (data as any).error)) throw new Error("auth_failed");
      toast({ title: t("entrar.link_sent") });
    } catch (err) {
      console.error("[ENTRAR] link por e-mail (volta) falhou", err);
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

  // ── LOGO PARADO (sem vídeo: nada pesado no primeiro carregamento)
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

  // Botão "Continuar com Google" + aviso curto do iPhone (usados na tela de voto e na de "bem-vindo de volta")
  const googleBlock = (
    <>
      <Button
        variant="outline"
        onClick={onGoogleClick}
        disabled={!!busy}
        className="glass-card-hover h-14 w-full border-border/50 text-base font-medium text-foreground"
      >
        {busy === "google" ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <GoogleIcon />}
        {t("entrar.google")}
      </Button>
      {iosHint && inApp.inApp && inApp.platform === "ios" && (
        <p
          className="w-full rounded-xl border border-primary/40 bg-primary/10 p-3 text-center text-sm font-bold text-white/90"
          data-testid="inapp-ios"
          role="status"
        >
          {t("entrar.inapp_ios_tap")}
        </p>
      )}
      <div className="flex items-center gap-3 text-[11px] uppercase text-white/40">
        <div className="h-px flex-1 bg-white/10" />
        {t("entrar.or_email")}
        <div className="h-px flex-1 bg-white/10" />
      </div>
    </>
  );

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-background text-white">
      <div className="mx-auto flex w-full min-w-0 max-w-lg flex-col items-center gap-6 px-4 py-8">
        <img src={logo} alt="Heart Club" className="h-20 w-20 object-contain" />

        {/* ── BEM-VINDO DE VOLTA (aparelho que já teve um voto, sem login) */}
        {stage === "pick" && showWelcomeBack && (
          <div className="w-full min-w-0 space-y-5" data-testid="entrar-welcome-back">
            <div className="space-y-2 text-center">
              <h1 className="text-3xl font-black italic uppercase leading-tight tracking-tighter">{t("entrar.back_title")}</h1>
              <p className="text-sm text-white/60">{t("entrar.back_sub")}</p>
            </div>
            <div className="space-y-4">
              {googleBlock}
              <form onSubmit={welcomeMagic} className="space-y-3">
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
            <button
              onClick={() => setReturning(false)}
              className="mx-auto block text-xs text-white/40 underline underline-offset-2 hover:text-white/70"
            >
              {t("entrar.back_not_me")}
            </button>
          </div>
        )}

        {/* ── AÇÃO 1: ESCOLHER O TIME */}
        {stage === "pick" && !showWelcomeBack && (
          <div className="w-full min-w-0 space-y-5">
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
                open={heartSearch.open && heartSearch.query.trim().length >= 3} // sem "Nenhum clube encontrado" antes de digitar
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

        {/* ── AÇÃO 2: ENTRAR (clube escolhido no topo) */}
        {stage === "login" && heartClub && (
          <div className="w-full min-w-0 space-y-5">
            <div
              className="flex w-full min-w-0 items-center gap-3 rounded-2xl border border-primary/30 bg-card p-3"
              data-testid="entrar-chosen-club"
            >
              <ClubLogo src={heartClub.logo} alt={heartClub.name} size="md" />
              <p className="min-w-0 flex-1 truncate text-lg font-black uppercase italic">{heartClub.name}</p>
              <Heart className="h-5 w-5 shrink-0 fill-current text-primary" />
            </div>
            <div className="space-y-2 text-center">
              <h1 className="text-3xl font-black italic uppercase tracking-tighter">{t("entrar.login_title")}</h1>
              <p className="text-sm text-white/60">{t("entrar.login_sub")}</p>
            </div>

            <div className="w-full min-w-0 space-y-4">
              {googleBlock}
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
