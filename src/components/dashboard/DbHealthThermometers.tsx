/**
 * [CAMINHO]: src/components/dashboard/DbHealthThermometers.tsx
 * [MÓDULO]: Termômetros de saúde do banco — visível SÓ pro Master Admin.
 *  1) Velocidade do banco: tempo que a própria leitura levou (mede o que o torcedor sente).
 *  2) Conexões: quantas estão em uso do máximo do servidor (quando enche, hora de aumentar).
 *  3) Registros técnicos: tamanho das tabelas de log (amarelo 25 MB = limpeza automática, vermelho 50 MB = falhou).
 * Botão "Limpar agora": chama admin_run_technical_cleanup (só limpa as 2 tabelas técnicas; nunca voto/cadastro).
 * Dado vem da RPC admin_get_db_health, liberada só para admin/master pelo banco.
 * Atualiza ao abrir e a cada 5 min (não pesa no banco).
 * Limite honesto: a cota de disco da Supabase não dá para medir de dentro do banco (só no painel dela).
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Gauge } from "lucide-react";

type Health = {
  connections: number;
  max_connections: number;
  http_log_bytes: number;
  cron_log_bytes: number;
  yellow_bytes: number;
  red_bytes: number;
  last_cleanup_at: string | null;
  last_cleanup_ok: boolean | null;
};

type Tone = "ok" | "warn" | "bad";

const rpc = supabase.rpc.bind(supabase) as unknown as (
  fn: string,
  args?: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

const TONE_TEXT: Record<Tone, string> = { ok: "text-green-400", warn: "text-yellow-400", bad: "text-red-400" };
const TONE_BAR: Record<Tone, string> = { ok: "bg-green-500", warn: "bg-yellow-500", bad: "bg-red-500" };
const TONE_LABEL: Record<Tone, string> = { ok: "Tranquilo", warn: "Atenção", bad: "Crítico" };

const mb = (bytes: number) => (bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0);

function Meter({ title, value, detail, tone, pct }: { title: string; value: string; detail: string; tone: Tone; pct: number }) {
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-3 min-w-0">
      <p className="text-[10px] font-black uppercase tracking-widest text-white/40">{title}</p>
      <p className={`text-lg font-black ${TONE_TEXT[tone]}`}>
        {value} <span className="text-[10px] font-bold uppercase">{TONE_LABEL[tone]}</span>
      </p>
      <div className="h-1.5 rounded-full bg-white/10 mt-1.5 overflow-hidden">
        <div className={`h-full ${TONE_BAR[tone]}`} style={{ width: `${Math.max(3, Math.min(100, pct))}%` }} />
      </div>
      <p className="text-[10px] text-white/40 mt-1.5">{detail}</p>
    </div>
  );
}

export default function DbHealthThermometers() {
  const [health, setHealth] = useState<Health | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [cleanMsg, setCleanMsg] = useState<string | null>(null);

  const load = async () => {
    const t0 = performance.now();
    const { data, error } = await rpc("admin_get_db_health");
    const ms = Math.round(performance.now() - t0);
    if (error || !data || typeof data !== "object") {
      setFailed(true);
      setLatencyMs(ms);
      return;
    }
    setFailed(false);
    setLatencyMs(ms);
    setHealth(data as Health);
  };

  useEffect(() => {
    let alive = true;
    const run = () => {
      if (alive) void load();
    };
    run();
    const id = setInterval(run, 5 * 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const cleanNow = async () => {
    if (!window.confirm("Limpar agora os registros técnicos? (Não mexe em votos nem em cadastros.)")) return;
    setCleaning(true);
    setCleanMsg(null);
    const { error } = await rpc("admin_run_technical_cleanup");
    setCleaning(false);
    setCleanMsg(error ? "Não consegui limpar agora." : "Limpeza feita.");
    void load();
  };

  if (failed && !health) {
    return (
      <div className="rounded-[28px] border border-red-500/40 bg-[#0b0b0b] p-4 text-sm font-bold text-red-400">
        <style
          dangerouslySetInnerHTML={{
            __html: "@keyframes hc-alert-blink{0%,100%{opacity:1}50%{opacity:.25}}.hc-alert-blink{animation:hc-alert-blink 1s ease-in-out infinite}",
          }}
        />
        <span className="hc-alert-blink">🌡️ Termômetros: o banco não respondeu</span>
        <span className="block text-xs font-normal text-white/50 mt-1">
          Demorou {latencyMs != null ? `${(latencyMs / 1000).toFixed(1)} s` : "demais"} e não voltou. Tentando de novo a cada 5 minutos.
        </span>
      </div>
    );
  }
  if (!health) return null;

  const speedTone: Tone = latencyMs == null ? "ok" : latencyMs < 1500 ? "ok" : latencyMs < 3000 ? "warn" : "bad";
  const connPct = health.max_connections > 0 ? (health.connections / health.max_connections) * 100 : 0;
  const connTone: Tone = connPct < 50 ? "ok" : connPct < 75 ? "warn" : "bad";
  const logBytes = Math.max(health.http_log_bytes, health.cron_log_bytes);
  const logTone: Tone = logBytes < health.yellow_bytes ? "ok" : logBytes < health.red_bytes ? "warn" : "bad";
  const worst: Tone = [speedTone, connTone, logTone].includes("bad") ? "bad" : [speedTone, connTone, logTone].includes("warn") ? "warn" : "ok";

  const verdict =
    connTone === "bad" || speedTone === "bad"
      ? "Servidor no limite — hora de pensar em aumentar o plano."
      : connTone === "warn" || speedTone === "warn"
        ? "Servidor começando a apertar — acompanhe."
        : "Servidor com folga.";

  return (
    <div
      className={`fade-in rounded-[28px] border bg-[#0b0b0b] p-5 ${
        worst === "bad" ? "border-red-500/40" : worst === "warn" ? "border-yellow-500/40" : "border-green-500/30"
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <Gauge className={`w-5 h-5 ${TONE_TEXT[worst]}`} />
        <p className="text-[10px] font-black uppercase tracking-widest text-white/40">
          Painel Master · Só você vê isso · Saúde do banco
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Meter
          title="Velocidade"
          value={latencyMs != null ? `${(latencyMs / 1000).toFixed(2)} s` : "—"}
          detail="Resposta do banco agora (ideal: abaixo de 1,5 s)"
          tone={speedTone}
          pct={latencyMs != null ? (latencyMs / 5000) * 100 : 0}
        />
        <Meter
          title="Conexões"
          value={`${health.connections}/${health.max_connections}`}
          detail="Em uso do máximo do servidor (aumentar o plano perto de 75%)"
          tone={connTone}
          pct={connPct}
        />
        <Meter
          title="Registros técnicos"
          value={`${mb(logBytes)} MB`}
          detail="Limpa sozinho ao passar de 25 MB (vermelho = a limpeza falhou)"
          tone={logTone}
          pct={(logBytes / health.red_bytes) * 100}
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-3">
        <p className="text-xs font-bold text-white/80">{verdict}</p>
        <button
          onClick={cleanNow}
          disabled={cleaning}
          className="rounded-full border border-white/20 px-3 py-1 text-[10px] font-black uppercase text-white/70 hover:text-white disabled:opacity-50"
        >
          {cleaning ? "Limpando…" : "Limpar agora"}
        </button>
        {cleanMsg && <span className="text-xs text-white/60">{cleanMsg}</span>}
        <span className="text-[10px] text-white/30 ml-auto">
          Última limpeza automática:{" "}
          {health.last_cleanup_at ? new Date(health.last_cleanup_at).toLocaleString("pt-BR") : "ainda não precisou"}
          {health.last_cleanup_ok === false && " (falhou)"}
        </span>
      </div>
    </div>
  );
}
