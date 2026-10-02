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
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";

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

// Login por link mágico manda o e-mail via Resend — testa a chave de
// verdade (sem mandar e-mail nenhum) batendo num endpoint leve da API
// deles. Se a conta do Resend estiver com problema de pagamento/plano,
// essa chamada já volta com erro claro (401/403), rápido.
async function checkResendEmail(): Promise<{ healthy: boolean; details: Record<string, unknown> }> {
  if (!RESEND_API_KEY) {
    return { healthy: false, details: { error: "RESEND_API_KEY não configurada" } };
  }
  try {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { healthy: false, details: { error: `HTTP ${res.status}`, body: body.slice(0, 300) } };
    }
    return { healthy: true, details: { note: "Chave validada com sucesso" } };
  } catch (e) {
    const isTimeout = (e as Error)?.name === "TimeoutError" || (e as Error)?.name === "AbortError";
    return {
      healthy: false,
      details: { error: isTimeout ? "timeout (rede lenta/instável)" : String((e as Error)?.message || e) },
    };
  }
}

// Login do torcedor (Google/e-mail) depende do serviço de autenticação
// da própria Supabase (GoTrue) estar no ar. Testa o endpoint de saúde
// oficial deles — não depende do Google, só confirma que a Supabase
// está respondendo às chamadas de login.
async function checkSupabaseAuth(): Promise<{ healthy: boolean; details: Record<string, unknown> }> {
  try {
    const started = Date.now();
    // O portão (Kong) da Supabase exige a apikey em toda rota /auth/v1/*,
    // inclusive a de saúde — sem isso, SEMPRE volta 401, mesmo com tudo
    // funcionando (não é um 401 de login, é só a chave que faltou aqui).
    const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: Deno.env.get("SUPABASE_ANON_KEY") || "" },
      signal: AbortSignal.timeout(8000),
    });
    const elapsedMs = Date.now() - started;
    if (!res.ok) {
      return { healthy: false, details: { error: `HTTP ${res.status}`, elapsed_ms: elapsedMs } };
    }
    return { healthy: true, details: { elapsed_ms: elapsedMs } };
  } catch (e) {
    const isTimeout = (e as Error)?.name === "TimeoutError" || (e as Error)?.name === "AbortError";
    return {
      healthy: false,
      details: {
        error: isTimeout
          ? "Serviço de login não respondeu a tempo (pode ser instabilidade da Supabase ou pagamento pendente)"
          : String((e as Error)?.message || e),
      },
    };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const [football, email, resend, supaAuth] = await Promise.all([
      checkApiFootball(),
      Promise.resolve(checkLovableEmail()),
      checkResendEmail(),
      checkSupabaseAuth(),
    ]);

    const rows = [
      { service: "API-Football", ...football },
      { service: "E-mail (Heart Club)", ...email },
      { service: "Login (Supabase Auth)", ...supaAuth },
      { service: "E-mail (Resend)", ...resend },
    ];

    const writeErrors: Record<string, string> = {};
    for (const r of rows) {
      const { error: upsertError } = await admin.from("api_health_status").upsert({
        service: r.service,
        healthy: r.healthy,
        details: r.details,
        checked_at: new Date().toISOString(),
      });
      if (upsertError) {
        console.error(`[check-api-health] falha ao salvar "${r.service}":`, upsertError);
        writeErrors[r.service] = upsertError.message;
      }
    }

    return new Response(JSON.stringify({ checked: rows.length, rows, writeErrors }), {
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
