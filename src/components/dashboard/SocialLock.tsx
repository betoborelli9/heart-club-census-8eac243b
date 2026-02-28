import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Unlock, ExternalLink, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const SOCIAL_LINKS = [
  {
    platform: "TikTok",
    url: "https://tiktok.com/@heartclubglobal",
    icon: "🎵",
  },
  {
    platform: "Instagram",
    url: "https://instagram.com/heartclubglobal",
    icon: "📸",
  },
];

const SocialLock = () => {
  const { user } = useUser();
  const { toast } = useToast();
  const [followedPlatforms, setFollowedPlatforms] = useState<Set<string>>(new Set());
  const [unlocked, setUnlocked] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleFollow = (platform: string, url: string) => {
    window.open(url, "_blank");
    setFollowedPlatforms((prev) => new Set(prev).add(platform));
  };

  const handleConfirmFollow = async () => {
    if (!user || followedPlatforms.size < 2) return;
    setSaving(true);
    try {
      // Update ambassador social_verified flag
      const { error } = await supabase.from("ambassador_levels").upsert(
        {
          user_id: user.id,
          level: "bronze",
          scope_type: "city",
          scope_value: "pending",
          social_verified: true,
        },
        { onConflict: "user_id,scope_type" }
      );
      if (error) throw error;
      setUnlocked(true);
      toast({ title: "Conteúdo desbloqueado! 🎉", description: "Você tem acesso ao Card de Embaixador e Duelo de Censo." });
    } catch {
      toast({ variant: "destructive", title: "Erro ao salvar" });
    } finally {
      setSaving(false);
    }
  };

  if (unlocked) {
    return (
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <Card className="glass-card border-primary/30 glow-border">
          <CardContent className="pt-5 text-center space-y-2">
            <Unlock className="w-8 h-8 text-primary mx-auto" />
            <p className="text-sm font-bold text-foreground">Conteúdo Premium Liberado!</p>
            <p className="text-xs text-muted-foreground">Card de Embaixador e Duelo de Censo disponíveis.</p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
      <Card className="glass-card border-border/30 overflow-hidden">
        <div className="h-1 w-full" style={{ background: "var(--gradient-orange)" }} />
        <CardContent className="pt-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Social Lock</h3>
              <p className="text-xs text-muted-foreground">
                Siga o Heart Club para desbloquear features exclusivas
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {SOCIAL_LINKS.map((social) => {
              const followed = followedPlatforms.has(social.platform);
              return (
                <button
                  key={social.platform}
                  onClick={() => handleFollow(social.platform, social.url)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                    followed
                      ? "bg-primary/10 border border-primary/30"
                      : "bg-secondary/30 border border-border/20 hover:border-primary/30"
                  }`}
                >
                  <span className="text-lg">{social.icon}</span>
                  <span className="text-sm font-medium text-foreground flex-1 text-left">
                    {social.platform}
                  </span>
                  {followed ? (
                    <CheckCircle className="w-4 h-4 text-primary" />
                  ) : (
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              );
            })}
          </div>

          <Button
            className="w-full btn-orange-gradient"
            disabled={followedPlatforms.size < 2 || saving}
            onClick={handleConfirmFollow}
          >
            {followedPlatforms.size < 2
              ? `Siga ${2 - followedPlatforms.size} rede${2 - followedPlatforms.size > 1 ? "s" : ""} para desbloquear`
              : "Já sigo! Desbloquear"}
          </Button>

          <p className="text-[10px] text-center text-muted-foreground">
            🔓 Desbloqueia: Card de Embaixador personalizado + Duelo de Censo
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default SocialLock;
