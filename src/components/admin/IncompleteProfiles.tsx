/**
 * [CAMINHO]: src/components/admin/IncompleteProfiles.tsx
 * [MÓDULO]: Relatório de preenchimento dos formulários — quem votou e ainda
 * não completou cada formulário. Base da campanha de e-mail convidando a
 * completar (aba "E-mail" → "Só quem ainda não completou o cadastro").
 *
 * REGRA FIXA: este relatório tem nome e e-mail de torcedor — é SOMENTE do
 * administrador. NUNCA incluir aqui (nem copiar pra) relatório de parceiro.
 * Parceiros só recebem números somados, nunca dados de uma pessoa.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Search, ShieldCheck, UserX } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import FormSwitches from "@/components/admin/FormSwitches";
import DeletionRequests from "@/components/admin/DeletionRequests";

type Row = {
  user_id: string;
  nome: string;
  email: string;
  clube_nome: string | null;
  votou_em: string | null;
  falta_basico: boolean;
  falta_termos: boolean;
  falta_territorio: boolean;
  falta_renda: boolean;
  falta_profissao: boolean;
  falta_embaixador: boolean;
};

type FormKey =
  | "falta_termos"
  | "falta_territorio"
  | "falta_basico"
  | "falta_renda"
  | "falta_profissao"
  | "falta_embaixador";

const FORMS: { key: FormKey; label: string; hint: string; counts: boolean }[] = [
  { key: "falta_termos", label: "Termos", hint: "Aceite dos Termos e da Privacidade (LGPD)", counts: true },
  { key: "falta_territorio", label: "Território", hint: "Onde mora — libera o Mapa de Calor", counts: true },
  { key: "falta_basico", label: "Nascimento e gênero", hint: "Idade e gênero da torcida", counts: true },
  { key: "falta_renda", label: "Renda", hint: "Faixa de renda — perfil socioeconômico", counts: true },
  { key: "falta_profissao", label: "Profissão", hint: "Área profissional — perfil socioeconômico", counts: true },
  { key: "falta_embaixador", label: "WhatsApp", hint: "Censo do Embaixador (só informativo)", counts: false },
];

// "Incompleto" = falta algum formulário obrigatório (o WhatsApp do
// embaixador é opcional, não entra na conta).
const isIncomplete = (r: Row) => FORMS.some((f) => f.counts && r[f.key]);

export default function IncompleteProfiles() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<FormKey | "todos">("todos");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    const { data, error } = await supabase.rpc("admin_get_profile_completion");
    if (error || !Array.isArray(data)) {
      // Erro NUNCA pode parecer "tudo certo": mostra a falha de verdade.
      setErrorMsg(error?.message || "resposta inesperada do servidor");
      setRows(null);
    } else {
      setRows(data as unknown as Row[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const total = rows?.length ?? 0;
  const incompletos = useMemo(() => (rows || []).filter(isIncomplete), [rows]);
  const completos = total - incompletos.length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return incompletos
      .filter((r) => filter === "todos" || r[filter])
      .filter(
        (r) =>
          !q ||
          r.nome.toLowerCase().includes(q) ||
          (r.email || "").toLowerCase().includes(q) ||
          (r.clube_nome || "").toLowerCase().includes(q),
      );
  }, [incompletos, filter, query]);

  if (loading && !rows) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (errorMsg || !rows) {
    return (
      <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-5 space-y-3 max-w-xl">
        <p className="flex items-center gap-2 text-sm font-black text-red-400">
          <AlertTriangle className="w-4 h-4" /> Não consegui carregar o relatório
        </p>
        <p className="text-xs text-muted-foreground">
          Isso não significa que está tudo preenchido — a leitura falhou. Detalhe técnico: {errorMsg}
        </p>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
          Tentar de novo
        </Button>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        Nenhum torcedor votou ainda, então não há cadastros para acompanhar.
      </div>
    );
  }

  const pct = Math.round((completos / total) * 100);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <UserX className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-black uppercase italic tracking-wider">
            {incompletos.length === 0
              ? `Todos os ${total} torcedores completaram os formulários`
              : `${incompletos.length} de ${total} torcedores ainda não completaram os formulários`}
          </h3>
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </Button>
      </div>

      <div className="rounded-xl bg-white/5 border border-white/10 p-3">
        <div className="flex justify-between text-[11px] text-muted-foreground mb-1.5">
          <span>{completos} completos</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <FormSwitches
        total={total}
        missing={{
          form_termos: rows.filter((r) => r.falta_termos).length,
          form_territorio: rows.filter((r) => r.falta_territorio).length,
          form_socio: rows.filter((r) => r.falta_renda || r.falta_profissao).length,
          form_embaixador: rows.filter((r) => r.falta_embaixador).length,
        }}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {FORMS.map((f) => {
          const n = rows.filter((r) => r[f.key]).length;
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(active ? "todos" : f.key)}
              className={`text-left rounded-xl border p-3 transition-colors ${
                active ? "border-primary bg-primary/10" : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <p className="text-xl font-black text-primary leading-none">
                {n}
                <span className="text-[10px] font-bold text-muted-foreground"> / {total}</span>
              </p>
              <p className="text-[11px] font-black uppercase mt-1">falta: {f.label}</p>
              <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">{f.hint}</p>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, e-mail ou clube"
            className="pl-9 h-9 text-xs"
          />
        </div>
        {filter !== "todos" && (
          <button
            onClick={() => setFilter("todos")}
            className="text-[11px] font-bold text-primary underline underline-offset-2"
          >
            limpar filtro
          </button>
        )}
        <span className="text-[11px] text-muted-foreground ml-auto">{visible.length} na lista</span>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <div className="max-h-[460px] overflow-auto">
          <table className="w-full text-xs min-w-[640px]">
            <thead className="sticky top-0 bg-[#141414] text-[10px] uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-2.5">Torcedor</th>
                <th className="text-left p-2.5">Clube</th>
                <th className="text-left p-2.5">Formulários</th>
                <th className="text-left p-2.5">Votou em</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-muted-foreground">
                    Ninguém nesse filtro.
                  </td>
                </tr>
              )}
              {visible.map((r) => (
                <tr key={r.user_id} className="border-t border-white/5 align-top">
                  <td className="p-2.5">
                    <p className="font-bold">{r.nome}</p>
                    <p className="text-muted-foreground text-[10px] break-all">{r.email}</p>
                  </td>
                  <td className="p-2.5">{r.clube_nome || "—"}</td>
                  <td className="p-2.5">
                    <div className="flex flex-wrap gap-1">
                      {FORMS.map((f) =>
                        r[f.key] ? (
                          <span
                            key={f.key}
                            title={`Falta: ${f.hint}`}
                            className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                              f.counts ? "bg-amber-500/10 text-amber-400" : "bg-white/5 text-muted-foreground"
                            }`}
                          >
                            {f.label}
                          </span>
                        ) : (
                          <span
                            key={f.key}
                            title={`Preenchido: ${f.label}`}
                            className="px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400 text-[9px] font-bold uppercase inline-flex items-center gap-0.5"
                          >
                            <CheckCircle2 className="w-2.5 h-2.5" /> {f.label}
                          </span>
                        ),
                      )}
                    </div>
                  </td>
                  <td className="p-2.5 text-muted-foreground whitespace-nowrap">
                    {r.votou_em ? new Date(r.votou_em).toLocaleDateString("pt-BR") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-xl bg-white/[0.03] border border-white/10 p-3 text-[11px] text-muted-foreground leading-relaxed">
        <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p>
          Relatório <b className="text-foreground">somente do administrador</b>: tem nome e e-mail de torcedor e nunca
          vai para relatório de parceiro. Para chamar essas pessoas, abra a aba <b className="text-foreground">E-mail</b> e
          marque <b className="text-foreground">"Só quem ainda não completou o cadastro"</b> (o contador mostra quantos
          receberão).
        </p>
      </div>

      <DeletionRequests />
    </div>
  );
}
