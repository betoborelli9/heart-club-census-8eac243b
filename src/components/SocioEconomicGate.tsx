/**
 * Card + trava do PERFIL SOCIOECONÔMICO (renda familiar + profissão) na página
 * de Ranking e Estatísticas. Só aparece quando a chavinha "form_socio" estiver
 * LIGADA no Admin e o torcedor ainda não tiver respondido. Se não for possível
 * ler a chavinha ou o perfil, NÃO aparece e nada trava. Sempre dá pra voltar
 * ao início.
 *
 * Grava no mesmo formato que o relatório socioeconômico do Admin já entende:
 * classe_social = letra A–E (faixas do IBGE, em salários mínimos) e
 * profissao = texto (a estimativa de renda do relatório reconhece as profissões).
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import { useFeatureFlag } from "@/lib/feature-flags";
import { supabase } from "@/integrations/supabase/client";
import FormReasonCard from "@/components/FormReasonCard";
import ProfessionAutocomplete from "@/components/ProfessionAutocomplete";

// Faixas de renda familiar (IBGE, em salários mínimos) → classe A–E.
const INCOME_OPTIONS: { value: string; label: string }[] = [
  { value: "E", label: "Até 2 salários mínimos" },
  { value: "D", label: "De 2 a 4 salários mínimos" },
  { value: "C", label: "De 4 a 10 salários mínimos" },
  { value: "B", label: "De 10 a 20 salários mínimos" },
  { value: "A", label: "Mais de 20 salários mínimos" },
  { value: "ND", label: "Prefiro não dizer" },
];

export default function SocioEconomicGate() {
  const { user, profile, isAuthenticated, refreshProfile } = useUser();
  const flag = useFeatureFlag("form_socio");
  const navigate = useNavigate();
  const { toast } = useToast();
  const [renda, setRenda] = useState("");
  const [profissao, setProfissao] = useState("");
  const [saving, setSaving] = useState(false);

  const p = profile as any;
  const faltaRenda = !p?.classe_social;
  const faltaProfissao = !p?.profissao || !String(p.profissao).trim();
  const needs = flag.enabled && isAuthenticated && !!user && !!profile && (faltaRenda || faltaProfissao);

  if (!needs) return null;

  const canSave = (!faltaRenda || !!renda) && (!faltaProfissao || profissao.trim().length >= 2);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const patch: Record<string, string> = {};
    if (faltaRenda && renda) patch.classe_social = renda;
    if (faltaProfissao && profissao.trim()) patch.profissao = profissao.trim();
    const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
    if (error) {
      setSaving(false);
      toast({ variant: "destructive", title: "Não deu pra salvar agora", description: "Tente de novo em instantes." });
      return;
    }
    await refreshProfile().catch(() => {});
    setSaving(false);
    toast({ title: "Obrigado! Seu time agora pesa mais no ranking." });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/95 p-4 backdrop-blur-xl sm:items-center">
      <div className="w-full max-w-md py-6">
        <FormReasonCard
          icon={BarChart3}
          step="Ranking e Estatísticas"
          title="Descubra quanto vale a sua torcida"
          subtitle="Duas respostas rápidas e o ranking completo é seu."
          reasons={[
            "Perfil da Torcida: veja que profissões e realidades formam a torcida do seu clube.",
            "Libera o Ranking e as Estatísticas completas.",
            "Leva uns 20 segundos.",
          ]}
        >
          <div className="space-y-4">
            {faltaRenda && (
              <div className="space-y-2">
                <p className="text-[11px] font-black uppercase tracking-widest text-white/50">Renda da sua família</p>
                <div className="grid grid-cols-1 gap-1.5">
                  {INCOME_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setRenda(o.value)}
                      className={`rounded-xl border px-3.5 py-2.5 text-left text-sm transition-colors ${
                        renda === o.value
                          ? "border-primary bg-primary/15 text-white"
                          : "border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.07]"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {faltaProfissao && (
              <div className="space-y-2">
                <p className="text-[11px] font-black uppercase tracking-widest text-white/50">Sua profissão</p>
                <ProfessionAutocomplete value={profissao} onChange={setProfissao} />
              </div>
            )}

            <Button
              onClick={save}
              disabled={!canSave || saving}
              className="h-12 w-full rounded-xl font-black uppercase italic btn-orange-gradient"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar e ver o ranking
            </Button>
            <button
              onClick={() => navigate("/dashboard")}
              className="w-full text-center text-xs text-white/40 underline underline-offset-2 hover:text-white/70"
            >
              Agora não — voltar ao início
            </button>
          </div>
        </FormReasonCard>
      </div>
    </div>
  );
}
