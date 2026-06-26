/**
 * [EDGE FUNCTION] push-send
 *
 * Helper interno (chamado pelas outras edge functions).
 * - Lê preferências do usuário (notification_preferences)
 * - Se o tipo está habilitado, busca tokens push (push_subscriptions)
 * - Envia Web Push via lib web-push (VAPID)
 * - Grava em notification_history para o sininho
 * - Limpa subscriptions que retornarem 404/410 (token expirado)
 *
 * NÃO chama API-Football. Custo zero de quota externa.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT") || "mailto:admin@heartclubapp.com",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

// Mapeia tipo → coluna de preferência
const PREF_COL: Record<string, string> = {
  kickoff: "alert_kickoff",
  lineup: "alert_lineup",
  goal: "alert_goal",
  fulltime: "alert_fulltime",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { user_id, type, title, body, payload } = await req.json();
    if (!user_id || !type || !title) {
      return new Response(JSON.stringify({ error: "missing fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 1) Checa preferência
    const prefCol = PREF_COL[type];
    if (prefCol) {
      const { data: pref } = await supabase
        .from("notification_preferences")
        .select(prefCol)
        .eq("user_id", user_id)
        .maybeSingle();
      // Default true se não tiver registro
      if (pref && (pref as any)[prefCol] === false) {
        return new Response(JSON.stringify({ skipped: "disabled" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // 2) Grava histórico (sininho) sempre
    await supabase.from("notification_history").insert({
      user_id, type, title, body, payload, read: false,
      fixture_id: payload?.fixture_id || null,
    });

    // 2.5) Gera URL assinada de opt-out para essa categoria
    let unsub_url: string | undefined;
    if (PREF_COL[type]) {
      const SECRET = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(SECRET),
        { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${user_id}|${type}`));
      const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuf)))
        .replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
      const base = Deno.env.get("SUPABASE_URL")!;
      unsub_url = `${base}/functions/v1/notification-unsubscribe?u=${user_id}&c=${type}&s=${sig}`;
    }
    const enrichedPayload = { ...(payload || {}), unsub_url };

    // 3) Busca subscriptions
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", user_id);

    let sent = 0, removed = 0;
    for (const s of subs || []) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ type, title, body, payload: enrichedPayload }),
        );
        sent++;
        await supabase.from("push_subscriptions")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", s.id);
      } catch (e: any) {
        const code = e?.statusCode;
        if (code === 404 || code === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", s.id);
          removed++;
        } else {
          console.error("push fail:", code, e?.body);
        }
      }
    }

    return new Response(JSON.stringify({ sent, removed, history: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("push-send error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
