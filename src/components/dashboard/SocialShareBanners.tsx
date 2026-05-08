/**
 * [CAMINHO]: src/components/dashboard/SocialShareBanners.tsx
 * [MÓDULO]: Coluna 3 — 3 banners verticais 9:16 prontos para Stories
 * Postar Agora: tenta Web Share API com arquivo (Instagram via mobile) e fallback para download.
 * Baixar Stories: gera PNG 1080x1920 do banner.
 */
import { useRef } from "react";
import { Instagram, Send, MessageCircle, Download, Share2 } from "lucide-react";
import { toPng } from "html-to-image";
import { ClubLogo } from "@/components/ClubLogo";
import { useToast } from "@/hooks/use-toast";

interface Props {
  clubName: string | null;
  clubLogo?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  censusCount?: number;
  onShare?: (idx: number) => void;
}

interface BannerSpec {
  title: string;
  subtitle: string;
  cta: string;
  bg: (primary: string, secondary: string) => string;
  action: "post" | "download";
  actionLabel: string;
}

export default function SocialShareBanners({
  clubName,
  clubLogo,
  primaryColor = "#ff6200",
  secondaryColor = "#000000",
  censusCount,
}: Props) {
  const { toast } = useToast();
  const bannerRefs = useRef<(HTMLDivElement | null)[]>([]);

  const banners: BannerSpec[] = [
    {
      title: "VOTE PELO",
      subtitle: clubName || "TIME",
      cta: "[VOTAR]",
      bg: (p) => `linear-gradient(160deg, ${p} 0%, #1a1a1a 80%)`,
      action: "post",
      actionLabel: "Postar Agora",
    },
    {
      title: "SOMOS A",
      subtitle: "MAIOR TORCIDA?",
      cta: censusCount ? `${censusCount.toLocaleString("pt-BR")} VOZES` : "DESCUBRA",
      bg: (p, s) => `linear-gradient(160deg, ${s || "#1a1a1a"} 0%, ${p} 100%)`,
      action: "post",
      actionLabel: "Postar Agora",
    },
    {
      title: "REGISTRE SEU GRITO!",
      subtitle: clubName || "",
      cta: "[BAIXAR]",
      bg: (p) => `linear-gradient(160deg, #1a1a1a 0%, ${p}88 70%, #000 100%)`,
      action: "download",
      actionLabel: "Baixar Stories",
    },
  ];

  const captureBanner = async (idx: number): Promise<Blob | null> => {
    const node = bannerRefs.current[idx];
    if (!node) return null;
    try {
      const rect = node.getBoundingClientRect();
      const scale = 1080 / rect.width;
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: scale,
        backgroundColor: "#000000",
      });
      const res = await fetch(dataUrl);
      return await res.blob();
    } catch (e) {
      console.error("[SocialShareBanners] capture failed", e);
      return null;
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const slug = (clubName || "heart-club").toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const handleAction = async (idx: number, action: "post" | "download") => {
    if (action === "post") {
      toast({
        title: "✨ Gerando seu banner...",
        description: "Agora basta selecionar o Instagram na lista e postar nos Stories.",
        className:
          "border border-[#ff6200]/40 bg-gradient-to-br from-black via-zinc-900 to-black text-white shadow-[0_0_30px_rgba(255,98,0,0.25)] backdrop-blur-xl",
      });
    } else {
      toast({
        title: "Preparando seu banner...",
        description: "O download começará em instantes.",
        className:
          "border border-[#ff6200]/40 bg-gradient-to-br from-black via-zinc-900 to-black text-white shadow-[0_0_30px_rgba(255,98,0,0.25)] backdrop-blur-xl",
      });
    }

    const blob = await captureBanner(idx);
    if (!blob) {
      toast({ variant: "destructive", title: "Falha ao gerar banner." });
      return;
    }
    const filename = `heart-club-${slug}-${idx + 1}.png`;
    const file = new File([blob], filename, { type: "image/png" });

    if (action === "post" && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "Heart Club",
          text: `${clubName || "Heart Club"} · Censo Global do Futebol`,
        });
        return;
      } catch {
        // user cancelled or unsupported — fallback to download
      }
    }
    downloadBlob(blob, filename);
    toast({
      title: action === "post" ? "Banner baixado!" : "Banner salvo!",
      description:
        action === "post"
          ? "Abra o Instagram e poste como Stories. (postagem direta requer compartilhar pelo celular)"
          : "Pronto para postar nos seus Stories.",
      className:
        "border border-[#ff6200]/40 bg-gradient-to-br from-black via-zinc-900 to-black text-white shadow-[0_0_30px_rgba(255,98,0,0.25)] backdrop-blur-xl",
    });
  };

  return (
    <section className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 space-y-3">
      <header className="flex items-center gap-2 pb-2 border-b border-white/5">
        <Share2 className="w-4 h-4" style={{ color: primaryColor }} />
        <h3 className="text-[11px] font-black italic uppercase tracking-widest text-white flex-1">
          Compartilhamento Social
        </h3>
      </header>
      <p className="text-[10px] italic text-white/50 leading-snug">
        Banners pré-formatados — convide sua torcida
      </p>

      <div className="grid grid-cols-3 gap-2">
        {banners.map((b, idx) => (
          <div key={idx} className="space-y-2">
            {/* Banner vertical 9:16 */}
            <div
              ref={(el) => (bannerRefs.current[idx] = el)}
              className="relative aspect-[9/16] rounded-lg overflow-hidden flex flex-col items-center justify-between p-2 text-white"
              style={{ background: b.bg(primaryColor, secondaryColor) }}
            >
              {clubLogo && (
                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                  <img src={clubLogo} alt="" crossOrigin="anonymous" className="w-3/4 h-3/4 object-contain" />
                </div>
              )}
              <div className="relative z-10 flex flex-col items-center text-center">
                <p className="text-[8px] font-black italic uppercase tracking-widest leading-none">
                  {b.title}
                </p>
                <p className="text-[10px] font-black italic uppercase leading-tight mt-0.5">
                  {b.subtitle}
                </p>
              </div>
              <div className="relative z-10 flex flex-col items-center gap-1">
                {clubLogo && <ClubLogo src={clubLogo} alt="" size="xs" className="w-6 h-6" />}
                <p
                  className="text-[8px] font-black italic uppercase tracking-widest"
                  style={{ color: primaryColor }}
                >
                  {b.cta}
                </p>
              </div>
            </div>

            {/* Mini Social icons */}
            <div className="flex items-center justify-center gap-1.5 text-white/40">
              <MessageCircle className="w-2.5 h-2.5" />
              <Instagram className="w-2.5 h-2.5" />
              <Send className="w-2.5 h-2.5" />
            </div>

            {/* Botão */}
            <button
              onClick={() => handleAction(idx, b.action)}
              className="w-full py-1.5 rounded-md text-[8px] font-black italic uppercase tracking-wider flex items-center justify-center gap-1 hover:scale-105 transition-transform"
              style={{
                background: b.action === "download" ? "transparent" : primaryColor,
                color: b.action === "download" ? primaryColor : "#000",
                border: b.action === "download" ? `1px solid ${primaryColor}` : "none",
              }}
            >
              {b.action === "download" ? <Download className="w-2.5 h-2.5" /> : <Instagram className="w-2.5 h-2.5" />}
              {b.actionLabel}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
