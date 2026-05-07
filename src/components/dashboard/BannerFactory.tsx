/**
 * [CAMINHO]: src/components/dashboard/BannerFactory.tsx
 * [MÓDULO]: Fábrica de banners verticais 1080x1920 (Stories/WhatsApp)
 */
import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Download, Share2, Image as ImageIcon } from "lucide-react";
import logo from "@/assets/logo.png";

interface Props {
  clubName: string | null;
  clubLogo?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  censusCount?: number;
  goalLabel?: string | null;
}

export default function BannerFactory({
  clubName,
  clubLogo,
  primaryColor = "#ff6200",
  secondaryColor = "#000000",
  censusCount,
  goalLabel,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const phrase =
    goalLabel ||
    (censusCount && censusCount > 0
      ? `Somos ${censusCount.toLocaleString("pt-BR")} vozes no censo!`
      : "A maior torcida do mundo está aqui.");

  const generate = async (): Promise<string | null> => {
    if (!ref.current) return null;
    setBusy(true);
    try {
      const dataUrl = await toPng(ref.current, { pixelRatio: 1, cacheBust: true });
      return dataUrl;
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async () => {
    const url = await generate();
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `heart-club-${(clubName || "torcedor").toLowerCase().replace(/\s+/g, "-")}.png`;
    a.click();
  };

  const handleShare = async () => {
    const url = await generate();
    if (!url) return;
    try {
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], "heart-club.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Heart Club", text: phrase });
        return;
      }
    } catch {/* fallback */}
    window.open(`https://wa.me/?text=${encodeURIComponent(phrase + " — Heart Club")}`, "_blank");
  };

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <ImageIcon className="w-5 h-5" style={{ color: primaryColor }} />
        <h2 className="text-lg md:text-xl font-black italic uppercase tracking-tight">Fábrica de Banners</h2>
      </header>

      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 flex flex-col md:flex-row gap-4 items-center">
        {/* Preview escalado */}
        <div className="shrink-0" style={{ width: 162, height: 288 }}>
          <div
            className="origin-top-left"
            style={{ transform: "scale(0.15)", width: 1080, height: 1920 }}
          >
            <BannerCanvas
              ref={ref}
              clubName={clubName}
              clubLogo={clubLogo}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              phrase={phrase}
            />
          </div>
        </div>

        <div className="flex-1 space-y-3 w-full">
          <p className="text-sm italic text-white/70">{phrase}</p>
          <p className="text-[10px] uppercase font-mono text-white/40">Formato Stories/Reels — 1080×1920</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleDownload}
              disabled={busy || !clubName}
              className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl font-black italic uppercase text-xs disabled:opacity-50"
              style={{ background: primaryColor, color: "#000" }}
            >
              <Download className="w-4 h-4" /> {busy ? "Gerando..." : "Baixar para Stories"}
            </button>
            <button
              onClick={handleShare}
              disabled={busy || !clubName}
              className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl font-black italic uppercase text-xs border disabled:opacity-50"
              style={{ borderColor: primaryColor, color: primaryColor }}
            >
              <Share2 className="w-4 h-4" /> WhatsApp
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

const BannerCanvas = ({ ref: refProp, clubName, clubLogo, primaryColor, secondaryColor, phrase }: any) => (
  <div
    ref={refProp}
    style={{
      width: 1080,
      height: 1920,
      background: `linear-gradient(160deg, ${primaryColor} 0%, ${secondaryColor || "#000"} 70%, #000 100%)`,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 80,
      fontFamily: "Verdana, sans-serif",
      color: "#fff",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
      <img src={logo} alt="" style={{ height: 90, width: "auto" }} crossOrigin="anonymous" />
      <span style={{ fontSize: 42, fontWeight: 900, fontStyle: "italic", textTransform: "uppercase", letterSpacing: -2 }}>
        Heart Club
      </span>
    </div>

    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 40 }}>
      {clubLogo && (
        <div
          style={{
            width: 420,
            height: 420,
            borderRadius: "50%",
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
          }}
        >
          <img src={clubLogo} alt="" style={{ width: 340, height: 340, objectFit: "contain" }} crossOrigin="anonymous" />
        </div>
      )}
      <h1
        style={{
          fontSize: 110,
          fontWeight: 900,
          fontStyle: "italic",
          textTransform: "uppercase",
          letterSpacing: -4,
          textAlign: "center",
          lineHeight: 0.95,
          textShadow: "0 4px 20px rgba(0,0,0,0.5)",
        }}
      >
        {clubName || "Heart Club"}
      </h1>
      <p
        style={{
          fontSize: 56,
          fontWeight: 700,
          fontStyle: "italic",
          textAlign: "center",
          maxWidth: 900,
          lineHeight: 1.15,
          opacity: 0.95,
        }}
      >
        {phrase}
      </p>
    </div>

    <div
      style={{
        fontSize: 32,
        fontWeight: 900,
        fontStyle: "italic",
        textTransform: "uppercase",
        letterSpacing: 6,
        opacity: 0.7,
      }}
    >
      heartclubapp.com
    </div>
  </div>
);
