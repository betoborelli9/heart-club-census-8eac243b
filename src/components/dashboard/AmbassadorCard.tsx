/**
 * [CAMINHO]: src/components/dashboard/AmbassadorCard.tsx
 * Card de embaixador com compartilhamento nativo (navigator.share)
 * + fallback Desktop (WhatsApp wa.me / Telegram t.me/share).
 * Borda LED dinâmica com cores do clube do torcedor.
 */

import { motion } from "framer-motion";
import { Trophy, Share2, Copy, Target, MessageCircle, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { mockAmbassadors } from "@/data/mockDashboard";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";
import { useClubTheme } from "@/hooks/useClubTheme";

const medals = ["🥇", "🥈", "🥉"];

const AmbassadorSection = () => {
  const { toast } = useToast();
  const { profile } = useUser();
  const clubName = (profile as any)?.clube_coracao ?? null;
  const theme = useClubTheme(clubName);
  const glow = theme?.primaryHex || "#ff6200";

  const refCode = profile?.codigo_indicacao || "";
  const link = refCode
    ? `https://heartclubapp.com/convite?ref=${refCode}`
    : "https://heartclubapp.com/convite";
  const message = `Fala, torcedor! Registre seu coração no Heart Club pelo meu link e vamos dominar o mapa pelo ${clubName || "nosso clube"}: ${link}`;

  const nativeShare = async () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: "Heart Club — Censo Global do Torcedor",
          text: message,
          url: link,
        });
      } catch {
        /* usuário cancelou */
      }
    } else {
      // Desktop fallback: copia link
      navigator.clipboard.writeText(message);
      toast({ title: "Link copiado!", description: "Cole no app de mensagens preferido." });
    }
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };
  const shareTelegram = () => {
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(message)}`,
      "_blank"
    );
  };
  const copyLink = () => {
    navigator.clipboard.writeText(link);
    toast({ title: "Link copiado!", description: "Compartilhe com a torcida." });
  };

  return (
    <div className="space-y-4">
      {/* Referral Card com borda LED dinâmica */}
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <Card
          className="bg-black"
          style={{
            border: `1.5px solid ${glow}`,
            boxShadow: `0 0 14px ${glow}80, inset 0 0 8px ${glow}30`,
          }}
        >
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${glow}, #ff6200)` }}
              >
                <Share2 className="w-5 h-5 text-black" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm italic" style={{ fontFamily: "Verdana, sans-serif" }}>
                  Programa de Embaixadores
                </h3>
                <p className="text-xs text-white/60 italic">
                  Convide torcedores e domine o mapa pelo seu clube
                </p>
              </div>
            </div>

            <div
              className="flex items-center gap-2 p-3 rounded-lg bg-black"
              style={{ border: `1px solid ${glow}40` }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-white/50 italic">Seu link único</p>
                <p className="font-mono font-bold text-white text-xs truncate">{link.replace("https://", "")}</p>
              </div>
              <Button size="sm" variant="outline" onClick={copyLink} className="shrink-0 bg-black border-white/20 text-white hover:bg-white/10">
                <Copy className="w-3 h-3 mr-1" /> Copiar
              </Button>
            </div>

            {/* Botão Nativo Principal */}
            <Button
              onClick={nativeShare}
              className="w-full italic font-bold"
              style={{
                backgroundColor: "#ff6200",
                color: "#000",
                boxShadow: `0 0 14px ${glow}80`,
              }}
            >
              <Share2 className="w-4 h-4 mr-2" /> Compartilhar Convite
            </Button>

            {/* Fallback Desktop */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={shareWhatsApp}
                variant="outline"
                size="sm"
                className="bg-black border-white/20 text-white hover:bg-white/10 italic"
              >
                <MessageCircle className="w-3.5 h-3.5 mr-1.5" /> WhatsApp
              </Button>
              <Button
                onClick={shareTelegram}
                variant="outline"
                size="sm"
                className="bg-black border-white/20 text-white hover:bg-white/10 italic"
              >
                <Send className="w-3.5 h-3.5 mr-1.5" /> Telegram
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Ranking */}
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
        <Card className="glass-card border-border/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 font-display italic">
              <Trophy className="w-4 h-4 text-primary" /> Ranking de Embaixadores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockAmbassadors.map((amb, i) => (
                <motion.div
                  key={amb.name}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.15 + i * 0.04 }}
                  className="group flex items-center gap-3 p-2.5 rounded-lg border border-transparent hover:border-primary/30 hover:bg-primary/5 transition-all duration-300 cursor-pointer hover:scale-[1.02]"
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold">
                    {i < 3 ? (
                      <span className="text-lg">{medals[i]}</span>
                    ) : (
                      <span className="w-full h-full rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs">
                        {i + 1}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-bold text-foreground">{amb.name}</span>
                      <span className="text-[10px] text-muted-foreground">{amb.city}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress value={(amb.count / amb.goal) * 100} className="h-1.5 flex-1" />
                      <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-0.5">
                        <Target className="w-2.5 h-2.5" />
                        {amb.count}/{amb.goal}
                      </span>
                    </div>
                  </div>
                  <span className="text-lg font-black text-primary group-hover:scale-110 transition-transform">
                    {amb.count}
                  </span>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default AmbassadorSection;
