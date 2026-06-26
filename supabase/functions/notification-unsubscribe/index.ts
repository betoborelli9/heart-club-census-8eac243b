/**
 * notification-unsubscribe (público, verify_jwt=false)
 * URL: /functions/v1/notification-unsubscribe?u=<user_id>&c=<category>&s=<sig>
 * Desabilita uma categoria (kickoff|lineup|goal|fulltime) para o usuário.
 * Sig = HMAC-SHA256(`${u}|${c}`, SUPABASE_SERVICE_ROLE_KEY) base64url.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SECRET = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, SECRET);

const PREF_COL: Record<string, string> = {
  kickoff: "alert_kickoff", lineup: "alert_lineup", goal: "alert_goal", fulltime: "alert_fulltime",
};

function b64url(buf: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}

export async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return b64url(sig);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const u = url.searchParams.get("u") || "";
    const c = url.searchParams.get("c") || "";
    const s = url.searchParams.get("s") || "";
    const col = PREF_COL[c];
    if (!u || !col || !s) return new Response("invalid", { status: 400, headers: corsHeaders });

    const expected = await sign(`${u}|${c}`);
    if (expected !== s) return new Response("bad signature", { status: 403, headers: corsHeaders });

    await supabase.from("notification_preferences").upsert(
      { user_id: u, [col]: false },
      { onConflict: "user_id" },
    );

    // Página simples de confirmação
    return new Response(
      `<!doctype html><meta charset="utf-8"><title>OK</title>
       <body style="font-family:system-ui;background:#000;color:#fff;display:grid;place-items:center;height:100vh;margin:0">
       <div style="text-align:center"><h1 style="color:#ff6200">✓</h1>
       <p>Notificações de <b>${c}</b> desativadas.</p>
       <p style="opacity:.6;font-size:12px">Você pode reativar em /notificacoes</p></div>`,
      { headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } },
    );
  } catch (e) {
    return new Response(String(e), { status: 500, headers: corsHeaders });
  }
});
