/**
 * NotificationSettings — /notificacoes
 * Preferências de alerta + botão para assinar push no navegador. Isolado.
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ensurePushSubscription, isPushSupported } from "@/lib/push";

type Prefs = {
  alert_kickoff: boolean;
  alert_lineup: boolean;
  alert_goal: boolean;
  alert_fulltime: boolean;
};

const DEFAULTS: Prefs = { alert_kickoff: true, alert_lineup: true, alert_goal: true, alert_fulltime: true };
const KEYS: (keyof Prefs)[] = ["alert_kickoff", "alert_lineup", "alert_goal", "alert_fulltime"];

export default function NotificationSettings() {
  const { t } = useTranslation();
  const { user } = useUser();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from("notification_preferences")
        .select("alert_kickoff, alert_lineup, alert_goal, alert_fulltime")
        .eq("user_id", user.id).maybeSingle();
      if (data) setPrefs(data as Prefs);
      setLoading(false);
    })();
  }, [user?.id]);

  async function update(key: keyof Prefs, value: boolean) {
    if (!user?.id) return;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    await supabase.from("notification_preferences").upsert({ user_id: user.id, ...next }, { onConflict: "user_id" });
  }

  async function enablePush() {
    const res = await ensurePushSubscription();
    if (res.ok) toast.success(t("notifications.push_enabled"));
    else toast.error(t(`notifications.push_error.${res.reason}`, { defaultValue: t("notifications.push_error_generic") }));
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold italic">{t("notifications.page_title")}</h1>
        <p className="text-sm opacity-70">{t("notifications.page_subtitle")}</p>

        <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-4">
          {loading ? <div className="opacity-60 text-sm">…</div> : KEYS.map((k) => (
            <div key={k} className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">{t(`notifications.${k}.label`)}</div>
                <div className="text-xs opacity-60">{t(`notifications.${k}.desc`)}</div>
              </div>
              <Switch checked={prefs[k]} onCheckedChange={(v) => update(k, v)} />
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
          <div className="text-sm font-semibold mb-1">{t("notifications.browser_push_title")}</div>
          <div className="text-xs opacity-60 mb-3">{t("notifications.browser_push_desc")}</div>
          <Button onClick={enablePush} disabled={!isPushSupported()} className="bg-[#ff6200] hover:bg-[#ff6200]/90 text-white">
            {t("notifications.enable_browser_push")}
          </Button>
          {!isPushSupported() && <div className="text-[11px] opacity-50 mt-2">{t("notifications.push_unsupported")}</div>}
        </div>
      </div>
    </div>
  );
}
