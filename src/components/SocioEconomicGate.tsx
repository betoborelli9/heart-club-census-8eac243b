/**
 * Cartão + trava do PERFIL DA TORCIDA (só a área/profissão) na página de Ranking e Estatísticas.
 * Só aparece quando a chavinha "form_socio" estiver LIGADA no Admin (ou no teste de torcedor novo
 * do Master) e o torcedor ainda não tiver respondido. Se não for possível ler a chavinha ou o
 * perfil, NÃO aparece e nada trava. Sempre dá pra voltar ao início.
 *
 * Nada de dinheiro: o torcedor NÃO responde renda nem vê palavras ligadas a dinheiro. Só grava
 * profissao (texto); o relatório do Admin estima o perfil econômico a partir da profissão.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import { useFeatureFlag } from "@/lib/feature-flags";
import { supabase } from "@/integrations/supabase/client";
import { useTranslationApp } from "@/hooks/useTranslationApp";
import FormReasonCard from "@/components/FormReasonCard";
import ProfessionAutocomplete from "@/components/ProfessionAutocomplete";

export default function SocioEconomicGate() {
  const { user, profile, isAuthenticated, refreshProfile } = useUser();
  const flag = useFeatureFlag("form_socio");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslationApp();
  const [profissao, setProfissao] = useState("");
  const [saving, setSaving] = useState(false);

  const p = profile as any;
  const faltaProfissao = !p?.profissao || !String(p.profissao).trim();
  const needs = flag.enabled && isAuthenticated && !!user && !!profile && faltaProfissao;

  if (!needs) return null;

  const canSave = profissao.trim().length >= 2;

  const save = async () => {
    if (!user || !canSave) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ profissao: profissao.trim() }).eq("id", user.id);
    if (error) {
      setSaving(false);
      toast({ variant: "destructive", title: t("entrar.rank_error") });
      return;
    }
    await refreshProfile().catch(() => {});
    setSaving(false);
    toast({ title: t("entrar.rank_thanks") });
  };

  return (
    <div className="fixed inset-0 z-[9000] flex items-start justify-center overflow-y-auto bg-black/95 p-4 backdrop-blur-xl sm:items-center">
      <div className="w-full max-w-md py-6">
        <FormReasonCard
          icon={BarChart3}
          step={t("entrar.rank_step")}
          title={t("entrar.rank_title")}
          subtitle={t("entrar.rank_sub")}
          reasons={[t("entrar.rank_1"), t("entrar.rank_2"), t("entrar.rank_3")]}
          privacyNote={t("entrar.rank_privacy")}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-widest text-white/50">{t("entrar.rank_label")}</p>
              <ProfessionAutocomplete value={profissao} onChange={setProfissao} placeholder={t("entrar.rank_placeholder")} />
            </div>

            <Button
              onClick={save}
              disabled={!canSave || saving}
              className="h-12 w-full rounded-xl font-black uppercase italic btn-orange-gradient"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("entrar.rank_cta")}
            </Button>
            <button
              onClick={() => navigate("/dashboard")}
              className="w-full text-center text-xs text-white/40 underline underline-offset-2 hover:text-white/70"
            >
              {t("entrar.rank_back")}
            </button>
          </div>
        </FormReasonCard>
      </div>
    </div>
  );
}
