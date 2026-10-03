/**
 * [CAMINHO]: src/components/admin/FormSwitches.tsx
 * [MÓDULO]: Chavinhas por formulário — o Beto liga cada formulário (card
 * explicativo + trava) para os torcedores só quando mandar a campanha daquele
 * assunto. DESLIGADA = o site fica exatamente como era.
 */
import { useCallback, useEffect, useState } from "react";
import { Loader2, ToggleLeft } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { fetchFeatureFlags, type FlagRow } from "@/lib/feature-flags";

interface Props {
  /** Quantos torcedores ainda não preencheram cada formulário (chave da chavinha). */
  missing: Record<string, number>;
  total: number;
}

export default function FormSwitches({ missing, total }: Props) {
  const [flags, setFlags] = useState<FlagRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const rows = await fetchFeatureFlags();
    if (!rows) {
      setFailed(true);
      return;
    }
    setFailed(false);
    setFlags(rows);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (f: FlagRow, next: boolean) => {
    if (
      next &&
      !window.confirm(
        `Ligar "${f.label}"?\n\nA partir de agora os torcedores que ainda não preencheram (${missing[f.key] ?? "?"} de ${total}) verão esse formulário na próxima visita.`,
      )
    ) {
      return;
    }
    setBusy(f.key);
    const { error } = await supabase.rpc("admin_set_feature_flag" as any, { p_key: f.key, p_enabled: next });
    setBusy(null);
    if (error) {
      toast.error("Não consegui salvar a chavinha agora. Tente de novo.");
      return;
    }
    setFlags((prev) => (prev ? prev.map((x) => (x.key === f.key ? { ...x, enabled: next } : x)) : prev));
    toast.success(next ? `"${f.label}" ligado para os torcedores.` : `"${f.label}" desligado.`);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
      <div className="flex items-start gap-2">
        <ToggleLeft className="mt-0.5 h-4 w-4 text-primary" />
        <div>
          <h4 className="text-sm font-black uppercase italic tracking-wider">Chavinhas dos formulários</h4>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Cada chavinha liga um formulário (com o card explicando o porquê) para os torcedores. Todas começam
            desligadas: ligue uma de cada vez, junto com o seu e-mail ou WhatsApp sobre aquele assunto.
          </p>
        </div>
      </div>

      {failed && !flags && (
        <p className="text-xs text-yellow-400">
          Não consegui ler as chavinhas agora.{" "}
          <button onClick={load} className="underline underline-offset-2">
            Tentar de novo
          </button>
        </p>
      )}
      {!flags && !failed && <Loader2 className="h-4 w-4 animate-spin text-primary" />}

      <div className="space-y-2">
        {(flags || []).map((f) => (
          <div
            key={f.key}
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">{f.label}</p>
              <p className="text-[11px] leading-snug text-muted-foreground">{f.description}</p>
              <p className="mt-0.5 text-[10px] font-bold uppercase text-amber-400/90">
                {missing[f.key] ?? "—"} de {total} ainda não preencheram
              </p>
            </div>
            <span
              className={`text-[10px] font-black uppercase ${f.enabled ? "text-green-400" : "text-muted-foreground"}`}
            >
              {f.enabled ? "Ligado" : "Desligado"}
            </span>
            <Switch checked={f.enabled} disabled={busy === f.key} onCheckedChange={(v) => toggle(f, v)} />
          </div>
        ))}
      </div>
    </div>
  );
}
