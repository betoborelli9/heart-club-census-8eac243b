/**
 * [CAMINHO]: supabase/functions/send-email-campaign/index.ts
 * [MODULO]: Disparo de campanha de e-mail (Admin) — envia 1 e-mail
 * personalizado por torcedor (nao um Cco unico), usando o mesmo servico
 * de e-mail ja configurado pro Heart Club (@lovable.dev/email-js, o
 * mesmo que manda e-mail de cadastro/login). Pausa entre cada envio pra
 * nao parecer disparo em massa.
 *
 * Acesso exclusivo a admin/master (mesma regra das outras RPCs de admin).
 *
 * Body: { subject: string, body: string, recipients: [{ email, nome }] }
 * `body` aceita {{nome}} como placeholder, substituido por torcedor.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendLovableEmail } from "@lovable.dev/email-js";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import CampaignEmail from "../_shared/email-templates/campaign.tsx";

const MASTER_EMAIL = "betoborelli9@gmail.com";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY") || "";

const MAX_RECIPIENTS = 100;
const DELAY_MS = 1200;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    if (!jwt) return json({ error: "unauthenticated" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: userData, error: uErr } = await admin.auth.getUser(jwt);
    if (uErr || !userData?.user) return json({ error: "invalid token" }, 401);

    const callerEmail = (userData.user.email || "").toLowerCase();
    if (callerEmail !== MASTER_EMAIL) {
      const { data: profile } = await admin.from("profiles").select("role").eq("id", userData.user.id).maybeSingle();
      if ((profile as any)?.role !== "admin") return json({ error: "forbidden" }, 403);
    }

    if (!LOVABLE_KEY) return json({ error: "Missing LOVABLE_API_KEY" }, 500);

    const body = await req.json();
    const subject: string = String(body?.subject || "").trim();
    const template: string = String(body?.body || "").trim();
    const recipients: Array<{ email: string; nome?: string }> = Array.isArray(body?.recipients) ? body.recipients : [];

    if (!subject || !template) return json({ error: "subject e body sao obrigatorios" }, 400);
    if (recipients.length === 0) return json({ error: "nenhum destinatario" }, 400);
    if (recipients.length > MAX_RECIPIENTS) {
      return json({ error: `maximo de ${MAX_RECIPIENTS} destinatarios por envio` }, 400);
    }

    let sent = 0;
    const errors: Array<{ email: string; error: string }> = [];

    for (let i = 0; i < recipients.length; i++) {
      const r = recipients[i];
      const nome = r.nome || "torcedor";
      const personalized = template.replaceAll("{{nome}}", nome);
      const lines = personalized.split("\n").filter((l) => l.trim().length > 0);

      try {
        const runId = `campaign-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`;
        const trackingPixelUrl = `${SUPABASE_URL}/functions/v1/track-email-open?id=${runId}`;
        const component = CampaignEmail({ bodyLines: lines, trackingPixelUrl });
        const html = await renderAsync(component);

        await admin.from("email_campaign_sends").insert({
          id: runId,
          email: r.email,
          nome,
          subject,
          sent_by: userData.user.id,
        });

        await sendLovableEmail(
          {
            run_id: runId,
            to: r.email,
            from: "Heart Club <admin@heartclubapp.com>",
            subject,
            html,
            text: lines.join("\n\n"),
            purpose: "marketing",
            idempotency_key: runId,
          },
          { apiKey: LOVABLE_KEY },
        );
        sent++;
      } catch (e) {
        errors.push({ email: r.email, error: String((e as Error)?.message || e) });
      }

      if (i < recipients.length - 1) await sleep(DELAY_MS);
    }

    return json({ sent, failed: errors.length, errors });
  } catch (err) {
    console.error("send-email-campaign error:", err);
    return json({ error: "Falha inesperada ao enviar campanha", detail: String(err) }, 500);
  }
});
