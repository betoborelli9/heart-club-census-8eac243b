/**
 * Push Web — registro do Service Worker + assinatura VAPID.
 * Isolado: não importa nada do Dashboard. Só toca em push_subscriptions.
 */
import { supabase } from "@/integrations/supabase/client";

const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function isPushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

export async function ensurePushSubscription(): Promise<{ ok: boolean; reason?: string }> {
  if (!isPushSupported()) return { ok: false, reason: "unsupported" };
  if (!VAPID_PUBLIC) return { ok: false, reason: "missing_vapid_public_key" };

  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, reason: "denied" };

  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
    });
  }

  const json: any = sub.toJSON();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "not_authenticated" };

  await supabase.from("push_subscriptions").upsert({
    user_id: user.id,
    endpoint: sub.endpoint,
    p256dh: json.keys?.p256dh,
    auth: json.keys?.auth,
  }, { onConflict: "endpoint" });

  return { ok: true };
}
