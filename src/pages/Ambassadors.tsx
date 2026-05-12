/**
 * [CAMINHO/ARQUIVO]: src/pages/Ambassadors.tsx
 * Página de Embaixadores — Gamificação, Censo e Ranking de Dominância
 */

/* [MÓDULO: IMPORTS] */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  LogOut,
  Share2,
  Copy,
  Check,
  Trophy,
  Users,
  Globe,
  Map,
  Building2,
  Landmark,
  Activity,
  MessageCircle,
  Send,
  Mail,
  Link2,
  Sparkles,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { CLUBS_DATA, type ClubData } from "@/clubes-data";
import { ClubLogo } from "@/components/ClubLogo";
import ClubBanner from "@/components/dashboard/ClubBanner";
import { useClubTheme } from "@/hooks/useClubTheme";
import { toast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";

/* [MÓDULO: HELPERS] */
const normalize = (v: string) =>
  v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9\s]/g, " ").trim().toLowerCase();

const resolveClub = (name: string | null): ClubData | null => {
  if (!name) return null;
  return CLUBS_DATA.find((c) => normalize(c.nome) === normalize(name)) ?? null;
};

/* [MÓDULO: PAÍSES / DDI WHATSAPP] */
export interface CountryDial {
  code: string;        // ISO ex: BR
  name: string;        // Nome em PT
  dial: string;        // ex: +55
  flag: string;        // emoji
  digits: [number, number]; // min/max digitos do numero local
}

export const COUNTRY_DIALS: CountryDial[] = [
  { code: "BR", name: "Brasil", dial: "+55", flag: "🇧🇷", digits: [10, 11] },
  { code: "PT", name: "Portugal", dial: "+351", flag: "🇵🇹", digits: [9, 9] },
  { code: "US", name: "Estados Unidos", dial: "+1", flag: "🇺🇸", digits: [10, 10] },
  { code: "AR", name: "Argentina", dial: "+54", flag: "🇦🇷", digits: [10, 11] },
  { code: "UY", name: "Uruguai", dial: "+598", flag: "🇺🇾", digits: [8, 9] },
  { code: "PY", name: "Paraguai", dial: "+595", flag: "🇵🇾", digits: [9, 9] },
  { code: "CL", name: "Chile", dial: "+56", flag: "🇨🇱", digits: [9, 9] },
  { code: "CO", name: "Colômbia", dial: "+57", flag: "🇨🇴", digits: [10, 10] },
  { code: "PE", name: "Peru", dial: "+51", flag: "🇵🇪", digits: [9, 9] },
  { code: "VE", name: "Venezuela", dial: "+58", flag: "🇻🇪", digits: [10, 10] },
  { code: "BO", name: "Bolívia", dial: "+591", flag: "🇧🇴", digits: [8, 8] },
  { code: "EC", name: "Equador", dial: "+593", flag: "🇪🇨", digits: [9, 9] },
  { code: "MX", name: "México", dial: "+52", flag: "🇲🇽", digits: [10, 10] },
  { code: "ES", name: "Espanha", dial: "+34", flag: "🇪🇸", digits: [9, 9] },
  { code: "IT", name: "Itália", dial: "+39", flag: "🇮🇹", digits: [9, 11] },
  { code: "FR", name: "França", dial: "+33", flag: "🇫🇷", digits: [9, 9] },
  { code: "DE", name: "Alemanha", dial: "+49", flag: "🇩🇪", digits: [10, 11] },
  { code: "GB", name: "Reino Unido", dial: "+44", flag: "🇬🇧", digits: [10, 10] },
  { code: "NL", name: "Holanda", dial: "+31", flag: "🇳🇱", digits: [9, 9] },
  { code: "BE", name: "Bélgica", dial: "+32", flag: "🇧🇪", digits: [9, 9] },
  { code: "CH", name: "Suíça", dial: "+41", flag: "🇨🇭", digits: [9, 9] },
  { code: "IE", name: "Irlanda", dial: "+353", flag: "🇮🇪", digits: [9, 9] },
  { code: "CA", name: "Canadá", dial: "+1", flag: "🇨🇦", digits: [10, 10] },
  { code: "JP", name: "Japão", dial: "+81", flag: "🇯🇵", digits: [10, 11] },
  { code: "AU", name: "Austrália", dial: "+61", flag: "🇦🇺", digits: [9, 9] },
  { code: "AO", name: "Angola", dial: "+244", flag: "🇦🇴", digits: [9, 9] },
  { code: "MZ", name: "Moçambique", dial: "+258", flag: "🇲🇿", digits: [9, 9] },
];

