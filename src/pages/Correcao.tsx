/**
 * [CAMINHO/ARQUIVO]: src/pages/Correcao.tsx
 * [MÓDULO]: CORREÇÃO DE DADOS DO CLUBE DO CORAÇÃO
 * [DESCRIÇÃO]: Página onde o torcedor sugere correções para o seu clube.
 *  - Só permite editar o clube do coração (is_original_vote = true).
 *  - Envia para a edge function apply-club-correction (validação por IA).
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Send, CheckCircle2, XCircle, Sparkles, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { resolveColorToHex } from "@/lib/color-names";
import RivalsCombobox from "@/components/correcao/RivalsCombobox";
import logo from "@/assets/logo.png";
import { useTranslationApp } from "@/hooks/useTranslationApp";

const COLOR_FIELDS = ["cor_primaria", "cor_secundaria", "cor_terciaria", "cor_quarta"] as const;

interface CacheRow {
  id: number;
  nome: string;
  cor_primaria: string | null;
  cor_secundaria: string | null;
  cor_terciaria: string | null;
  cor_quarta: string | null;
  mascote: string | null;
  fundado: number | null;
  cidade: string | null;
  pais: string | null;
  estadio_nome: string | null;
  estadio_cidade: string | null;
  estadio_capacidade: number | null;
  tem_feminino: boolean | null;
  nome_curto: string | null;
  division: string | null;
  rivais: string[] | null;
}

export default function Correcao() {
  const navigate = useNavigate();
  const { user, isLoading } = useUser();
  const { toast } = useToast();
  const { t } = useTranslationApp();

  const [clubName, setClubName] = useState<string | null>(null);
  const [cache, setCache] = useState<CacheRow | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [rivais, setRivais] = useState<string[]>([]);
  const [feminino, setFeminino] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [colorErrors, setColorErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate("/login");
      return;
    }
    (async () => {
      const { data: vote } = await supabase
        .from("votos")
        .select("clube_nome")
        .eq("user_id", user.id)
        .eq("is_original_vote", true)
        .maybeSingle();

      if (!vote?.clube_nome) {
        toast({ title: t("correction.no_vote_title"), description: t("correction.no_vote_desc") });
        navigate("/voting");
        return;
      }
      setClubName(vote.clube_nome);

      const { data } = await supabase
        .from("clubes_cache")
        .select("*")
        .ilike("nome", vote.clube_nome)
        .maybeSingle();

      setCache((data as CacheRow) || null);
      setFeminino(Boolean(data?.tem_feminino));
      setRivais(Array.isArray(data?.rivais) ? (data!.rivais as string[]) : []);
      setLoading(false);
    })();
  }, [user, isLoading, navigate, toast]);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!cache) return;
    const corrections: Array<{ field: string; value: string }> = [];
    const newColorErrors: Record<string, string> = {};

    for (const [k, v] of Object.entries(form)) {
      const val = (v ?? "").trim();
      if (!val) continue;

      // Cores: aceita HEX OU nome ("preto", "azul marinho", "verde bandeira"...).
      if ((COLOR_FIELDS as readonly string[]).includes(k)) {
        const hex = resolveColorToHex(val);
        if (!hex) {
          newColorErrors[k] = t("correction.color_invalid", { val });
          continue;
        }
        corrections.push({ field: k, value: hex });
        continue;
      }

      corrections.push({ field: k, value: val });
    }

    setColorErrors(newColorErrors);
    if (Object.keys(newColorErrors).length > 0) {
      toast({
        title: t("correction.color_invalid_title"),
        description: t("correction.color_invalid_desc"),
        variant: "destructive",
      });
      return;
    }

    // Rivais (multi-select) — só envia se a lista mudou em relação ao cache
    const rivaisAtuais = Array.isArray(cache.rivais) ? cache.rivais : [];
    const rivaisChanged =
      rivais.length !== rivaisAtuais.length ||
      rivais.some((r, i) => r !== rivaisAtuais[i]);
    if (rivaisChanged) {
      corrections.push({ field: "rivais", value: rivais.join(", ") });
    }

    // Campo booleano (tem_feminino) — sempre envia se mudou
    if (feminino !== Boolean(cache.tem_feminino)) {
      corrections.push({ field: "tem_feminino", value: feminino ? "true" : "false" });
    }

    if (corrections.length === 0) {
      toast({ title: t("correction.nothing_title"), description: t("correction.nothing_desc") });
      return;
    }

    setSubmitting(true);
    setResults(null);
    try {
      const { data, error } = await supabase.functions.invoke("apply-club-correction", {
        body: { corrections },
      });
      if (error) throw error;
      setResults(data?.results || []);
      toast({
        title: t("correction.analyzed_title"),
        description: t("correction.analyzed_desc", { count: (data?.results || []).length }),
      });
      // recarrega cache atualizado
      const { data: fresh } = await supabase
        .from("clubes_cache")
        .select("*")
        .ilike("nome", cache.nome)
        .maybeSingle();
      setCache((fresh as CacheRow) || null);
      setRivais(Array.isArray(fresh?.rivais) ? (fresh!.rivais as string[]) : []);
      setForm({});
    } catch (e: any) {
      toast({ title: t("correction.send_fail"), description: e?.message || t("common.try_again"), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#ff6200]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="h-16 border-b border-white/5 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Logo" className="h-8 w-auto" />
            <span className="font-black italic text-base uppercase tracking-tight">{t("correction.header")}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> {t("correction.dashboard")}
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-tight">
            {t("correction.title_prefix")} <span className="text-[#ff6200]">{clubName}</span>
          </h1>
          <p className="text-sm text-white/60 italic mt-2">
            {t("correction.intro")}
          </p>
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 md:p-6 space-y-5">
          {/* CORES */}
          <section>
            <h2 className="text-xs font-black uppercase tracking-widest text-white/70 mb-1">{t("correction.colors_title")}</h2>
            <p className="text-[11px] italic text-white/50 mb-3">
              {t("correction.colors_hint_prefix")}<span className="font-mono text-white/70">#RRGGBB</span>{t("correction.colors_hint_mid")}<span className="text-white/70">{t("correction.colors_examples")}</span>{t("correction.colors_hint_suffix")}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {COLOR_FIELDS.map((f, i) => {
                const labels = [
                  t("correction.color_primary"),
                  t("correction.color_secondary"),
                  t("correction.color_tertiary"),
                  t("correction.color_quarta"),
                ];
                const current = (cache as any)?.[f] || "";
                const typed = form[f] || "";
                const previewHex = resolveColorToHex(typed) || (typed ? null : current || null);
                const err = colorErrors[f];
                return (
                  <div key={f}>
                    <Label className="text-[10px] uppercase tracking-wider text-white/50">
                      {labels[i]} <span className="text-white/30">({t("correction.current_short")} {current || "—"})</span>
                    </Label>
                    <div className="flex items-center gap-2 mt-1">
                      <div
                        className="w-10 h-10 rounded-md border border-white/10 shrink-0"
                        style={{ background: previewHex || "transparent" }}
                        title={previewHex || ""}
                      />
                      <Input
                        placeholder={t("correction.color_placeholder")}
                        value={typed}
                        onChange={(e) => {
                          set(f, e.target.value);
                          if (colorErrors[f]) {
                            setColorErrors((p) => {
                              const n = { ...p };
                              delete n[f];
                              return n;
                            });
                          }
                        }}
                        className={`bg-white/5 text-white ${err ? "border-red-500" : "border-white/10"}`}
                      />
                    </div>
                    {err && (
                      <p className="text-[10px] text-red-400 mt-1 flex items-start gap-1">
                        <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                        <span>{err}</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* DADOS GERAIS */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label={t("correction.mascot")} placeholder={cache?.mascote || t("correction.mascot_ph")} value={form.mascote} onChange={(v) => set("mascote", v)} currentPrefix={t("correction.current_prefix")} />
            <Field label={t("correction.founded")} placeholder={cache?.fundado ? String(cache.fundado) : t("correction.founded_ph")} value={form.fundado} onChange={(v) => set("fundado", v)} currentPrefix={t("correction.current_prefix")} />
            <Field label={t("correction.home_city")} placeholder={cache?.cidade || ""} value={form.cidade} onChange={(v) => set("cidade", v)} currentPrefix={t("correction.current_prefix")} />
            <Field label={t("correction.country")} placeholder={cache?.pais || ""} value={form.pais} onChange={(v) => set("pais", v)} currentPrefix={t("correction.current_prefix")} />
            <Field label={t("correction.stadium_name")} placeholder={cache?.estadio_nome || ""} value={form.estadio_nome} onChange={(v) => set("estadio_nome", v)} currentPrefix={t("correction.current_prefix")} />
            <Field label={t("correction.stadium_city")} placeholder={cache?.estadio_cidade || ""} value={form.estadio_cidade} onChange={(v) => set("estadio_cidade", v)} currentPrefix={t("correction.current_prefix")} />
            <Field label={t("correction.stadium_capacity")} placeholder={cache?.estadio_capacidade ? String(cache.estadio_capacidade) : ""} value={form.estadio_capacidade} onChange={(v) => set("estadio_capacidade", v)} currentPrefix={t("correction.current_prefix")} />
            <Field label={t("correction.short_name")} placeholder={cache?.nome_curto || ""} value={form.nome_curto} onChange={(v) => set("nome_curto", v)} currentPrefix={t("correction.current_prefix")} />
            <Field label={t("correction.division")} placeholder={cache?.division || t("correction.division_ph")} value={form.division} onChange={(v) => set("division", v)} currentPrefix={t("correction.current_prefix")} />

            <div className="md:col-span-2">
              <Label className="text-[10px] uppercase tracking-wider text-white/50 mb-2 block">
                {t("correction.rivals_label")}{" "}
                <span className="text-[#ff6200] font-bold not-italic">{t("correction.rivals_note")}</span>
              </Label>
              <RivalsCombobox
                value={rivais}
                onChange={setRivais}
                excludeName={clubName || undefined}
                placeholder={t("correction.rivals_placeholder")}
              />
              <p className="text-[10px] italic text-white/40 mt-1">
                {t("correction.rivals_disclaimer")}
              </p>
            </div>

            <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2">
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-white/50">{t("correction.has_women")}</Label>
                <div className="text-sm font-bold mt-0.5">{feminino ? t("identity.yes") : t("identity.no")}</div>
              </div>
              <Switch checked={feminino} onCheckedChange={setFeminino} />
            </div>
          </section>

          <div className="pt-2">
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full md:w-auto bg-[#ff6200] hover:bg-orange-600 text-white font-black italic uppercase tracking-wider"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t("correction.validating")}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" /> {t("correction.send")}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* RESULTADOS */}
        {results && results.length > 0 && (
          <div className="mt-6 rounded-2xl border border-white/5 bg-white/[0.02] p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-[#ff6200]" />
              <h3 className="text-xs font-black uppercase tracking-widest text-white/80">{t("correction.ai_verdict")}</h3>
            </div>
            <ul className="space-y-2">
              {results.map((r, i) => (
                <li key={i} className="flex items-start gap-3 text-sm bg-white/5 rounded-lg p-3">
                  {r.verdict === "rejected" ? (
                    <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="font-bold uppercase text-xs text-white/80">{r.field}</div>
                    <div className="text-white/70 text-xs">
                      {t("correction.you_suggested")} <span className="font-mono text-white">{r.suggested}</span> →{" "}
                      <span className="font-mono text-[#ff6200]">{r.applied ?? t("correction.rejected")}</span>
                    </div>
                    <div className="text-[11px] italic text-white/50 mt-1">{r.reasoning}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}

function Field({
  label, placeholder, value, onChange, currentPrefix,
}: { label: string; placeholder?: string; value?: string; onChange: (v: string) => void; currentPrefix: string }) {
  return (
    <div>
      <Label className="text-[10px] uppercase tracking-wider text-white/50">{label}</Label>
      <Input
        placeholder={placeholder ? `${currentPrefix} ${placeholder}` : ""}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white/5 border-white/10 text-white mt-1"
      />
    </div>
  );
}
