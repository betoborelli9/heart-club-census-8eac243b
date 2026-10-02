/**
 * [CAMINHO]: src/components/dashboard/ApiHealthAlert.tsx
 * [MÓDULO]: Alerta de saúde das APIs externas + lembrete de renovação —
 * visível SÓ pro Master Admin (Beto), no topo do próprio Dashboard.
 * Dados vêm de api_health_status, atualizado a cada 15min pelo cron
 * check-api-health (API-Football e login/Supabase) + 1x/dia (demais
 * serviços). Ciclo de pagamento da Supabase (dia 23) é calculado aqui
 * mesmo, por data — a Supabase não tem API pra perguntar isso.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";

type HealthRow = {
  service: string;
  healthy: boolean;
  details: Record<string, any> | null;
  checked_at: string;
};

export default function ApiHealthAlert() {
  const [rows, setRows] = useState<HealthRow[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("admin_get_api_health");
      setRows((data as unknown as HealthRow[]) || []);
    })();
  }, []);

  if (!rows || rows.length === 0) return null;

  const football = rows.find((r) => r.service === "API-Football");
  const days = football?.details?.days_until_renewal ?? null;
  const otherIssues = rows.filter((r) => r.service !== "API-Football" && !r.healthy);

  // Cobrança da Supabase: sempre dia 23 (confirmado por Beto — foi a causa
  // do site ficar fora do ar em 01/10/2026). Não tem API pra perguntar isso
  // pra Supabase, então calculamos a data certinha aqui mesmo.
  const supaRenewal = (() => {
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth() + (now.getDate() > 23 ? 1 : 0), 23);
    const daysLeft = Math.ceil((target.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    return { date: target, daysLeft };
  })();

  // Nada de alarme se tudo estiver tranquilo (>10 dias pra vencer e sem outro problema).
  // Qualquer outro serviço com problema (ex.: login) também é crítico —
  // nunca mostra o card em verde/ok com um "🚨" vermelho dentro. Pega o
  // pior caso entre API-Football e o ciclo de pagamento da Supabase.
  const isCritical =
    (football && !football.healthy) || otherIssues.length > 0 ||
    (days !== null && days <= 3) || supaRenewal.daysLeft <= 3;
  const isWarning = (days !== null && days <= 10) || supaRenewal.daysLeft <= 10;
  const urgency: "critical" | "warning" | "ok" = isCritical ? "critical" : isWarning ? "warning" : "ok";

  const theme = {
    critical: {
      border: "border-red-500/40",
      bg: "from-red-500/15 to-transparent",
      icon: XCircle,
      iconColor: "text-red-500",
      badge: "bg-red-500 text-white",
    },
    warning: {
      border: "border-yellow-500/40",
      bg: "from-yellow-500/15 to-transparent",
      icon: AlertTriangle,
      iconColor: "text-yellow-500",
      badge: "bg-yellow-500 text-black",
    },
    ok: {
      border: "border-green-500/30",
      bg: "from-green-500/10 to-transparent",
      icon: CheckCircle2,
      iconColor: "text-green-500",
      badge: "bg-green-500 text-black",
    },
  }[urgency];

  const Icon = theme.icon;
  const renewalDate = football?.details?.subscription_end
    ? new Date(football.details.subscription_end).toLocaleDateString("pt-BR")
    : null;

  return (
    <div className={`fade-in rounded-[28px] border ${theme.border} bg-gradient-to-br ${theme.bg} bg-[#0b0b0b] p-5 flex items-start gap-4`}>
      <div className={`w-11 h-11 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 ${theme.iconColor}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">
          Painel Master · Só você vê isso
        </p>
        {football && (
          <p className="text-sm font-bold text-white">
            {football.healthy ? (
              <>
                🏈 API-Football vence em{" "}
                <span className={urgency === "critical" ? "text-red-400" : urgency === "warning" ? "text-yellow-400" : "text-green-400"}>
                  {days !== null ? `${days} dia${days !== 1 ? "s" : ""}` : "—"}
                </span>
                {renewalDate && <span className="text-white/50 font-normal"> ({renewalDate})</span>}
                {football.details?.requests_used != null && (
                  <span className="text-white/40 font-normal text-xs block mt-1">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {football.details.requests_used}/{football.details.requests_limit} requisições usadas hoje
                  </span>
                )}
              </>
            ) : (
              <>🚨 API-Football com problema: {football.details?.error || "verifique a assinatura"}</>
            )}
          </p>
        )}
        <p className="text-sm font-bold text-white mt-1">
          💳 Supabase vence em{" "}
          <span className={supaRenewal.daysLeft <= 3 ? "text-red-400" : supaRenewal.daysLeft <= 10 ? "text-yellow-400" : "text-green-400"}>
            {supaRenewal.daysLeft} dia{supaRenewal.daysLeft !== 1 ? "s" : ""}
          </span>
          <span className="text-white/50 font-normal"> ({supaRenewal.date.toLocaleDateString("pt-BR")}) — garanta que o cartão está válido</span>
        </p>
        {otherIssues.map((r) => (
          <p key={r.service} className="text-sm font-bold text-red-400 mt-1">
            🚨 {r.service}: {r.details?.error || "não está respondendo"}
          </p>
        ))}
      </div>
    </div>
  );
}
