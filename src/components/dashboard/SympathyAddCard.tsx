/**
 * [CAMINHO]: src/components/dashboard/SympathyAddCard.tsx
 * [MÓDULO]: Cartão simples do painel, depois do voto: "Adicione até 4 times de simpatia (opcional)".
 * As simpatias saíram da porta de entrada; aqui o torcedor preenche as que quiser, uma de cada vez.
 * No banco só dá para PREENCHER uma simpatia vazia (trocar ou apagar uma já gravada continua bloqueado), e o clube
 * do coração nunca muda. No teste do Master (simulação) nada é gravado.
 */
import { useEffect, useState } from "react";
import { Heart, Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import { useTranslationApp } from "@/hooks/useTranslationApp";
import { supabase } from "@/integrations/supabase/client";
import { isValidClubName, persistClubsIfMissing, type ClubSearchResult } from "@/lib/search-clubs";
import { setSimSympathies } from "@/lib/sim-fan";
import { ResultsList, useClubSearch } from "@/components/entrar/ClubSearchBox";

const MAX_SYMPATHIES = 4;
const norm = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

interface Props {
  heartClubName: string | null;
  sympathies: string[];
  onChanged: (names: string[]) => void;
}

export default function SympathyAddCard({ heartClubName, sympathies, onChanged }: Props) {
  const { t } = useTranslationApp();
  const { toast } = useToast();
  const { user, simActive } = useUser();
  const search = useClubSearch();
  const [saving, setSaving] = useState(false);
  const dismissKey = `hc_sympathy_card_dismissed_${user?.id ?? "x"}`;
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(dismissKey) === "1");
    } catch {
      setDismissed(false);
    }
  }, [dismissKey]);

  if (!user || !heartClubName || dismissed || sympathies.length >= MAX_SYMPATHIES) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(dismissKey, "1");
    } catch {
      /* sem armazenamento: o cartão só volta na próxima visita */
    }
    setDismissed(true);
  };

  const add = async (club: ClubSearchResult) => {
    search.reset();
    if (saving) return;
    if (!isValidClubName(club.name)) return;
    if (norm(club.name) === norm(heartClubName) || sympathies.some((s) => norm(s) === norm(club.name))) {
      toast({ title: t("sympathy_card.already") });
      return;
    }
    setSaving(true);
    try {
      if (simActive) {
        // teste do Master: o torcedor de mentira só guarda na memória da aba
        setSimSympathies([...sympathies, club.name]);
        onChanged([...sympathies, club.name]);
        return;
      }
      // Preenche a primeira simpatia VAZIA do voto original (o banco só deixa preencher vazias, nunca trocar).
      const { data: vote, error: readError } = await supabase
        .from("votos")
        .select("id, sympathy_1, sympathy_2, sympathy_3, sympathy_4")
        .eq("user_id", user.id)
        .eq("is_original_vote", true)
        .maybeSingle();
      if (readError || !vote) throw readError ?? new Error("sem_voto");
      const slots = [vote.sympathy_1, vote.sympathy_2, vote.sympathy_3, vote.sympathy_4] as (string | null)[];
      const free = slots.findIndex((s) => !s);
      if (free === -1) {
        onChanged(slots.filter(Boolean) as string[]);
        return;
      }
      const column = `sympathy_${free + 1}`;
      const { data: updated, error: updateError } = await supabase
        .from("votos")
        .update({ [column]: club.name } as any)
        .eq("id", vote.id)
        .is(column as any, null)
        .select("id");
      if (updateError || !updated || updated.length === 0) throw updateError ?? new Error("nao_salvou");
      if (club.source === "api") await persistClubsIfMissing([club]).catch(() => {});
      onChanged([...(slots.filter(Boolean) as string[]), club.name]);
      toast({ title: t("sympathy_card.saved", { club: club.name }) });
    } catch (err) {
      console.error("[SIMPATIAS] não salvou", err);
      toast({ variant: "destructive", title: t("sympathy_card.error") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="fade-in w-full" data-testid="sympathy-add-card">
      <div className="glass-card relative rounded-[32px] p-4 md:p-6">
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("sympathy_card.dismiss")}
          className="absolute right-4 top-4 text-white/30 hover:text-white/70"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="mb-3 flex items-start gap-3 pr-6">
          <Heart className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0">
            <h3 className="text-sm font-black italic uppercase leading-tight">{t("sympathy_card.title")}</h3>
            <p className="mt-1 text-xs text-white/50">{t("sympathy_card.sub", { count: MAX_SYMPATHIES - sympathies.length })}</p>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary opacity-60" />
          <Input
            value={search.query}
            onChange={(e) => search.setQuery(e.target.value)}
            onFocus={() => search.setOpen(true)}
            onBlur={() => setTimeout(() => search.setOpen(false), 200)}
            placeholder={t("sympathy_card.placeholder")}
            disabled={saving}
            className="h-12 rounded-xl border-white/10 bg-card pl-11"
          />
          {saving && <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary" />}
          <ResultsList results={search.results} loading={search.loading} open={search.open && search.query.trim().length >= 3} onPick={add} />
        </div>
      </div>
    </section>
  );
}
