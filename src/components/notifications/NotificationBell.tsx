/**
 * NotificationBell — sininho do header com histórico (últimas 20) e badge de não-lidas.
 * Lê notification_history do usuário via Supabase + Realtime. Isolado.
 */
import { useEffect, useState } from "react";
import { Bell, Settings as SettingsIcon, CheckCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

type Item = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
};

export function NotificationBell({ userId }: { userId?: string }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);

  async function load() {
    if (!userId) return;
    const { data } = await supabase
      .from("notification_history")
      .select("id, type, title, body, read, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    setItems((data as Item[]) || []);
  }

  useEffect(() => { load(); }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const ch = supabase.channel(`notif-${userId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "notification_history", filter: `user_id=eq.${userId}` },
        () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  const unread = items.filter((i) => !i.read).length;

  async function markAllRead() {
    if (!userId || unread === 0) return;
    await supabase.from("notification_history").update({ read: true }).eq("user_id", userId).eq("read", false);
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
  }

  const dtFmt = new Intl.DateTimeFormat(i18n.language, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("notifications.aria")} className="text-white/80 hover:text-[#ff6200] relative">
          <Bell className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#ff6200] text-[10px] font-bold text-white grid place-items-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 bg-black/95 border-white/10 text-white">
        <div className="flex items-center justify-between p-3 border-b border-white/10">
          <span className="text-xs font-bold uppercase tracking-wider">{t("notifications.title")}</span>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7 text-white/70 hover:text-white" onClick={markAllRead} title={t("notifications.mark_all_read")}>
              <CheckCheck className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-6 text-center text-xs opacity-60">{t("notifications.empty")}</div>
          ) : items.map((n) => (
            <div key={n.id} className={`p-3 border-b border-white/5 ${n.read ? "opacity-60" : ""}`}>
              <div className="text-sm font-semibold truncate">{n.title}</div>
              {n.body && <div className="text-xs opacity-80 line-clamp-2">{n.body}</div>}
              <div className="text-[10px] opacity-50 mt-1">{dtFmt.format(new Date(n.created_at))}</div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
