/**
 * BehavioralAudit.tsx
 * Detecção de fraude por comportamento (clusters de votos).
 * Estética: avisos em amarelo/laranja, scatter plot, Verdana Italic.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShieldAlert, Trash2, Network, Wifi, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

type Summary = {
  total_votes: number;
  suspicious: number;
  clusters: number;
  unique_estimated: number;
  trash_count: number;
  scatter: { cluster_id: string; size: number; bairro: string; isp: string }[];
  isp_breakdown: { isp: string; value: number }[];
};

export default function BehavioralAudit() {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: res, error } = await supabase.rpc("admin_get_audit_summary" as any);
    if (error) toast.error("Falha ao carregar auditoria");
    else setData(res as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const runDetect = async () => {
    setBusy("detect");
    const { data: r, error } = await supabase.rpc("admin_detect_vote_clusters" as any);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`Clusters detectados: ${(r as any)?.clusters ?? 0} • Votos sinalizados: ${(r as any)?.flagged ?? 0}`);
    load();
  };

  const runISP = async () => {
    setBusy("isp");
    const { data: r, error } = await supabase.rpc("admin_flag_isp_clusters" as any, { p_threshold: 5 });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`Sinalizações por ISP: ${(r as any)?.flagged ?? 0}`);
    load();
  };

  const runPurge = async () => {
    if (!confirm("Mover todos os votos suspeitos para a lixeira?")) return;
    setBusy("purge");
    const { data: r, error } = await supabase.rpc("admin_purge_suspicious_to_trash" as any);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`Movidos: ${(r as any)?.moved ?? 0} votos para a lixeira`);
    load();
  };

  if (loading || !data) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const maxScatter = Math.max(1, ...data.scatter.map(s => s.size));

  return (
    <div className="space-y-6" style={{ fontFamily: "Verdana, sans-serif", fontStyle: "italic" }}>
      {/* Header */}
      <Card className="border-yellow-500/40 bg-gradient-to-br from-yellow-500/10 to-orange-500/10">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Heart Club" className="h-10 w-10 object-contain" />
            <div>
              <CardTitle className="text-xl">Auditoria de Comportamento Ativa</CardTitle>
              <p className="text-xs text-yellow-500 mt-1">⚠ Detecção contínua de clusters de votos suspeitos</p>
            </div>
          </div>
          <span className="text-[10px] bg-yellow-500 text-black font-bold px-3 py-1 rounded-full uppercase tracking-wider not-italic">
            Selo Heart Club • Audit
          </span>
        </CardHeader>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPI label="Votos Totais" value={data.total_votes} />
        <KPI label="Torcedores Únicos Estimados" value={data.unique_estimated} highlight />
        <KPI label="Suspeitos" value={data.suspicious} warn />
        <KPI label="Clusters Detectados" value={data.clusters} warn />
        <KPI label="Lixeira" value={data.trash_count} />
      </div>

      {/* Actions */}
      <Card>
        <CardHeader><CardTitle className="text-base">Ações de Auditoria</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={runDetect} disabled={!!busy} className="bg-orange-600 hover:bg-orange-700 text-white">
            <Network className="w-4 h-4 mr-2" />
            {busy === "detect" ? "Detectando…" : "Detectar Clusters (IP+Bairro+Profissão)"}
          </Button>
          <Button onClick={runISP} disabled={!!busy} variant="outline" className="border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10">
            <Wifi className="w-4 h-4 mr-2" />
            {busy === "isp" ? "Analisando…" : "Sinalizar por ISP"}
          </Button>
          <Button onClick={runPurge} disabled={!!busy} variant="destructive">
            <Trash2 className="w-4 h-4 mr-2" />
            {busy === "purge" ? "Limpando…" : "🧹 Limpar Base Suspeita"}
          </Button>
          <Button onClick={load} variant="ghost" size="sm"><RefreshCw className="w-4 h-4 mr-1" />Atualizar</Button>
        </CardContent>
      </Card>

      {/* Scatter plot */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-yellow-500" />
            Mapa de Clusters (Scatter)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.scatter.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum cluster detectado ainda. Execute "Detectar Clusters".</p>
          ) : (
            <div className="relative w-full h-80 bg-black/40 rounded-lg border border-border overflow-hidden">
              <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                {data.scatter.map((s, i) => {
                  const x = (i * 97) / Math.max(1, data.scatter.length - 1) + 1.5;
                  const y = 95 - (s.size / maxScatter) * 80;
                  const r = Math.min(6, 1 + Math.log2(s.size + 1));
                  return (
                    <circle key={s.cluster_id} cx={x} cy={y} r={r}
                      fill={s.size >= 5 ? "#f59e0b" : "#ff6200"}
                      opacity={0.7} stroke="#fff" strokeWidth={0.2}>
                      <title>{`Cluster ${s.cluster_id.slice(0,6)} • ${s.size} votos • ${s.bairro} • ${s.isp}`}</title>
                    </circle>
                  );
                })}
              </svg>
              <div className="absolute bottom-1 left-2 text-[10px] text-yellow-500 not-italic">
                Eixo X: clusters • Eixo Y: tamanho do cluster
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ISP Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wifi className="w-4 h-4 text-orange-500" /> Provedores (ISP)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.isp_breakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados de ISP capturados ainda.</p>
          ) : (
            <div className="space-y-2">
              {data.isp_breakdown.map((r) => {
                const max = Math.max(...data.isp_breakdown.map(x => x.value));
                const pct = (r.value / max) * 100;
                return (
                  <div key={r.isp} className="flex items-center gap-3">
                    <span className="w-40 text-xs truncate">{r.isp}</span>
                    <div className="flex-1 h-4 bg-muted rounded">
                      <div className="h-full rounded bg-gradient-to-r from-orange-500 to-yellow-500" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-bold w-10 text-right not-italic">{r.value}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KPI({ label, value, warn, highlight }: { label: string; value: number; warn?: boolean; highlight?: boolean }) {
  return (
    <Card className={warn ? "border-yellow-500/40" : highlight ? "border-orange-500/60" : ""}>
      <CardContent className="p-4">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground not-italic">{label}</p>
        <p className={`text-2xl font-black not-italic ${warn ? "text-yellow-500" : highlight ? "text-orange-500" : "text-foreground"}`}>
          {value.toLocaleString("pt-BR")}
        </p>
      </CardContent>
    </Card>
  );
}
