/**
 * [CAMINHO]: src/components/dashboard/LovableCommitAlert.tsx
 * [MÓDULO]: Alerta "a Lovable subiu um commit" — visível SÓ pro Master Admin.
 * Dados: lovable_commit_alerts (gravada pela função github-commit-webhook quando o GitHub avisa
 * um push da Lovable). A leitura passa pela RPC admin_get_lovable_alerts, que o banco só libera
 * para admin/master. "Já vi" marca como visto (admin_ack_lovable_alert).
 * Se a leitura falhar, não mostra nada (os outros alertas já avisam que o banco está lento).
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GitCommit } from "lucide-react";

type LovableAlert = {
  sha: string;
  branch: string | null;
  message: string | null;
  committed_at: string | null;
  files: string[] | null;
  critical_files: string[] | null;
  is_critical: boolean;
  url: string | null;
};

// As RPCs novas ainda não estão no types.ts gerado; chamada tipada de forma estreita.
const rpc = supabase.rpc.bind(supabase) as unknown as (
  fn: string,
  args?: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

const BLINK_CSS = `
@keyframes hc-alert-blink { 0%,100%{opacity:1} 50%{opacity:.25} }
.hc-alert-blink{animation:hc-alert-blink 1s ease-in-out infinite}
`;

export default function LovableCommitAlert() {
  const [alerts, setAlerts] = useState<LovableAlert[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data, error } = await rpc("admin_get_lovable_alerts");
      if (!alive || error || !Array.isArray(data)) return;
      setAlerts(data as LovableAlert[]);
    };
    load();
    const id = setInterval(load, 5 * 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  if (alerts.length === 0) return null;

  const critical = alerts.some((a) => a.is_critical);
  const markSeen = async () => {
    setBusy(true);
    const { error } = await rpc("admin_ack_lovable_alert", { p_sha: null });
    setBusy(false);
    if (!error) setAlerts([]);
  };

  return (
    <div
      className={`fade-in rounded-[28px] border bg-[#0b0b0b] bg-gradient-to-br to-transparent p-5 flex items-start gap-4 ${
        critical ? "border-red-500/40 from-red-500/15" : "border-yellow-500/40 from-yellow-500/15"
      }`}
    >
      <style dangerouslySetInnerHTML={{ __html: BLINK_CSS }} />
      <div
        className={`w-11 h-11 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 ${
          critical ? "text-red-500 hc-alert-blink" : "text-yellow-500"
        }`}
      >
        <GitCommit className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">
          Painel Master · Só você vê isso
        </p>
        <p className={`text-sm font-bold text-white ${critical ? "hc-alert-blink" : ""}`}>
          🔔 A Lovable subiu {alerts.length} alteraç{alerts.length === 1 ? "ão" : "ões"} no código
          {critical && <span className="text-red-400"> — mexeu em arquivo crítico (login/banco)</span>}
        </p>
        <ul className="mt-2 space-y-1.5">
          {alerts.slice(0, 3).map((a) => (
            <li key={a.sha} className="text-xs text-white/70">
              <span className="font-mono text-white/40">{a.sha.slice(0, 7)}</span>{" "}
              {(a.message || "").split("\n")[0].slice(0, 80)}
              {a.committed_at && (
                <span className="text-white/40"> · {new Date(a.committed_at).toLocaleString("pt-BR")}</span>
              )}
              {a.critical_files && a.critical_files.length > 0 && (
                <span className="block text-red-400/90 break-all">Crítico: {a.critical_files.join(", ")}</span>
              )}
            </li>
          ))}
          {alerts.length > 3 && <li className="text-xs text-white/40">e mais {alerts.length - 3}…</li>}
        </ul>
        <p className="text-[11px] text-white/40 mt-2">
          Fale com o Claude para desfazer, ou clique em "Já vi" para manter e apagar o aviso.
        </p>
        <button
          onClick={markSeen}
          disabled={busy}
          className="mt-2 rounded-full bg-green-500 px-3 py-1 text-[10px] font-black uppercase text-black hover:bg-green-400 disabled:opacity-50"
        >
          {busy ? "…" : "Já vi"}
        </button>
      </div>
    </div>
  );
}
