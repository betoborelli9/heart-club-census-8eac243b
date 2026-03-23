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
} from "lucide-react";
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

/* [MÓDULO: MÁSCARA WHATSAPP] */
const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const isValidPhone = (value: string): boolean => {
  return value.replace(/\D/g, "").length === 11;
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

  /* [MÓDULO: SEGURANÇA E CENSO] */
  useEffect(() => {
    if (!profile || isLoading) return;
    const needsCensus = !profile.profissao || !profile.telefone || !profile.data_nascimento;
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
    if (!user || !profile?.codigo_indicacao) return;
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
      if (!profile?.codigo_indicacao) return;
      const { data } = await supabase
        .from("indicacoes")
        .select("id, indicado_id, created_at")
        .eq("codigo_usado", profile.codigo_indicacao)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!data || data.length === 0) {
        setActivityFeed([]);
        return;
      }

      const indicadoIds = data.map((d) => d.indicado_id).filter(Boolean) as string[];
      const { data: indicadoProfiles } = await supabase
        .from("profiles")
        .select("id, nome_exibicao")
        .in("id", indicadoIds);

      const feed: ActivityEntry[] = data.map((d) => ({
        id: d.id,
        nome: indicadoProfiles?.find((p) => p.id === d.indicado_id)?.nome_exibicao ?? "Novo membro",
        created_at: d.created_at || "",
      }));

      setActivityFeed(feed);
    };

    loadRanking();
    loadActivityFeed();
  }, [user, profile?.codigo_indicacao]);

  /* [MÓDULO: AÇÃO DO CENSO] */
  const handleCensusSubmit = async () => {
    if (!isValidPhone(phoneInput)) {
      toast({ title: "WhatsApp inválido", description: "Informe um número com 11 dígitos.", variant: "destructive" });
      return;
    }
    if (!professionInput) {
      toast({ title: "Profissão obrigatória", description: "Selecione sua profissão.", variant: "destructive" });
      return;
    }
    if (!birthDate) {
      toast({ title: "Data obrigatória", description: "Informe sua data de nascimento.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      await updateProfile({
        telefone: phoneInput.replace(/\D/g, ""),
        profissao: professionInput,
        data_nascimento: format(birthDate, "yyyy-MM-dd"),
      });
      await refreshProfile();
      setShowCensusModal(false);
      toast({ title: "Perfil atualizado!", description: "Seus dados foram salvos com sucesso." });
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

  /* [MÓDULO: COMPARTILHAR WHATSAPP] */
  const handleShareWhatsApp = () => {
    const code = profile?.codigo_indicacao || "";
    const msg = encodeURIComponent(
      `🧡 Fala, torcedor! Eu já fiz parte do Heart Club Census — o maior censo de torcedores do mundo. Use meu código *${code}* e registre seu clube do coração! https://heart-club-census.lovable.app`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const theme = useClubTheme(clubName);

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
        {/* [MÓDULO: BANNER REUTILIZÁVEL] */}
        <ClubBanner
          clubName={clubName}
          clubData={clubData}
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

              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#ff6200]">
                    Embaixador {profile?.nivel_embaixador || "Bronze"}
                  </p>
                  <h2 className="text-2xl sm:text-3xl font-black italic uppercase leading-none mt-1">
                    {profile?.nome_exibicao || "Torcedor"}
                  </h2>
                  <p className="text-xs text-white/40 mt-1 uppercase tracking-wider">
                    {profile?.cidade}{profile?.estado ? ` · ${profile.estado}` : ""}
                  </p>
                </div>

                {/* Código de indicação */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Código:</span>
                    <span className="text-lg font-black tracking-[0.2em] text-[#ff6200]">
                      {profile?.codigo_indicacao || "—"}
                    </span>
                    <button onClick={handleCopyCode} className="ml-1 text-white/40 hover:text-white transition-colors">
                      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  <Button
                    onClick={handleShareWhatsApp}
                    className="bg-[#25D366] hover:bg-[#1da851] text-white rounded-xl gap-2 text-xs font-bold uppercase tracking-wider"
                  >
                    <Share2 className="w-4 h-4" />
                    WhatsApp
                  </Button>
                </div>
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
              <p className="text-xs text-white/30 text-center py-6">
                Nenhum indicado ainda. Compartilhe seu código!
              </p>
            ) : (
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {activityFeed.map((entry, i) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#ff6200]/20 flex items-center justify-center text-[10px] font-black text-[#ff6200]">
                      {entry.nome?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">{entry.nome}</p>
                      <p className="text-[10px] text-white/30">
                        {entry.created_at ? format(new Date(entry.created_at), "dd/MM/yyyy") : ""}
                      </p>
                    </div>
                  </motion.div>
                ))}
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
              <Input
                placeholder="(99) 99999-9999"
                value={phoneInput}
                onChange={(e) => setPhoneInput(formatPhone(e.target.value))}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
              />
              {phoneInput && !isValidPhone(phoneInput) && (
                <p className="text-[10px] text-red-400">Informe 11 dígitos</p>
              )}
            </div>

            {/* Profissão */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-white/60">Profissão</Label>
              <Select value={professionInput} onValueChange={setProfessionInput}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Selecione sua profissão" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-white/10 text-white max-h-60">
                  {professions.map((prof) => (
                    <SelectItem key={prof} value={prof} className="text-white focus:bg-white/10 focus:text-white">
                      {prof}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data de Nascimento */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-white/60">Data de Nascimento</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white",
                      !birthDate && "text-white/20"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {birthDate ? format(birthDate, "dd/MM/yyyy") : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-[#1a1a1a] border-white/10" align="start">
                  <Calendar
                    mode="single"
                    selected={birthDate}
                    onSelect={setBirthDate}
                    disabled={(date) => date > new Date() || date < new Date("1920-01-01")}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                    captionLayout="dropdown-buttons"
                    fromYear={1920}
                    toYear={new Date().getFullYear()}
                  />
                </PopoverContent>
              </Popover>
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
