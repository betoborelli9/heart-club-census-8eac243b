import { verifyWebhookRequest, type EmailWebhookPayload } from "@lovable.dev/webhooks-js";
import { parseEmailWebhookPayload, sendLovableEmail } from "@lovable.dev/email-js";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import SignupEmail from "../_shared/email-templates/signup.tsx";
import MagicLinkEmail from "../_shared/email-templates/magic-link.tsx";
import RecoveryEmail from "../_shared/email-templates/recovery.tsx";
import InviteEmail from "../_shared/email-templates/invite.tsx";
import EmailChangeEmail from "../_shared/email-templates/email-change.tsx";
import ReauthenticationEmail from "../_shared/email-templates/reauthentication.tsx";

const SITE_NAME = "Heart Club";
const SITE_URL = "https://www.heartclubapp.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-lovable-signature, x-lovable-timestamp",
};

const subjectMap: Record<string, string> = {
  signup: "Confirme seu cadastro no Heart Club 🧡",
  magiclink: "Seu link de acesso ao Heart Club 🔑",
  recovery: "Redefinir sua senha — Heart Club 🔒",
  invite: "Você foi convidado para o Heart Club 🎉",
  email_change: "Confirmar troca de email — Heart Club 📧",
  reauthentication: "Seu código de verificação — Heart Club 🔐",
};

function getEmailComponent(type: string, props: Record<string, string>) {
  const baseProps = { siteName: SITE_NAME, siteUrl: SITE_URL, ...props };

  switch (type) {
    case "signup":
      return SignupEmail(baseProps);
    case "magiclink":
      return MagicLinkEmail(baseProps);
    case "recovery":
      return RecoveryEmail(baseProps);
    case "invite":
      return InviteEmail(baseProps);
    case "email_change":
      return EmailChangeEmail(baseProps);
    case "reauthentication":
      return ReauthenticationEmail(baseProps);
    default:
      return SignupEmail(baseProps);
  }
}

function valueFromData(data: Record<string, unknown>, key: string): string {
  const value = data[key];
  return typeof value === "string" ? value : "";
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let verified;
    try {
      verified = await verifyWebhookRequest<EmailWebhookPayload>({
        req,
        secret: apiKey,
        parser: parseEmailWebhookPayload,
      });
    } catch (error) {
      console.error("Webhook verification error:", error);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = verified.payload;
    const data = payload.data ?? {};
    const emailType = valueFromData(data, "action_type") || payload.type || "signup";
    const recipient = valueFromData(data, "email");
    const confirmationUrl = valueFromData(data, "url");
    const token = valueFromData(data, "token");
    const newEmail = valueFromData(data, "new_email");
    const callbackUrl = valueFromData(data, "callback_url");
    const apiBaseUrl = valueFromData(data, "api_base_url");

    if (!recipient) {
      return new Response(JSON.stringify({ error: "Missing recipient" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const component = getEmailComponent(emailType, {
      recipient,
      confirmationUrl,
      token,
      newEmail,
    });

    const html = await renderAsync(component);
    const subject = subjectMap[emailType] || "Heart Club — Verificação";

    const result = await sendLovableEmail(
      {
        run_id: payload.run_id,
        to: recipient,
        from: "Heart Club <admin@heartclubapp.com>",
        subject,
        html,
        text: htmlToText(html),
        purpose: "auth",
        idempotency_key: payload.run_id,
      },
      {
        apiKey,
        apiBaseUrl: apiBaseUrl || undefined,
        sendUrl: callbackUrl || undefined,
      },
    );

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("auth-email-hook error:", err);
    return new Response(JSON.stringify({ error: "Email service temporarily unavailable" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
