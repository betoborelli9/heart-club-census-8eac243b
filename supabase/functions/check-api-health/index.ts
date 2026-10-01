/**
 * [CAMINHO]: supabase/functions/check-api-health/index.ts
 * [MÓDULO]: Checagem de saúde das APIs externas de que o Heart Club
 * depende para funcionar sem intercorrências. Roda 1x/dia via cron,
 * grava o resultado em api_health_status (lido pelo alerta no Admin).
 *
 * Hoje checa: API-Football (assinatura, dias pra vencer, cota usada).
 * Arquitetura aberta pra acrescentar outras APIs (ex.: serviço de
 * e-mail) no mesmo padrão quando precisar.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FOOTBALL_API_KEY = Deno.env.get("FOOTBALL_API_KEY") || "";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function checkApiFootball(): Promise<{ healthy: boolean; details: Record<string, unknown> }> {
  if (!FOOTBALL_API_KEY) {
    return { healthy: false, details: { error: "FOOTBALL_API_KEY não configurada" } };
  }
  try {
    const res = await fetch("https://v3.football.api-sports.io/status", {
      headers: { "x-apisports-key": FOOTBALL_API_KEY },
    });
    if (!res.ok) {
      return { healthy: false, details: { error: `HTTP ${res.status}` } };
    }
    const json = await res.json();
    const sub = json?.response?.subscription;
    const reqs = json?.response?.requests;
    const subscriptionEnd: string | null = sub?.end || null;
    const active = sub?.active !== false;

    let daysUntilRenewal: number | null = null;
    if (subscriptionEnd) {
      const diffMs = new Date(subscriptionEnd).getTime() - Date.now();
      daysUntilRenewal = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
    }

    return {
      healthy: active && res.ok,
      details: {
        plan: sub?.plan || null,
        subscription_end: subscriptionEnd,
        days_until_renewal: daysUntilRenewal,
        active,
        requests_used: reqs?.current ?? null,
        requests_limit: reqs?.limit_day ?? null,
      },
    };
  } catch (e) {
    return { healthy: false, details: { error: String((e as Error)?.message || e) } };
  }
}

function checkLovableEmail(): { healthy: boolean; details: Record<string, unknown> } {
  // Checagem leve (sem mandar e-mail de teste): so confirma que a chave
  // existe. Uma checagem "de verdade" exigiria enviar um e-mail real.
  return {
    healthy: Boolean(LOVABLE_API_KEY),
    details: LOVABLE_API_KEY
      ? { note: "Chave configurada (não testada ativamente)" }
      : { error: "LOVABLE_API_KEY não configurada" },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const [football, email] = await Promise.all([
      checkApiFootball(),
      Promise.resolve(checkLovableEmail()),
    ]);

    const rows = [
      { service: "API-Football", ...football },
      { service: "E-mail (Heart Club)", ...email },
    ];

    for (const r of rows) {
      await admin.from("api_health_status").upsert({
        service: r.service,
        healthy: r.healthy,
        details: r.details,
        checked_at: new Date().toISOString(),
      });
    }

    return new Response(JSON.stringify({ checked: rows.length, rows }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("check-api-health error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
