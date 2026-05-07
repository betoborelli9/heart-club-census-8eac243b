/**
 * [CAMINHO]: src/components/dashboard/SocialShareBanners.tsx
 * [MÓDULO]: Coluna 3 — 3 banners verticais 9:16 prontos para Stories
 */
import { Instagram, Send, MessageCircle, Download, Share2 } from "lucide-react";
import { ClubLogo } from "@/components/ClubLogo";

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
  action: "post" | "post" | "download";
  actionLabel: string;
}

export default function SocialShareBanners({
  clubName,
  clubLogo,
  primaryColor = "#ff6200",
  secondaryColor = "#000000",
  censusCount,
  onShare,
}: Props) {
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
              className="relative aspect-[9/16] rounded-lg overflow-hidden flex flex-col items-center justify-between p-2 text-white"
              style={{ background: b.bg(primaryColor, secondaryColor) }}
            >
              <div className="absolute inset-0 opacity-10 mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
              {clubLogo && (
                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                  <img src={clubLogo} alt="" className="w-3/4 h-3/4 object-contain" />
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
              onClick={() => onShare?.(idx)}
              className="w-full py-1.5 rounded-md text-[8px] font-black italic uppercase tracking-wider flex items-center justify-center gap-1 hover:scale-105 transition-transform"
              style={{
                background: b.action === "download" ? "transparent" : primaryColor,
                color: b.action === "download" ? primaryColor : "#000",
                border: b.action === "download" ? `1px solid ${primaryColor}` : "none",
              }}
            >
              {b.action === "download" ? <Download className="w-2.5 h-2.5" /> : <Share2 className="w-2.5 h-2.5" />}
              {b.actionLabel}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
