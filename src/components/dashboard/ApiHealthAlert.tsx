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

const BLINK_CSS = `
@keyframes hc-alert-blink { 0%,100%{opacity:1} 50%{opacity:.25} }
.hc-alert-blink{animation:hc-alert-blink 1s ease-in-out infinite}
`;

const API_FOOTBALL_PAY_URL = "https://dashboard.api-football.com/subscription/soccer";
const SUPABASE_PAY_URL = "https://supabase.com/dashboard/org/nnyedlgjjszmioaryswy/billing";

function PayLink({ href, urgent }: { href: string; urgent: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase shrink-0 ${
        urgent ? "bg-red-500 text-white hover:bg-red-400" : "border border-white/20 text-white/70 hover:text-white"
      }`}
    >
      Pagar
    </a>
  );
}

const toneOf = (d: number | null) =>
  d === null ? "text-white/60" : d <= 3 ? "text-red-400" : d <= 10 ? "text-yellow-400" : "text-green-400";

// Cobrança da Supabase: sempre dia 23 (confirmado por Beto — foi a causa
// do site ficar fora do ar em 01/10/2026). Não tem API pra perguntar isso
// pra Supabase, então calculamos a data aqui mesmo.
function nextSupabaseRenewal() {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth() + (now.getDate() > 23 ? 1 : 0), 23);
  const daysLeft = Math.ceil((date.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  return { date, daysLeft, key: `hc_supa_paid_${date.toISOString().slice(0, 10)}` };
}

export default function ApiHealthAlert() {
  const [rows, setRows] = useState<HealthRow[] | null>(null);
  const supaRenewal = nextSupabaseRenewal();
  // A Supabase não informa pagamento por API: o "Já paguei" vale pro ciclo
  // atual (a chave inclui a data) e some sozinho quando o ciclo vira.
  const [supaPaid, setSupaPaid] = useState<boolean>(() => {
    try {
      return localStorage.getItem(supaRenewal.key) === "1";
    } catch {
      return false;
    }
  });
  const markSupaPaid = () => {
    try {
      localStorage.setItem(supaRenewal.key, "1");
    } catch {}
    setSupaPaid(true);
  };

  const [loadFailed, setLoadFailed] = useState(false);

  // Lê o status agora e de novo a cada 5 min (o banco atualiza de hora em hora). Se a leitura falhar (ex.: Supabase
  // lenta), NÃO some em silêncio — mostra aviso, senão parece que está tudo bem.
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data, error } = await (supabase as any).rpc("admin_get_api_health");
      if (!alive) return;
      if (error || !Array.isArray(data)) {
        setLoadFailed(true);
        return;
      }
      setLoadFailed(false);
      setRows(data as unknown as HealthRow[]);
    };
    load();
    const id = setInterval(load, 5 * 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  if ((!rows || rows.length === 0) && loadFailed) {
    return (
      <div className="rounded-[28px] border border-yellow-500/40 bg-[#0b0b0b] p-4 text-sm font-bold text-yellow-400">
        Não consegui ler o status dos serviços agora (a Supabase pode estar lenta). Tentando de novo a cada 5 minutos.
        <span className="block text-xs font-normal text-white/50 mt-1">Enquanto isso, confira você mesmo: API-Football e Supabase.</span>
      </div>
    );
  }
  if (!rows || rows.length === 0) return null;

  const football = rows.find((r) => r.service === "API-Football");
  const days = football?.details?.days_until_renewal ?? null;
  const otherIssues = rows.filter((r) => r.service !== "API-Football" && !r.healthy);

  // Pisca quando faltam 3 dias ou menos (ou o serviço caiu) e só para quando
  // pagar: API-Football para sozinha (a data de vencimento avança ao pagar);
  // Supabase para ao clicar "Já paguei".
  const footballBlink = !!football && (!football.healthy || (days !== null && days <= 3));
  const supaBlink = supaRenewal.daysLeft <= 3 && !supaPaid;
  const issuesBlink = otherIssues.length > 0;
  const anyBlink = footballBlink || supaBlink || issuesBlink;

  const isCritical = footballBlink || supaBlink || issuesBlink;
  const isWarning =
    (days !== null && days <= 10) || (supaRenewal.daysLeft <= 10 && !supaPaid);
  const urgency: "critical" | "warning" | "ok" = isCritical ? "critical" : isWarning ? "warning" : "ok";

  const theme = {
    critical: {
      border: "border-red-500/40",
      bg: "from-red-500/15 to-transparent",
      icon: XCircle,
      iconColor: "text-red-500",
    },
    warning: {
      border: "border-yellow-500/40",
      bg: "from-yellow-500/15 to-transparent",
      icon: AlertTriangle,
      iconColor: "text-yellow-500",
    },
    ok: {
      border: "border-green-500/30",
      bg: "from-green-500/10 to-transparent",
      icon: CheckCircle2,
      iconColor: "text-green-500",
    },
  }[urgency];

  const Icon = theme.icon;
  const renewalDate = football?.details?.subscription_end
    ? new Date(football.details.subscription_end).toLocaleDateString("pt-BR")
    : null;
  const supaDaysTone = supaPaid ? "text-green-400" : toneOf(supaRenewal.daysLeft);

  return (
    <div className={`fade-in rounded-[28px] border ${theme.border} bg-gradient-to-br ${theme.bg} bg-[#0b0b0b] p-5 flex items-start gap-4`}>
      <style dangerouslySetInnerHTML={{ __html: BLINK_CSS }} />
      <div className={`w-11 h-11 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 ${theme.iconColor} ${anyBlink ? "hc-alert-blink" : ""}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">
          Painel Master · Só você vê isso
        </p>
        {football && (
          <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
          <p className={`text-sm font-bold text-white ${footballBlink ? "hc-alert-blink" : ""}`}>
            {football.healthy ? (
              <>
                🏈 API-Football vence em{" "}
                <span className={toneOf(days)}>
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
          <PayLink href={API_FOOTBALL_PAY_URL} urgent={footballBlink} />
          </div>
        )}
        <div className={`mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 ${supaBlink ? "hc-alert-blink" : ""}`}>
          <p className="text-sm font-bold text-white">
            💳 Supabase {supaPaid ? "pago neste ciclo — próxima cobrança em" : "vence em"}{" "}
            <span className={supaDaysTone}>
              {supaRenewal.daysLeft} dia{supaRenewal.daysLeft !== 1 ? "s" : ""}
            </span>
            <span className="text-white/50 font-normal"> ({supaRenewal.date.toLocaleDateString("pt-BR")})</span>
          </p>
          <PayLink href={SUPABASE_PAY_URL} urgent={supaBlink} />
          {!supaPaid && supaRenewal.daysLeft <= 10 && (
            <button
              onClick={markSupaPaid}
              className="rounded-full bg-green-500 px-2.5 py-0.5 text-[10px] font-black uppercase text-black hover:bg-green-400"
            >
              Já paguei
            </button>
          )}
        </div>
        {otherIssues.map((r) => (
          <p key={r.service} className="text-sm font-bold text-red-400 mt-1 hc-alert-blink">
            🚨 {r.service}: {r.details?.error || "não está respondendo"}
          </p>
        ))}
      </div>
    </div>
  );
}