const formatPhoneBR = (digits: string): string => {
  const d = digits.slice(0, 11);
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const formatPhoneByCountry = (value: string, country: CountryDial): string => {
  const digits = value.replace(/\D/g, "").slice(0, country.digits[1]);
  if (country.code === "BR") return formatPhoneBR(digits);
  // formato genérico: agrupa em blocos de 3-4
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
};

const isValidPhoneByCountry = (value: string, country: CountryDial): boolean => {
  const len = value.replace(/\D/g, "").length;
  return len >= country.digits[0] && len <= country.digits[1];
};

/* [MÓDULO: TIPOS] */
interface RankingEntry {
  user_id: string;
  nome: string | null;
  clube_nome: string | null;
  cidade: string | null;
  points: number;
}

interface ActivityEntry {
  id: string;
  nome: string | null;
  cidade?: string | null;
  estado?: string | null;
  clube_nome?: string | null;
  bairro?: string | null;
  voto_created_at?: string | null;
  created_at: string;
}

/* [MÓDULO: BUILD MARKER] */
const BUILD_SYNC_TAG = "2026-03-23-ambassadors-sync-01";

/* ============================================== */
/* COMPONENTE PRINCIPAL                           */
/* ============================================== */
const Ambassadors = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading, signOut, updateProfile, refreshProfile } = useUser();

  /* [MÓDULO: ESTADO LOCAL] */
  const [clubName, setClubName] = useState<string | null>(null);
  const [clubData, setClubData] = useState<ClubData | null>(null);
  const [showCensusModal, setShowCensusModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [activityFeed, setActivityFeed] = useState<ActivityEntry[]>([]);
  const [professions, setProfessions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rankingTab, setRankingTab] = useState("nacional");

  /* Census form state */
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneCountry, setPhoneCountry] = useState<CountryDial>(
    () => COUNTRY_DIALS.find((c) => c.code === (profile?.pais || "BR")) ?? COUNTRY_DIALS[0]
  );
  const [professionInput, setProfessionInput] = useState("");
  const [birthDate, setBirthDate] = useState<Date | undefined>(undefined);

  /* [MÓDULO: CARREGA CLUBE DO USUÁRIO] */
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("votos")
        .select("clube_nome")
        .eq("user_id", user.id)
        .eq("is_original_vote", true)
        .maybeSingle();
      const name = data?.clube_nome ?? null;
      setClubName(name);
      setClubData(resolveClub(name));
    };
    load();
  }, [user]);

  /* [MÓDULO: SEGURANÇA E CENSO]
   * Modal abre apenas quando o torcedor entra no painel de Embaixador
   * sem ter completado WhatsApp + Profissão. Data de nascimento já é
   * coletada em outro fluxo (ProfileSetup), então não duplicamos aqui. */
  useEffect(() => {
    if (!profile || isLoading) return;
    const needsCensus = !profile.profissao || !profile.telefone;
    setShowCensusModal(needsCensus);
  }, [profile, isLoading]);

  /* [MÓDULO: CARREGA PROFISSÕES] */
  useEffect(() => {
    const loadProfessions = async () => {
      const { data } = await supabase.from("lista_profissoes").select("nome").order("nome");
      if (data) setProfessions(data.map((p) => p.nome));
    };
    loadProfessions();
  }, []);

  /* [MÓDULO: CARREGA RANKING E FEED] */
  useEffect(() => {
    if (!user) return;
    const loadRanking = async () => {
      // Busca todas as indicações agrupadas por embaixador
      const { data: indicacoes } = await supabase
        .from("indicacoes")
        .select("embaixador_id, indicado_id, created_at");

      if (!indicacoes) return;

      // Agrupa por embaixador
      const pointsMap: Record<string, number> = {};
      indicacoes.forEach((ind) => {
        if (ind.embaixador_id) {
          pointsMap[ind.embaixador_id] = (pointsMap[ind.embaixador_id] || 0) + 1;
        }
      });

      // Busca perfis dos top embaixadores
      const topIds = Object.entries(pointsMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([id]) => id);

      if (topIds.length === 0) {
        setRanking([]);
        return;
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nome_exibicao, cidade")
        .in("id", topIds);

      // Busca clube de cada embaixador
      const { data: votos } = await supabase
        .from("votos")
        .select("user_id, clube_nome")
        .in("user_id", topIds)
        .eq("is_original_vote", true);

      const votosMap: Record<string, string> = {};
      votos?.forEach((v) => { votosMap[v.user_id] = v.clube_nome; });

      const rankingData: RankingEntry[] = topIds.map((id) => {
        const p = profiles?.find((pr) => pr.id === id);
        return {
          user_id: id,
          nome: p?.nome_exibicao ?? "Anônimo",
          clube_nome: votosMap[id] ?? null,
          cidade: p?.cidade ?? null,
          points: pointsMap[id] || 0,
        };
      }).sort((a, b) => b.points - a.points);

      setRanking(rankingData);
    };

    const loadActivityFeed = async () => {
      const { data, error } = await supabase.rpc("get_my_ambassador_referrals");
      if (error || !data) {
        setActivityFeed([]);
        return;
      }
      const feed: ActivityEntry[] = (data as any[])
        .filter((d) => typeof d.nome === "string" && d.nome.trim().length > 0)
        .map((d) => ({
          id: d.indicacao_id,
          nome: d.nome.trim(),
          cidade: d.cidade ?? null,
          estado: d.estado ?? null,
          clube_nome: d.clube_nome ?? null,
          bairro: d.bairro ?? null,
          voto_created_at: d.voto_created_at ?? null,
          created_at: d.indicacao_created_at ?? "",
        }));
      setActivityFeed(feed);
    };

    loadRanking();
    loadActivityFeed();
  }, [user]);

  /* [MÓDULO: AÇÃO DO CENSO] */
  const handleCensusSubmit = async () => {
    if (!isValidPhoneByCountry(phoneInput, phoneCountry)) {
      toast({ title: "WhatsApp inválido", description: `Informe um número válido para ${phoneCountry.name}.`, variant: "destructive" });
      return;
    }
    if (!professionInput.trim()) {
      toast({ title: "Profissão obrigatória", description: "Digite sua profissão.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      await updateProfile({
        telefone: `${phoneCountry.dial}${phoneInput.replace(/\D/g, "")}`,
        profissao: professionInput.trim(),
      });
      await refreshProfile();
      setShowCensusModal(false);
      toast({ title: "Painel liberado!", description: "Seus dados foram salvos com sucesso." });
    } catch {
      toast({ title: "Erro ao salvar", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* [MÓDULO: COPIAR CÓDIGO] */
  const handleCopyCode = () => {
    const code = profile?.codigo_indicacao || "";
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* [MÓDULO: LINK ÚNICO DE INDICAÇÃO] */
  const referralLink = useMemo(() => {
    const code = profile?.codigo_indicacao || user?.id || "";
    const base = typeof window !== "undefined" ? window.location.origin : "https://heart-club-census.lovable.app";
    return `${base}/convite?ref=${encodeURIComponent(code)}`;
  }, [profile?.codigo_indicacao, user?.id]);

  const referralMessage = useMemo(() => {
    const nome = profile?.nome_exibicao ? ` ${profile.nome_exibicao}` : "";
    return `🧡 Fala, torcedor! Registre seu coração no Heart Club pelo meu link e vamos dominar o mapa:${nome ? ` (convite de${nome})` : ""} ${referralLink}`;
  }, [referralLink, profile?.nome_exibicao]);

  /* [MÓDULO: COMPARTILHAR MULTICANAL] */
  const shareWhatsApp = () => window.open(`https://wa.me/?text=${encodeURIComponent(referralMessage)}`, "_blank");
  const shareTelegram = () => window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(referralMessage)}`, "_blank");
  const shareEmail = () => {
    const subject = encodeURIComponent("Te convido para o Heart Club Census 🧡");
    window.location.href = `mailto:?subject=${subject}&body=${encodeURIComponent(referralMessage)}`;
  };
  const shareCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      toast({ title: "Link copiado!", description: "Cole onde quiser compartilhar." });
    } catch {
      toast({ title: "Não foi possível copiar", variant: "destructive" });
    }
  };
  const shareNative = async () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: "Heart Club Census", text: referralMessage, url: referralLink });
      } catch {}
    } else {
      shareCopyLink();
    }
  };

  const theme = useClubTheme(clubName);

  /* [MÓDULO: PROGRESSO DO EMBAIXADOR — CRYSTAL GLOW DINÂMICO] */
  const indicacoesCount = activityFeed.length;
  const levelInfo = useMemo(() => {
    const tiers = [
      { name: "Bronze", min: 0, next: 5 },
      { name: "Prata", min: 5, next: 15 },
      { name: "Ouro", min: 15, next: 50 },
      { name: "Platina", min: 50, next: 150 },
      { name: "Diamante", min: 150, next: 500 },
      { name: "Lendário", min: 500, next: 500 },
    ];
    const idx = tiers.findIndex((t, i) => indicacoesCount < (tiers[i + 1]?.min ?? Infinity));
    const tier = tiers[Math.max(0, idx === -1 ? tiers.length - 1 : idx)];
    const nextTier = tiers[Math.min(tiers.length - 1, (idx === -1 ? tiers.length - 1 : idx) + 1)];
    const span = Math.max(1, nextTier.min - tier.min);
    const progress = Math.min(100, Math.round(((indicacoesCount - tier.min) / span) * 100));
    return { tier: tier.name, next: nextTier.name, progress, indicacoesCount, faltam: Math.max(0, nextTier.min - indicacoesCount) };
  }, [indicacoesCount]);


  /* [MÓDULO: LOADING / AUTH GUARD] */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#ff6200] w-10 h-10" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <h1 className="text-2xl font-black italic uppercase">Embaixadores</h1>
          <p className="mt-3 text-sm text-white/50">Faça login para acessar o painel de embaixadores.</p>
          <Button className="mt-6 w-full bg-[#ff6200] hover:bg-[#e55800]" onClick={() => navigate("/login")}>
            Entrar agora
          </Button>
        </div>
      </div>
    );
  }

  const rivalClubData = (name: string | null) => resolveClub(name);

  return (
    <div data-build={BUILD_SYNC_TAG} className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      {/* [MÓDULO: HEADER] */}
      <header className="h-16 border-b border-white/5 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/dashboard")}>
            <img src={logo} alt="Logo" className="h-8 md:h-10 w-auto" />
            <span className="font-black italic text-lg tracking-tighter">HEART CLUB</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => signOut()} className="text-white/50">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-2 md:px-4 py-4 space-y-5">
        {/* [MÓDULO: SLOT DE PATROCINADOR — FIXO NO TOPO] */}
        <div
          className="rounded-2xl border border-white/10 bg-gradient-to-r from-white/[0.04] via-white/[0.02] to-white/[0.04] px-4 py-3 flex items-center justify-between gap-3"
          aria-label="Espaço patrocinado"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[#ff6200] shrink-0">
              Parceiro Oficial
            </span>
            <span className="text-xs text-white/70 italic truncate">
              Seu negócio aqui — fale com o time Heart Club.
            </span>
          </div>
          <a
            href="mailto:admin@heartclubapp.com?subject=Quero%20ser%20Parceiro%20Heart%20Club"
            className="text-[10px] font-black uppercase tracking-wider text-[#ff6200] hover:underline shrink-0"
          >
            Anunciar
          </a>
        </div>

        {/* [MÓDULO: BANNER REUTILIZÁVEL] */}
        <ClubBanner
          clubName={clubName}
          clubData={clubData}
          theme={theme}
          pageLabel="EMBAIXADORES"
          ambassadorLevel={profile?.nivel_embaixador || "Bronze"}
        />

        {/* [MÓDULO: CARD DO EMBAIXADOR — Estilo FIFA Card] */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid gap-5 lg:grid-cols-[1fr_320px]"
        >
          <div
            className="relative overflow-hidden rounded-3xl border border-white/10 p-6 md:p-8 shadow-2xl"
            style={{
              background: `linear-gradient(135deg, ${theme.primaryHex}22, #0a0a0a 60%)`,
            }}
          >
            {/* Glow accent */}
            <div
              className="absolute top-0 right-0 w-40 h-40 rounded-full blur-[80px] opacity-30"
              style={{ backgroundColor: theme.primaryHex }}
            />

            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
              {/* Avatar placeholder */}
              <div
                className="w-24 h-28 sm:w-28 sm:h-32 rounded-2xl border-2 flex items-center justify-center text-4xl font-black italic"
                style={{ borderColor: theme.primaryHex, backgroundColor: `${theme.primaryHex}15` }}
              >
                {profile?.nome_exibicao?.charAt(0)?.toUpperCase() || "?"}
              </div>

              <div className="flex-1 space-y-3 w-full">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#ff6200]">
                    Embaixador {levelInfo.tier}
                  </p>
                  <h2 className="text-2xl sm:text-3xl font-black italic uppercase leading-none mt-1">
                    {profile?.nome_exibicao || "Torcedor"}
                  </h2>
                  <p className="text-xs text-white/40 mt-1 uppercase tracking-wider">
                    {profile?.cidade}{profile?.estado ? ` · ${profile.estado}` : ""}
                  </p>
                </div>

                {/* [CRYSTAL GLOW BAR — cores dinâmicas do clube] */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                    <span className="text-white/60">{levelInfo.tier} → {levelInfo.next}</span>
                    <span style={{ color: theme.primaryHex }}>
                      {levelInfo.indicacoesCount} indicados
                      {levelInfo.faltam > 0 ? ` · faltam ${levelInfo.faltam}` : ""}
                    </span>
                  </div>
                  <div
                    className="relative h-3 rounded-full overflow-hidden border"
                    style={{
                      backgroundColor: `${theme.secondaryHex}10`,
                      borderColor: `${theme.primaryHex}40`,
                      boxShadow: `inset 0 0 8px ${theme.primaryHex}30, 0 0 12px ${theme.primaryHex}30`,
                    }}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${levelInfo.progress}%` }}
                      transition={{ duration: 1.1, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{
                        background: `linear-gradient(90deg, ${theme.primaryHex}, ${theme.secondaryHex || theme.primaryHex})`,
                        boxShadow: `0 0 14px ${theme.primaryHex}cc, 0 0 28px ${theme.primaryHex}80, inset 0 0 8px ${theme.secondaryHex || "#fff"}55`,
                      }}
                    />
                    {/* highlight crystal */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: "linear-gradient(180deg, rgba(255,255,255,0.25), rgba(255,255,255,0) 45%)",
                      }}
                    />
                  </div>
                </div>

                {/* Código + compartilhamento multicanal */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Código:</span>
                    <span className="text-lg font-black tracking-[0.2em]" style={{ color: theme.primaryHex }}>
                      {profile?.codigo_indicacao || "—"}
                    </span>
                    <button onClick={handleCopyCode} className="ml-1 text-white/40 hover:text-white transition-colors">
                      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        className="rounded-xl gap-2 text-xs font-bold uppercase tracking-wider text-black hover:opacity-90"
                        style={{
                          background: `linear-gradient(90deg, ${theme.primaryHex}, ${theme.secondaryHex || theme.primaryHex})`,
                          boxShadow: `0 0 18px ${theme.primaryHex}80`,
                        }}
                      >
                        <Share2 className="w-4 h-4" /> Convidar torcedor
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      className="bg-[#0d0d0d] border border-white/10 text-white w-60"
                    >
                      <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                        Compartilhar link
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-white/5" />
                      <DropdownMenuItem onClick={shareWhatsApp} className="gap-2 focus:bg-white/10 cursor-pointer">
                        <MessageCircle className="w-4 h-4 text-[#25D366]" /> WhatsApp
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={shareTelegram} className="gap-2 focus:bg-white/10 cursor-pointer">
                        <Send className="w-4 h-4 text-[#229ED9]" /> Telegram
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={shareEmail} className="gap-2 focus:bg-white/10 cursor-pointer">
                        <Mail className="w-4 h-4 text-[#ff6200]" /> E-mail
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={shareCopyLink} className="gap-2 focus:bg-white/10 cursor-pointer">
                        <Link2 className="w-4 h-4 text-white/70" /> Copiar link
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/5" />
                      <DropdownMenuItem onClick={shareNative} className="gap-2 focus:bg-white/10 cursor-pointer">
                        <Sparkles className="w-4 h-4" style={{ color: theme.primaryHex }} /> Mais opções…
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <p className="text-[10px] text-white/40 italic break-all">
                  {referralLink}
                </p>
              </div>
            </div>
          </div>


          {/* [MÓDULO: FEED DE ATIVIDADE] */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-[#ff6200]" />
              <h3 className="text-xs font-black uppercase tracking-[0.2em]">Feed de Atividade</h3>
            </div>

            {activityFeed.length === 0 ? (
              <p className="text-xs text-white/40 text-center py-6 italic">
                Nenhuma atividade nova na sua região.
              </p>
            ) : (
              <div
                className="space-y-2 max-h-[260px] overflow-y-auto pr-1 thin-orange-scroll"
              >
                {activityFeed.map((entry, i) => {
                  const cd = resolveClub(entry.clube_nome ?? null);
                  const dateRef = entry.voto_created_at || entry.created_at;
                  const localizacao = [entry.cidade, entry.estado].filter(Boolean).join(" · ");
                  const acao = entry.clube_nome
                    ? <>acaba de votar no <span className="text-[#ff6200]">{entry.clube_nome}</span></>
                    : <span className="text-white/50">entrou no Heart Club</span>;
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#ff6200]/20 flex items-center justify-center text-[10px] font-black text-[#ff6200] shrink-0">
                        {entry.nome.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">
                          <span className="text-white">{entry.nome}</span>{" "}
                          <span className="font-normal text-white/70">{acao}</span>
                        </p>
                        <p className="text-[10px] text-white/40 truncate">
                          {localizacao || "—"}
                          {dateRef ? ` · ${format(new Date(dateRef), "dd/MM/yyyy")}` : ""}
                        </p>
                      </div>
                      {entry.clube_nome && (
                        <ClubLogo src={cd?.logoUrl} alt={entry.clube_nome} size="xs" />
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.section>

        {/* [MÓDULO: RANKING DE DOMINÂNCIA] */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-xl"
        >
          <div className="flex items-center gap-3 mb-5">
            <Trophy className="w-5 h-5 text-[#ff6200]" />
            <h3 className="text-sm font-black uppercase tracking-[0.2em] italic">Ranking de Dominância</h3>
          </div>

          <Tabs value={rankingTab} onValueChange={setRankingTab}>
            <TabsList className="bg-white/5 border border-white/10 mb-5 flex-wrap h-auto gap-1">
              {[
                { value: "mundial", label: "Mundial", icon: Globe },
                { value: "continental", label: "Continental", icon: Map },
                { value: "nacional", label: "Nacional", icon: Landmark },
                { value: "estadual", label: "Estadual", icon: Building2 },
                { value: "municipal", label: "Municipal", icon: Building2 },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="data-[state=active]:bg-[#ff6200] data-[state=active]:text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider gap-1.5"
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {["mundial", "continental", "nacional", "estadual", "municipal"].map((tab) => (
              <TabsContent key={tab} value={tab}>
                {ranking.length === 0 ? (
                  <p className="text-sm text-white/30 text-center py-8">
                    Sem dados de ranking disponíveis ainda. Convide amigos com seu código!
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 border-b border-white/5">
                          <th className="py-3 px-2 w-12">#</th>
                          <th className="py-3 px-2">Nome</th>
                          <th className="py-3 px-2">Clube</th>
                          <th className="py-3 px-2 hidden sm:table-cell">Cidade</th>
                          <th className="py-3 px-2 text-right">Pontos</th>
                        </tr>
                      </thead>
                      <tbody>
                        <AnimatePresence>
                          {ranking.map((entry, i) => {
                            const rc = rivalClubData(entry.clube_nome);
                            return (
                              <motion.tr
                                key={entry.user_id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.03 }}
                                className="border-b border-white/5 hover:bg-white/[0.03] transition-colors"
                              >
                                <td className="py-3 px-2">
                                  <span className={`text-sm font-black ${i < 3 ? "text-[#ff6200]" : "text-white/40"}`}>
                                    {i + 1}
                                  </span>
                                </td>
                                <td className="py-3 px-2 text-sm font-semibold truncate max-w-[140px]">
                                  {entry.nome}
                                </td>
                                <td className="py-3 px-2">
                                  <div className="flex items-center gap-2">
                                    <ClubLogo src={rc?.logoUrl} alt={entry.clube_nome || ""} size="xs" />
                                    <span className="text-xs text-white/60 hidden md:inline">{entry.clube_nome}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-2 text-xs text-white/40 hidden sm:table-cell">{entry.cidade}</td>
                                <td className="py-3 px-2 text-right">
                                  <span className="text-sm font-black text-[#ff6200]">{entry.points}</span>
                                </td>
                              </motion.tr>
                            );
                          })}
                        </AnimatePresence>
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </motion.section>

        {/* [MÓDULO: RODAPÉ] */}
        <div className="text-center py-6">
          <p className="text-[10px] text-white/20 uppercase tracking-[0.2em]">
            Mural de postagens sujeito a auditoria. Disponível para níveis Prata ou superior.
          </p>
        </div>
      </main>

      {/* [MÓDULO: MODAL DE CAPTURA (CENSO)] */}
      <Dialog open={showCensusModal} onOpenChange={() => {}}>
        <DialogContent className="bg-[#0a0a0a] border-white/10 text-white sm:max-w-md [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-black italic uppercase text-center">
              Complete seu Censo
            </DialogTitle>
            <DialogDescription className="text-white/50 text-center text-sm">
              Precisamos de mais alguns dados para liberar o painel de Embaixador.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* WhatsApp */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-white/60">WhatsApp</Label>
              <div className="flex gap-2">
                <Select
                  value={phoneCountry.code}
                  onValueChange={(code) => {
                    const c = COUNTRY_DIALS.find((x) => x.code === code) ?? COUNTRY_DIALS[0];
                    setPhoneCountry(c);
                    setPhoneInput("");
                  }}
                >
                  <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-white">
                    <SelectValue>
                      <span className="flex items-center gap-1.5">
                        <span>{phoneCountry.flag}</span>
                        <span className="text-[#ff6200] font-bold">{phoneCountry.dial}</span>
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-white/10 text-white max-h-72">
                    {COUNTRY_DIALS.map((c) => (
                      <SelectItem key={c.code} value={c.code} className="text-white focus:bg-white/10 focus:text-white">
                        <span className="flex items-center gap-2">
                          <span>{c.flag}</span>
                          <span>{c.name}</span>
                          <span className="text-[#ff6200] font-bold ml-auto">{c.dial}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder={phoneCountry.code === "BR" ? "(99) 99999-9999" : "Número"}
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(formatPhoneByCountry(e.target.value, phoneCountry))}
                  className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/20"
                  inputMode="tel"
                />
              </div>
              {phoneInput && !isValidPhoneByCountry(phoneInput, phoneCountry) && (
                <p className="text-[10px] text-red-400">
                  Informe {phoneCountry.digits[0] === phoneCountry.digits[1] ? phoneCountry.digits[0] : `${phoneCountry.digits[0]}-${phoneCountry.digits[1]}`} dígitos para {phoneCountry.name}
                </p>
              )}
            </div>

            {/* Profissão — Autocomplete com entrada livre */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-white/60">Profissão</Label>
              <p className="text-[10px] text-white/40 italic">
                Digite sua profissão — sugerimos enquanto você escreve. Pode escolher da lista ou digitar livremente.
              </p>
              <Input
                value={professionInput}
                onChange={(e) => setProfessionInput(e.target.value)}
                placeholder="Ex.: Engenheiro, Professor, Médico..."
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
                list="professions-list"
                autoComplete="off"
              />
              <datalist id="professions-list">
                {professions.map((prof) => (
                  <option key={prof} value={prof} />
                ))}
              </datalist>
            </div>

            <Button
              onClick={handleCensusSubmit}
              disabled={isSubmitting}
              className="w-full bg-[#ff6200] hover:bg-[#e55800] font-black uppercase tracking-wider text-sm py-5"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Liberar Painel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Ambassadors;
