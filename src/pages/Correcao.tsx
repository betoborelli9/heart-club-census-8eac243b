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
        toast({ title: "Você ainda não votou", description: "Vote no seu clube do coração primeiro." });
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

    for (const [k, v] of Object.entries(form)) {
      const val = (v ?? "").trim();
      if (!val) continue;
      corrections.push({ field: k, value: val });
    }

    // Campo booleano (tem_feminino) — sempre envia se mudou
    if (feminino !== Boolean(cache.tem_feminino)) {
      corrections.push({ field: "tem_feminino", value: feminino ? "true" : "false" });
    }

    if (corrections.length === 0) {
      toast({ title: "Nada a corrigir", description: "Preencha pelo menos um campo." });
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
        title: "Correções analisadas",
        description: `${(data?.results || []).length} campos avaliados pela IA.`,
      });
      // recarrega cache atualizado
      const { data: fresh } = await supabase
        .from("clubes_cache")
        .select("*")
        .ilike("nome", cache.nome)
        .maybeSingle();
      setCache((fresh as CacheRow) || null);
      setForm({});
    } catch (e: any) {
      toast({ title: "Falha ao enviar", description: e?.message || "Tente novamente.", variant: "destructive" });
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
            <span className="font-black italic text-base uppercase tracking-tight">Correção</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-tight">
            Corrigir dados — <span className="text-[#ff6200]">{clubName}</span>
          </h1>
          <p className="text-sm text-white/60 italic mt-2">
            Sugira correções nos dados oficiais do seu clube. Nosso sistema (IA + Google) vai conferir
            cada campo antes de gravar. Se você errar, a IA corrige; se a sugestão for absurda, será rejeitada.
            Deixe em branco o que não quiser alterar.
          </p>
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 md:p-6 space-y-5">
          {/* CORES */}
          <section>
            <h2 className="text-xs font-black uppercase tracking-widest text-white/70 mb-3">Cores oficiais</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {COLOR_FIELDS.map((f, i) => {
                const labels = ["Primária", "Secundária", "Terciária", "Quarta"];
                const current = (cache as any)?.[f] || "";
                return (
                  <div key={f}>
                    <Label className="text-[10px] uppercase tracking-wider text-white/50">
                      {labels[i]} <span className="text-white/30">(atual: {current || "—"})</span>
                    </Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        value={form[f]?.match(/^#[0-9a-fA-F]{6}$/) ? form[f] : current || "#000000"}
                        onChange={(e) => set(f, e.target.value.toUpperCase())}
                        className="w-10 h-10 rounded-md border border-white/10 bg-transparent cursor-pointer"
                      />
                      <Input
                        placeholder="#RRGGBB"
                        value={form[f] || ""}
                        onChange={(e) => set(f, e.target.value.toUpperCase())}
                        className="bg-white/5 border-white/10 text-white font-mono"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* DADOS GERAIS */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Mascote" placeholder={cache?.mascote || "Ex.: Raposa"} value={form.mascote} onChange={(v) => set("mascote", v)} />
            <Field label="Ano de fundação" placeholder={cache?.fundado ? String(cache.fundado) : "Ex.: 1903"} value={form.fundado} onChange={(v) => set("fundado", v)} />
            <Field label="Cidade-sede" placeholder={cache?.cidade || ""} value={form.cidade} onChange={(v) => set("cidade", v)} />
            <Field label="País" placeholder={cache?.pais || ""} value={form.pais} onChange={(v) => set("pais", v)} />
            <Field label="Nome do estádio" placeholder={cache?.estadio_nome || ""} value={form.estadio_nome} onChange={(v) => set("estadio_nome", v)} />
            <Field label="Cidade do estádio" placeholder={cache?.estadio_cidade || ""} value={form.estadio_cidade} onChange={(v) => set("estadio_cidade", v)} />
            <Field label="Capacidade do estádio" placeholder={cache?.estadio_capacidade ? String(cache.estadio_capacidade) : ""} value={form.estadio_capacidade} onChange={(v) => set("estadio_capacidade", v)} />
            <Field label="Nome curto" placeholder={cache?.nome_curto || ""} value={form.nome_curto} onChange={(v) => set("nome_curto", v)} />
            <Field label="Divisão atual" placeholder={cache?.division || "Ex.: Série A"} value={form.division} onChange={(v) => set("division", v)} />

            <div className="md:col-span-2">
              <Label className="text-[10px] uppercase tracking-wider text-white/50">
                Rivais históricos (separados por vírgula){" "}
                <span className="text-[#ff6200] font-bold not-italic">— sua palavra sobrepõe a IA</span>
              </Label>
              <Input
                placeholder={
                  cache?.rivais && cache.rivais.length > 0
                    ? `Atual: ${cache.rivais.join(", ")}`
                    : "Ex.: Goiás, Atlético-GO, Goianésia"
                }
                value={form.rivais || ""}
                onChange={(e) => set("rivais", e.target.value)}
                className="bg-white/5 border-[#ff6200]/40 text-white mt-1 focus-visible:ring-[#ff6200]"
              />
              <p className="text-[10px] italic text-white/40 mt-1">
                A correção do torcedor é aplicada direto, sem validação da IA, e fica sinalizada no painel admin.
              </p>
            </div>

            <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2">
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-white/50">Possui time feminino?</Label>
                <div className="text-sm font-bold mt-0.5">{feminino ? "Sim" : "Não"}</div>
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
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Validando com IA...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" /> Enviar correções
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
              <h3 className="text-xs font-black uppercase tracking-widest text-white/80">Parecer da IA</h3>
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
                      Você sugeriu <span className="font-mono text-white">{r.suggested}</span> →{" "}
                      <span className="font-mono text-[#ff6200]">{r.applied ?? "rejeitado"}</span>
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
  label, placeholder, value, onChange,
}: { label: string; placeholder?: string; value?: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-[10px] uppercase tracking-wider text-white/50">{label}</Label>
      <Input
        placeholder={placeholder ? `Atual: ${placeholder}` : ""}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white/5 border-white/10 text-white mt-1"
      />
    </div>
  );
}
