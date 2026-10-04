/**
 * [CAMINHO]: src/pages/ConfirmarVoto.tsx
 * [MÓDULO]: Último passo do fluxo novo: o torcedor JÁ fez o login, marca o quadradinho dos
 * Termos e confirma ("SIM, EU JURO!"). Só então o voto é gravado (src/lib/submit-vote.ts).
 *
 * Modo simulação do Master (?sim=1): faz tudo igual, MAS NÃO GRAVA NADA — e depois mostra os
 * cartões "por que pedimos" que o torcedor vê no Dashboard, um de cada vez.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Heart, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import { useTranslationApp } from "@/hooks/useTranslationApp";
import { isMasterEmail } from "@/lib/master";
import { NEW_ENTRY_FLOW_ENABLED, clearPendingVote, loadPendingVote } from "@/lib/entry-flow";
import { submitVote } from "@/lib/submit-vote";
import { setSimClub, setSimSympathies } from "@/lib/sim-fan";
import { ClubLogo } from "@/components/ClubLogo";
import logo from "@/assets/logo.png";

const ConfirmarVoto = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { t } = useTranslationApp();
  const { toast } = useToast();
  const { user, realUser, profile, isAuthReady, isLoading, isAuthenticated, hasVoted, refreshProfile, updateProfile } = useUser();

  const isMaster = isMasterEmail((realUser ?? user)?.email);
  const sim = isMaster && params.get("sim") === "1";
  const pending = useMemo(() => loadPendingVote(), []);

  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ── Porteiro
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
    if (!sim && !isAuthenticated) {
      navigate("/entrar", { replace: true });
      return;
    }
    if (!sim && hasVoted) {
      navigate("/dashboard", { replace: true });
      return;
    }
    if (!pending) navigate(sim ? "/entrar?sim=1" : "/entrar", { replace: true });
  }, [isAuthReady, isLoading, isMaster, sim, isAuthenticated, hasVoted, pending, navigate]);

  if (!isAuthReady || isLoading || !pending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const club = pending.club;

  const confirm = async () => {
    if (!accepted) {
      toast({ variant: "destructive", title: t("entrar.terms_required") });
      return;
    }
    if (sim) {
      // Teste do Master: o torcedor novo "votou" — cai no Dashboard normal, sem gravar nada.
      setSimClub(club.name);
      setSimSympathies(pending.sympathies.map((x) => x.name));
      clearPendingVote();
      navigate("/dashboard", { replace: true });
      return;
    }
    if (!user) return;
    setSubmitting(true);
    try {
      await submitVote({
        user,
        profile,
        heartClub: club,
        sympathyClubs: pending.sympathies,
        updateProfile,
        refreshProfile,
      });
      clearPendingVote();
      toast({ title: t("entrar.vote_ok") });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error("[CONFIRMAR_VOTO] erro:", err);
      toast({ variant: "destructive", title: t("entrar.vote_error") });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-white">
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 px-4 py-8">
        <img src={logo} alt="Heart Club" className="h-20 w-20 object-contain" />

        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">{t("entrar.confirm_title")}</h1>
          <p className="text-base text-white/70">{t("entrar.confirm_sub", { club: club.name })}</p>
        </div>

        <div className="flex w-full items-center gap-3 rounded-2xl border-2 border-primary bg-card p-4">
          <ClubLogo src={club.logo} alt={club.name} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-black uppercase italic tracking-tighter">{club.name}</p>
            <p className="text-[10px] font-bold uppercase text-white/50">{club.location}</p>
          </div>
          <Heart className="h-6 w-6 fill-current text-primary" />
        </div>

        {pending.sympathies.length > 0 && (
          <div className="w-full space-y-2">
            <p className="text-xs font-black uppercase italic text-white/50">{t("entrar.sympathies_label")}</p>
            <div className="flex flex-wrap gap-2">
              {pending.sympathies.map((s) => (
                <span key={s.name} className="flex items-center gap-2 rounded-full border border-white/10 bg-card px-3 py-1.5 text-xs font-bold uppercase">
                  <ClubLogo src={s.logo} alt={s.name} size="xs" /> {s.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* QUADRADINHO DOS TERMOS — no momento certo: depois do login, antes de gravar o voto */}
        <label
          htmlFor="accept-terms-vote"
          className="flex w-full cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
        >
          <Checkbox
            id="accept-terms-vote"
            checked={accepted}
            onCheckedChange={(v) => setAccepted(v === true)}
            className="mt-0.5"
          />
          <span className="text-sm leading-snug text-white/80">
            {t("entrar.terms_pre")}
            <Link to="/termos" target="_blank" className="text-primary underline" onClick={(e) => e.stopPropagation()}>
              {t("entrar.terms_link")}
            </Link>
            {t("entrar.terms_and")}
            <Link to="/privacidade" target="_blank" className="text-primary underline" onClick={(e) => e.stopPropagation()}>
              {t("entrar.privacy_link")}
            </Link>
            .
          </span>
        </label>

        <p className="flex items-start gap-2 text-xs text-white/50">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          {t("entrar.privacy_line")}
        </p>

        <Button
          onClick={confirm}
          disabled={!accepted || submitting}
          className="btn-orange-gradient h-16 w-full rounded-2xl text-xl font-black italic shadow-xl shadow-primary/20 active:scale-95 disabled:opacity-40"
        >
          {submitting ? <Loader2 className="h-6 w-6 animate-spin" /> : t("entrar.yes_swear")}
        </Button>
        <button
          onClick={() => navigate(sim ? "/entrar?sim=1" : "/entrar")}
          disabled={submitting}
          className="text-xs font-bold uppercase text-white/40 hover:text-white/70"
        >
          {t("entrar.back")}
        </button>
      </div>
    </div>
  );
};

export default ConfirmarVoto;
