import { Webhook } from "@lovable.dev/webhooks-js";
import { Resend } from "@lovable.dev/email-js";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import SignupEmail from "../_shared/email-templates/signup.tsx";
import MagicLinkEmail from "../_shared/email-templates/magic-link.tsx";
import RecoveryEmail from "../_shared/email-templates/recovery.tsx";
import InviteEmail from "../_shared/email-templates/invite.tsx";
import EmailChangeEmail from "../_shared/email-templates/email-change.tsx";
import ReauthenticationEmail from "../_shared/email-templates/reauthentication.tsx";

const SITE_NAME = "Heart Club";
const SITE_URL = "https://www.heartclubapp.com";

const subjectMap: Record<string, string> = {
  signup: "Confirme seu cadastro no Heart Club 🧡",
  magiclink: "Seu link de acesso ao Heart Club 🔑",
  recovery: "Redefinir sua senha — Heart Club 🔒",
  invite: "Você foi convidado para o Heart Club 🎉",
  email_change: "Confirmar troca de email — Heart Club 📧",
  reauthentication: "Seu código de verificação — Heart Club 🔐",
};

function getEmailComponent(
  type: string,
  props: Record<string, string>
) {
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

Deno.serve(async (req) => {
  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const rawBody = await req.text();
    const webhook = new Webhook(apiKey);

    let payload: Record<string, any>;
    try {
      payload = webhook.verify(rawBody, Object.fromEntries(req.headers.entries()));
    } catch {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const emailType = payload.type || "signup";
    const recipient = payload.email || payload.recipient || "";
    const confirmationUrl = payload.confirmation_url || payload.action_link || "";
    const token = payload.token || payload.otp || "";
    const newEmail = payload.new_email || "";
    const callbackUrl = payload.callback_url;

    const component = getEmailComponent(emailType, {
      recipient,
      confirmationUrl,
      token,
      newEmail,
    });

    const html = await renderAsync(component);
    const subject = subjectMap[emailType] || `Heart Club — Verificação`;

    const resend = new Resend(callbackUrl);
    const { error } = await resend.emails.send({
      from: `Heart Club <admin@heartclubapp.com>`,
      to: [recipient],
      subject,
      html,
    });

    if (error) {
      console.error("Email send error:", error);
      return new Response(JSON.stringify({ error: "Email delivery failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("auth-email-hook error:", err);
    return new Response(JSON.stringify({ error: "Email service temporarily unavailable" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
