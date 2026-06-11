/**
 * AmbassadorCenter.tsx — Painel de Comando do Embaixador.
 * Conta votos auditados gerados, conversão de afinidades, badges e compartilhamento.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, Check, Share2, Trophy, Users, Crown, ArrowLeft, MessageCircle, Send, Instagram } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { getBadge, BADGES, type BadgeTier } from "@/lib/badges";
import FanaticCities from "@/components/ambassador/FanaticCities";
import { useTranslationApp } from "@/hooks/useTranslationApp";

export default function AmbassadorCenter() {
  const navigate = useNavigate();
  const { t } = useTranslationApp();
  const { user, profile, isLoading } = useUser();
  const [loading, setLoading] = useState(true);
  const [referrals, setReferrals] = useState(0);
  const [audited, setAudited] = useState(0);
  const [conversions, setConversions] = useState(0);
  const [topBairro, setTopBairro] = useState<{ bairro: string; count: number } | null>(null);
  const [copied, setCopied] = useState(false);

  const myCode = profile?.codigo_indicacao;
  const inviteUrl = useMemo(() => `${window.location.origin}/convite?ref=${myCode ?? ""}`, [myCode]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) return navigate("/login");
    if (!myCode) { setLoading(false); return; }

    (async () => {
      // Votos auditados gerados via meu código
      const { data: refs } = await supabase
        .from("indicacoes")
        .select("indicado_id")
        .eq("embaixador_id", user.id);
      const ids = (refs ?? []).map((r: any) => r.indicado_id).filter(Boolean);
      setReferrals(ids.length);

      if (ids.length > 0) {
        const { data: votos } = await supabase
          .from("votos")
          .select("id, bairro, sympathy_1, is_fraud_attempt, is_original_vote")
          .in("user_id", ids);
        const list = (votos ?? []) as any[];
        setAudited(list.filter((v) => v.is_original_vote && !v.is_fraud_attempt).length);
        setConversions(list.filter((v) => v.sympathy_1).length);
        // Top bairro
        const map = new Map<string, number>();
        list.forEach((v) => v.bairro && map.set(v.bairro, (map.get(v.bairro) ?? 0) + 1));
        const top = [...map.entries()].sort((a, b) => b[1] - a[1])[0];
        if (top) setTopBairro({ bairro: top[0], count: top[1] });
      }
      setLoading(false);
    })();
  }, [user, profile, isLoading, navigate, myCode]);

  const badge = getBadge(referrals);

  const shareText = (clubName?: string, bairro?: string) => {
    const c = clubName ?? t("ambassador_center.default_club");
    const b = bairro ?? topBairro?.bairro ?? t("ambassador_center.default_neighborhood");
    return t("ambassador_center.share_text", { club: c, neighborhood: b, link: inviteUrl });
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success(t("ambassador_center.link_copied"));
    setTimeout(() => setCopied(false), 1800);
  };

  const shareTo = (target: "wa" | "tg" | "ig" | "native") => {
    const text = shareText();
    if (target === "wa") return window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    if (target === "tg") return window.open(`https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(text)}`, "_blank");
    if (target === "ig") {
      navigator.clipboard.writeText(text);
      return toast.success(t("ambassador_center.ig_copied"));
    }
    if (navigator.share) navigator.share({ text, url: inviteUrl }).catch(() => {});
  };

  if (isLoading || loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "Verdana, sans-serif" }}>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black border-b border-primary/30">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Heart Club" className="h-9 w-9 object-contain" />
            <div>
              <h1 className="text-base font-black italic leading-none">{t("ambassador_center.title")}</h1>
              <p className="text-[10px] text-primary italic">{t("ambassador_center.subtitle")}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> {t("ambassador_center.back")}
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Badge / Status */}
        <Card className="border-primary/40 bg-gradient-to-br from-primary/10 to-yellow-500/5 overflow-hidden">
          <CardContent className="p-6 flex flex-col md:flex-row gap-6 items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-5xl border-4"
                style={{ borderColor: badge.data?.color ?? "#666", background: "rgba(0,0,0,0.4)" }}>
                {badge.data?.emoji ?? "🎖️"}
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("ambassador_center.your_level")}</p>
                <p className="text-2xl font-black italic" style={{ color: badge.data?.color ?? "#fff" }}>
                  {badge.data?.label ?? t("ambassador_center.rookie")}
                </p>
                {topBairro && (
                  <p className="text-xs italic mt-1 flex items-center gap-1 text-yellow-500">
                    <Crown className="w-3 h-3" /> {t("ambassador_center.owner_of", { name: topBairro.bairro })}
                  </p>
                )}
              </div>
            </div>
            <div className="text-center">
              {badge.next ? (
                <>
                  <p className="text-[11px] uppercase text-muted-foreground">{t("ambassador_center.missing_for", { label: BADGES[badge.next].label })}</p>
                  <p className="text-3xl font-black text-primary italic">{badge.toNext}</p>
                  <p className="text-[10px] text-muted-foreground italic">{t("ambassador_center.indications")}</p>
                </>
              ) : (
                <p className="text-sm italic text-yellow-500">{t("ambassador_center.max_level")}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <KPI icon={<Users className="w-5 h-5" />} label="Indicações" value={referrals} />
          <KPI icon={<Trophy className="w-5 h-5" />} label="Votos Auditados Gerados" value={audited} highlight />
          <KPI icon={<Share2 className="w-5 h-5" />} label="Conversão de Afinidades" value={conversions} suffix={referrals ? `(${Math.round((conversions / Math.max(referrals,1)) * 100)}%)` : ""} />
        </div>

        {/* Compartilhar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base italic flex items-center gap-2">
              <Share2 className="w-4 h-4 text-primary" /> Compartilhamento Inteligente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <input readOnly value={inviteUrl}
                className="flex-1 bg-muted rounded px-3 py-2 text-xs font-mono" />
              <Button onClick={copyLink} size="sm" variant="outline">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground italic bg-muted/50 p-3 rounded">
              "{shareText(undefined, topBairro?.bairro)}"
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => shareTo("wa")} className="bg-green-600 hover:bg-green-700 text-white">
                <MessageCircle className="w-4 h-4 mr-1" /> WhatsApp
              </Button>
              <Button onClick={() => shareTo("tg")} className="bg-sky-500 hover:bg-sky-600 text-white">
                <Send className="w-4 h-4 mr-1" /> Telegram
              </Button>
              <Button onClick={() => shareTo("ig")} variant="outline">
                <Instagram className="w-4 h-4 mr-1" /> Instagram
              </Button>
              <Button onClick={() => shareTo("native")} variant="ghost">
                <Share2 className="w-4 h-4 mr-1" /> Mais
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Cidades fanáticas (público) */}
        <FanaticCities limit={12} />
      </main>
    </div>
  );
}

function KPI({ icon, label, value, suffix, highlight }: { icon: React.ReactNode; label: string; value: number; suffix?: string; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-primary/60" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-[11px] uppercase tracking-wider">
          {icon} <span>{label}</span>
        </div>
        <p className={`text-3xl font-black italic mt-1 ${highlight ? "text-primary" : "text-foreground"}`}>
          {value.toLocaleString("pt-BR")} <span className="text-xs text-muted-foreground">{suffix}</span>
        </p>
      </CardContent>
    </Card>
  );
}
