/**
 * [CAMINHO]: src/components/partner/PartnerRequestDialog.tsx
 * [MÓDULO]: Janela "Sou parceiro": o parceiro (que já votou como torcedor) pede acesso à página exclusiva.
 * O pedido cai na aba "Parceiros" do Admin, onde o Beto autoriza ou recusa. Sem login, orienta a entrar e votar.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Handshake, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { useTranslationApp } from "@/hooks/useTranslationApp";

type Status = "none" | "pending" | "approved" | "rejected" | "revoked";

const rpc = supabase.rpc.bind(supabase) as unknown as (
  fn: string,
  args?: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

export default function PartnerRequestDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useTranslationApp();
  const { isAuthenticated, isAuthReady } = useUser();
  const [status, setStatus] = useState<Status | null>(null);
  const [company, setCompany] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open || !isAuthenticated) return;
    let alive = true;
    setStatus(null);
    setError(false);
    (async () => {
      const { data, error: err } = await rpc("get_my_partner_status");
      if (alive) setStatus(!err && typeof data === "string" ? (data as Status) : "none");
    })();
    return () => {
      alive = false;
    };
  }, [open, isAuthenticated]);

  const canSend = company.trim().length >= 2 && contact.trim().length >= 5 && !sending;

  const send = async () => {
    setSending(true);
    setError(false);
    const { data, error: err } = await rpc("request_partner_access", {
      p_company: company,
      p_contact: contact,
      p_message: message || null,
    });
    setSending(false);
    if (err) {
      setError(true);
      return;
    }
    setStatus((typeof data === "string" ? data : "pending") as Status);
  }

  const info = (key: string) => <p className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/80">{t(key)}</p>;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-white/10 bg-black text-white rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-black italic uppercase">
            <Handshake className="h-5 w-5 text-primary" /> {t("partner.title")}
          </DialogTitle>
          <DialogDescription className="text-white/60">{t("partner.sub")}</DialogDescription>
        </DialogHeader>

        {!isAuthReady ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
        ) : !isAuthenticated ? (
          <div className="space-y-3">
            {info("partner.login_needed")}
            <Link to="/" onClick={() => onOpenChange(false)}>
              <Button className="btn-orange-gradient h-12 w-full rounded-xl font-black uppercase italic">{t("partner.go_vote")}</Button>
            </Link>
          </div>
        ) : status === null ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
        ) : status === "pending" ? (
          info("partner.pending")
        ) : status === "approved" ? (
          info("partner.approved")
        ) : status === "rejected" ? (
          info("partner.rejected")
        ) : status === "revoked" ? (
          info("partner.revoked")
        ) : (
          <div className="space-y-3">
            <Input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder={t("partner.company")}
              maxLength={120}
              className="h-12 rounded-xl border-white/10 bg-card"
            />
            <Input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder={t("partner.contact")}
              maxLength={160}
              className="h-12 rounded-xl border-white/10 bg-card"
            />
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("partner.message")}
              maxLength={500}
              rows={3}
              className="rounded-xl border-white/10 bg-card"
            />
            {error && <p className="text-xs font-bold text-red-400">{t("partner.error")}</p>}
            <Button
              onClick={send}
              disabled={!canSend}
              className="btn-orange-gradient h-12 w-full rounded-xl font-black uppercase italic"
            >
              {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : t("partner.send")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
