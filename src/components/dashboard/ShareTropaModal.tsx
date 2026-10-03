/**
 * [CAMINHO]: src/components/dashboard/ShareTropaModal.tsx
 * [MÓDULO]: Modal de Compartilhamento — Convocar a Tropa
 * Permite compartilhar o link de convite via WhatsApp, Telegram, E-mail ou Web Share nativo.
 */
import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { MessageCircle, Send, Copy, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslationApp } from "@/hooks/useTranslationApp";
import logo from "@/assets/logo.png";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  refCode?: string | null;
}

const BASE_URL = "https://heartclubapp.com/convite";

export default function ShareTropaModal({ open, onOpenChange, refCode }: Props) {
  const { toast } = useToast();
  const { t } = useTranslationApp();
  const TEXT = t("components.share_tropa.invite_text");
  const link = useMemo(
    () => (refCode ? `${BASE_URL}?ref=${encodeURIComponent(refCode)}` : BASE_URL),
    [refCode],
  );
  // Link aparece ABAIXO do texto (coerente com "clique no link abaixo"),
  // tanto no desktop quanto no mobile. WhatsApp/Telegram ainda geram preview clicável.
  const fullText = `${TEXT}\n\n${link}`;

  const openUrl = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleWhats = () =>
    openUrl(`https://wa.me/?text=${encodeURIComponent(fullText)}`);
  const handleTelegram = () =>
    openUrl(
      `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(TEXT)}`,
    );

  const handleNative = async () => {
    if (!navigator.share) return handleCopy();

    // Tenta anexar a imagem do banner como arquivo (Web Share Level 2)
    try {
      const res = await fetch("/heart-club-og.png");
      const blob = await res.blob();
      const file = new File([blob], "heart-club-convite.png", { type: blob.type });
      const payload: ShareData = { title: "Heart Club", text: fullText, url: link, files: [file] };
      // @ts-ignore - canShare nem sempre tipado
      if (navigator.canShare?.(payload)) {
        await navigator.share(payload);
        return;
      }
    } catch {}

    try {
      await navigator.share({ title: "Heart Club", text: TEXT, url: link });
    } catch {}
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      toast({
        title: t("feedback.success.link_copied_title"),
        description: t("feedback.success.link_copied_troop"),
      });
    } catch {
      toast({ variant: "destructive", title: t("feedback.error.copy_failed") });
    }
  };

  const Btn = ({
    icon: Icon,
    label,
    onClick,
    color,
  }: {
    icon: any;
    label: string;
    onClick: () => void;
    color: string;
  }) => (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all hover:scale-105"
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center"
        style={{ background: color }}
      >
        <Icon className="w-6 h-6 text-white" />
      </div>
      <span className="text-[11px] font-black italic uppercase text-white/80">{label}</span>
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border-white/10 max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#ff6200] to-[#ff8533] flex items-center justify-center shadow-lg shadow-[#ff6200]/30 shrink-0">
              <img src={logo} alt="Heart Club" className="w-7 h-7 object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-white font-black italic uppercase tracking-tight text-lg">
                {t("components.share_tropa.title")}
              </DialogTitle>
              <DialogDescription className="text-white/60 text-xs italic">
                {t("components.share_tropa.subtitle")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-xl overflow-hidden border border-[#ff6200]/30 shadow-lg shadow-[#ff6200]/20 hover:scale-[1.02] transition-transform"
        >
          <img
            src="/heart-club-og.png"
            alt={t("components.share_tropa.banner_alt")}
            className="w-full h-auto block"
            loading="lazy"
          />
        </a>

        <div className="grid grid-cols-2 gap-3 mt-2">
          <Btn icon={MessageCircle} label="WhatsApp" color="#25D366" onClick={handleWhats} />
          <Btn icon={Send} label="Telegram" color="#0088CC" onClick={handleTelegram} />
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
            <span className="text-[11px] text-white/60 truncate flex-1 font-mono">{link}</span>
            <button
              onClick={handleCopy}
              className="text-[10px] font-black uppercase italic text-[#ff6200] hover:underline flex items-center gap-1 shrink-0"
            >
              <Copy className="w-3 h-3" /> {t("common.copy")}
            </button>
          </div>

          <button
            onClick={handleNative}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#ff6200] text-black font-black italic uppercase text-xs hover:scale-[1.02] transition-transform"
          >
            <Share2 className="w-4 h-4" /> {t("components.share_tropa.share_more")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
