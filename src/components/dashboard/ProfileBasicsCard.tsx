/**
 * [CAMINHO]: src/components/dashboard/ProfileBasicsCard.tsx
 * [MÓDULO]: Cartão "Conte um pouco sobre você" (ano de nascimento + gênero) com o "por que pedimos".
 * Aparece no Dashboard SÓ para o torcedor que já votou e ainda não informou esses dois dados
 * (quem entra pelo fluxo novo). Quem já tem os dois nunca vê. "Agora não" some por 24 h.
 */
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import { useTranslationApp } from "@/hooks/useTranslationApp";
import { ReasonCard } from "@/components/entrar/reasonCards";

const DISMISS_KEY = "hc_basics_dismissed_at";
const HIDE_MS = 24 * 60 * 60 * 1000;

const dismissedRecently = () => {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return !!at && Date.now() - at < HIDE_MS;
  } catch {
    return false;
  }
};

export default function ProfileBasicsCard() {
  const { t } = useTranslationApp();
  const { toast } = useToast();
  const { profile, hasVoted, updateProfile } = useUser();
  const [hidden, setHidden] = useState(dismissedRecently);
  const [ano, setAno] = useState("");
  const [genero, setGenero] = useState("");
  const [saving, setSaving] = useState(false);

  const missing = !!profile && (!profile.data_nascimento || !profile.genero);
  if (!hasVoted || !missing || hidden) return null;

  const year = new Date().getFullYear();
  const anos = Array.from({ length: year - 1920 + 1 }, (_, i) => String(year - i));

  const save = async () => {
    if (!ano || !genero) return;
    setSaving(true);
    try {
      await updateProfile({ data_nascimento: `${ano}-01-01`, genero });
      toast({ title: "✓" });
    } catch {
      toast({ variant: "destructive", title: t("entrar.vote_error") });
    } finally {
      setSaving(false);
    }
  };

  const notNow = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignora */
    }
    setHidden(true);
  };

  return (
    <div className="mx-auto w-full max-w-xl">
      <ReasonCard id="basics">
        <div className="grid grid-cols-2 gap-2">
          <Select value={genero} onValueChange={setGenero}>
            <SelectTrigger className="h-12 rounded-xl border-white/10 bg-card">
              <SelectValue placeholder={t("voting.sex_placeholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="masculino">{t("voting.male")}</SelectItem>
              <SelectItem value="feminino">{t("voting.female")}</SelectItem>
              <SelectItem value="outros">{t("voting.other")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={ano} onValueChange={setAno}>
            <SelectTrigger className="h-12 rounded-xl border-white/10 bg-card">
              <SelectValue placeholder={t("voting.birth_year_label")} />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {anos.map((y) => (
                <SelectItem key={y} value={y}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={save}
            disabled={!ano || !genero || saving}
            className="btn-orange-gradient h-12 flex-1 rounded-xl font-black uppercase italic"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : t("voting.continue")}
          </Button>
          <Button variant="ghost" onClick={notNow} className="h-12 rounded-xl text-xs font-bold uppercase text-white/50">
            {t("entrar.sim_skip")}
          </Button>
        </div>
      </ReasonCard>
    </div>
  );
}
