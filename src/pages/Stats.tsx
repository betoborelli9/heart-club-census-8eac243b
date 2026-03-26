/**
 * ARQUIVO: src/pages/Stats.tsx
 * MÓDULO: Painel de Estatísticas do Clube (fluido, legível e impactante)
 * ESTRUTURA: Imports | Config | Banner | Content
 */

/* =========================
 * Imports
 * ========================= */
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart3,
  Crown,
  Flame,
  Loader2,
  LogOut,
  ShieldAlert,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClubLogo } from "@/components/ClubLogo";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { CLUBS_DATA, type ClubData } from "@/clubes-data";
import { useClubTheme } from "@/hooks/useClubTheme";
import logo from "@/assets/logo.png";

/* =========================
 * Config
 * ========================= */
type CityStat = {
  city: string;
  votes: number;
  ratio: number;
};

type RivalStat = {
  club: string;
  votes: number;
};

type UFMGData = {
  titulo: number;
  libertadores: number;
  rebaixamento: number;
  source: "simulado" | "supabase";
};

const DEFAULT_UFMG: UFMGData = {
  titulo: 34,
  libertadores: 61,
  rebaixamento: 9,
  source: "simulado",
};

const RIVALS_MAP: Record<string, string[]> = {
  "Vila Nova": ["Goiás", "Atlético-GO", "Gremio"],
  Flamengo: ["Vasco", "Fluminense", "Botafogo"],
  Corinthians: ["Palmeiras", "Santos", "São Paulo"],
  Palmeiras: ["Corinthians", "São Paulo", "Santos"],
  "São Paulo": ["Corinthians", "Palmeiras", "Santos"],
  Vasco: ["Flamengo", "Fluminense", "Botafogo"],
  Fluminense: ["Flamengo", "Vasco", "Botafogo"],
  Botafogo: ["Flamengo", "Vasco", "Fluminense"],
  Grêmio: ["Internacional", "Juventude", "Corinthians"],
  Internacional: ["Grêmio", "Juventude", "Corinthians"],
  Cruzeiro: ["Atlético-MG", "América-MG", "Vila Nova"],
  "Atlético-MG": ["Cruzeiro", "América-MG", "Flamengo"],
};

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const clampPercent = (value: number) => Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));

const buildCityRanking = (rows: { cidade: string }[]): CityStat[] => {
  const tally = new Map<string, number>();

  rows.forEach(({ cidade }) => {
    const city = cidade?.trim() || "Não informado";
    tally.set(city, (tally.get(city) || 0) + 1);
  });

  const sorted = Array.from(tally.entries())
    .map(([city, votes]) => ({ city, votes }))
    .sort((a, b) => b.votes - a.votes)
    .slice(0, 7);

  const maxVotes = sorted[0]?.votes || 1;

  return sorted.map((entry) => ({
    ...entry,
    ratio: clampPercent((entry.votes / maxVotes) * 100),
  }));
};

const resolveClub = (clubName: string | null): ClubData | null => {
  if (!clubName) return null;
  return CLUBS_DATA.find((club) => normalize(club.nome) === normalize(clubName)) ?? null;
};

const getMainRivals = (clubName: string): string[] => {
  if (RIVALS_MAP[clubName]) return RIVALS_MAP[clubName];
  return ["Flamengo", "Corinthians", "Palmeiras"];
};

const buildSimulatedUFMG = (votes: number): UFMGData => {
  const titulo = clampPercent(18 + votes * 0.35);
  const libertadores = clampPercent(titulo + 22);
  const rebaixamento = clampPercent(40 - titulo * 0.7);

  return {
    titulo,
    libertadores,
    rebaixamento,
    source: "simulado",
  };
};

const UFMGStats = ({ data, loading }: { data: UFMGData; loading: boolean }) => {
  const rows = [
    { label: "Probabilidade de Título", value: data.titulo },
    { label: "Acesso / Libertadores", value: data.libertadores },
    { label: "Risco de Rebaixamento", value: data.rebaixamento },
  ];

  return (
    <section className="rounded-3xl border border-border bg-card/80 p-6 shadow-xl backdrop-blur-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3 className="text-sm font-black uppercase tracking-[0.22em] italic">Módulo UFMG</h3>
        <span className="rounded-full border border-border bg-background/70 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {data.source === "supabase" ? "Dados oficiais" : "Modo simulador"}
        </span>
      </div>

      <div className="space-y-4">
        {rows.map((item) => (
          <div key={item.label} className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide">
              <span className="text-muted-foreground">{item.label}</span>
              <span>{item.value.toFixed(1)}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${loading ? 0 : item.value}%` }}
                transition={{ duration: 0.55, ease: "easeOut" }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

const Stats = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, isLoading: isUserLoading, signOut } = useUser();

  const [clubName, setClubName] = useState<string | null>(null);
  const [clubData, setClubData] = useState<ClubData | null>(null);
  const [cityStats, setCityStats] = useState<CityStat[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [sympathizers, setSympathizers] = useState(0);
  const [rivalStats, setRivalStats] = useState<RivalStat[]>([]);
  const [selectedRival, setSelectedRival] = useState<string>("");
  const [ufmgData, setUfmgData] = useState<UFMGData>(DEFAULT_UFMG);
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  const theme = useClubTheme(clubName);
  const isLightText = theme.textClass === "text-black";
  const bannerTextColor = isLightText ? "hsl(0 0% 8%)" : "hsl(0 0% 100%)";

  const selectedRivalData = rivalStats.find((rival) => rival.club === selectedRival) ?? null;
  const maxComparisonVotes = Math.max(totalVotes, selectedRivalData?.votes ?? 0, 1);

  useEffect(() => {
    let mounted = true;

    const loadStats = async () => {
      setIsStatsLoading(true);

      try {
        if (!user) {
          if (mounted) {
            setClubName(null);
            setClubData(null);
            setCityStats([]);
            setTotalVotes(0);
            setSympathizers(0);
            setRivalStats([]);
            setUfmgData(DEFAULT_UFMG);
          }
          return;
        }

        const { data: mainVote, error: mainVoteError } = await supabase
          .from("votos")
          .select("clube_nome")
          .eq("user_id", user.id)
          .eq("is_original_vote", true)
          .maybeSingle();

        if (mainVoteError) throw mainVoteError;

        const resolvedClub = mainVote?.clube_nome ?? null;
        const resolvedClubData = resolveClub(resolvedClub);

        if (!mounted) return;

        setClubName(resolvedClub);
        setClubData(resolvedClubData);

        if (!resolvedClub) {
          setCityStats([]);
          setTotalVotes(0);
          setSympathizers(0);
          setRivalStats([]);
          setUfmgData(DEFAULT_UFMG);
          return;
        }

        const [citiesResponse, ownCountResponse, simpatizantesResponse] = await Promise.all([
          supabase.from("votos").select("cidade").eq("clube_nome", resolvedClub).eq("is_original_vote", true),
          supabase
            .from("votos")
            .select("*", { count: "exact", head: true })
            .eq("clube_nome", resolvedClub)
            .eq("is_original_vote", true),
          supabase
            .from("votos")
            .select("*", { count: "exact", head: true })
            .eq("clube_nome", resolvedClub)
            .eq("is_original_vote", false),
        ]);

        if (citiesResponse.error) throw citiesResponse.error;
        if (ownCountResponse.error) throw ownCountResponse.error;
        if (simpatizantesResponse.error) throw simpatizantesResponse.error;

        if (!mounted) return;

        const ownVotes = ownCountResponse.count || 0;
        const cityRanking = buildCityRanking(citiesResponse.data || []);

        setCityStats(cityRanking);
        setTotalVotes(ownVotes);
        setSympathizers(simpatizantesResponse.count || 0);

        const rivals = getMainRivals(resolvedClub).filter((name) => normalize(name) !== normalize(resolvedClub));

        const rivalsResponse = await Promise.all(
          rivals.map(async (rivalClub) => {
            const { count, error } = await supabase
              .from("votos")
              .select("*", { count: "exact", head: true })
              .eq("clube_nome", rivalClub)
              .eq("is_original_vote", true);

            return {
              club: rivalClub,
              votes: error ? 0 : count || 0,
            };
          })
        );

        if (!mounted) return;

        setRivalStats(rivalsResponse);
        setSelectedRival((current) => current || rivalsResponse[0]?.club || "");

        let nextUFMG = buildSimulatedUFMG(ownVotes);

        try {
          const ufmgResponse = await (supabase as unknown as {
            from: (table: string) => {
              select: (query: string) => {
                eq: (column: string, value: string) => {
                  maybeSingle: () => Promise<{ data: any; error: any }>;
                };
              };
            };
          })
            .from("clube_probabilidades")
            .select("prob_titulo, prob_libertadores, prob_acesso, prob_rebaixamento")
            .eq("clube_nome", resolvedClub)
            .maybeSingle();

          if (!ufmgResponse.error && ufmgResponse.data) {
            nextUFMG = {
              titulo: clampPercent(Number(ufmgResponse.data.prob_titulo ?? 0)),
              libertadores: clampPercent(
                Number(ufmgResponse.data.prob_libertadores ?? ufmgResponse.data.prob_acesso ?? 0)
              ),
              rebaixamento: clampPercent(Number(ufmgResponse.data.prob_rebaixamento ?? 0)),
              source: "supabase",
            };
          }
        } catch {
          nextUFMG = buildSimulatedUFMG(ownVotes);
        }

        if (mounted) {
          setUfmgData(nextUFMG);
        }
      } catch (error) {
        console.error("[Stats] erro ao carregar dados:", error);
        if (mounted) {
          setCityStats([]);
          setTotalVotes(0);
          setSympathizers(0);
          setRivalStats([]);
          setUfmgData(DEFAULT_UFMG);
        }
      } finally {
        if (mounted) setIsStatsLoading(false);
      }
    };

    loadStats();

    return () => {
      mounted = false;
    };
  }, [user]);

  const isStatsActive = location.pathname === "/stats" || location.pathname === "/estatisticas";

  if (isUserLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Loader2 className="h-9 w-9 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card/80 p-8 text-center shadow-xl">
          <h1 className="text-2xl font-black italic uppercase">Estatísticas</h1>
          <p className="mt-3 text-sm text-muted-foreground">Faça login para desbloquear o painel completo do seu clube.</p>
          <Button className="mt-6 w-full" onClick={() => navigate("/login")}>Entrar agora</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* =========================
       * Header
       * ========================= */}
      <header className="sticky top-0 z-50 h-16 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-4 px-4">
          <button className="flex items-center gap-2" onClick={() => navigate("/dashboard")}>
            <img src={logo} alt="Heart Club" className="h-8 w-auto md:h-10" />
            <span className="text-lg font-black italic tracking-tighter">HEART CLUB</span>
          </button>
          <Button variant="ghost" size="icon" onClick={() => signOut()} className="text-muted-foreground hover:text-foreground">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-3 py-4 md:px-4">
        {/* =========================
         * Banner + NavBar — Bloco visual único
         * ========================= */}
        <div>
        <section
          className="relative overflow-hidden rounded-t-[2.25rem] rounded-b-none border border-border/50 border-b-0 p-4 sm:p-6 md:p-8 shadow-2xl"
          style={{ backgroundColor: theme.primaryHex }}
        >
          <div className="absolute inset-y-0 right-[10%] w-[4px] rotate-[22deg]" style={{ backgroundColor: "hsl(0 0% 100% / 0.72)" }} />
          <div className="absolute inset-y-[-20%] right-[4%] w-[14px] rotate-[22deg]" style={{ backgroundColor: "hsl(0 0% 100% / 0.5)" }} />

          <div className="relative z-10 flex items-center justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Emblema — Mobile 102px, Tablet 134px, Desktop 166px */}
              <div
                className="flex h-[102px] w-[102px] shrink-0 items-center justify-center rounded-full sm:h-[134px] sm:w-[134px] md:h-[166px] md:w-[166px]"
                style={{ backgroundColor: "hsl(0 0% 100%)" }}
              >
                <ClubLogo
                  src={clubData?.logoUrl}
                  alt={clubName || "Clube do usuário"}
                  className="h-[94%] w-[94%] rounded-full"
                />
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.26em] sm:text-xs" style={{ color: bannerTextColor }}>
                  ESTATÍSTICAS
                </p>
                <h1
                  className="max-w-[44vw] text-2xl font-black italic uppercase leading-none sm:text-3xl md:max-w-none md:text-5xl"
                  style={{ color: bannerTextColor }}
                >
                  {clubName || "Clube não identificado"}
                </h1>
              </div>
            </div>
          </div>
        </section>

        <nav className="flex items-center justify-center gap-2 rounded-t-none rounded-b-2xl border border-border border-t-0 bg-card/70 px-2 py-2 shadow-lg backdrop-blur-md">
          {[
            { label: "MAPAS", icon: Flame, path: "/mapa-calor", active: location.pathname === "/mapa-calor" },
            { label: "ESTATÍSTICAS", icon: BarChart3, path: "/estatisticas", active: isStatsActive },
            { label: "RANKING", icon: Crown, path: "/estatisticas#ranking", active: location.hash === "#ranking" },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-black uppercase tracking-wider transition-all sm:px-5 ${
                item.active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>
        </div>

        {/* =========================
         * Content
         * ========================= */}
        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="rounded-3xl border border-border bg-card/80 p-6 shadow-xl backdrop-blur-sm"
          >
            <div className="mb-5 flex items-center gap-3">
              <Target className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-black uppercase tracking-[0.2em] italic">Cidades com mais Corações</h2>
            </div>

            {isStatsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="space-y-2 animate-pulse">
                    <div className="h-3 w-40 rounded bg-muted" />
                    <div className="h-2.5 w-full rounded bg-muted" />
                  </div>
                ))}
              </div>
            ) : cityStats.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ainda não há dados suficientes para o ranking por cidades.</p>
            ) : (
              <div className="space-y-4">
                {cityStats.map((city, index) => (
                  <div key={city.city} className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wide">
                      <span className="text-foreground">#{index + 1} · {city.city}</span>
                      <span className="text-muted-foreground">{city.votes} corações</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                      <motion.div
                        className="h-full rounded-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${city.ratio}%` }}
                        transition={{ duration: 0.55, ease: "easeOut", delay: index * 0.05 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.section>

          <div className="space-y-4">
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut", delay: 0.05 }}
              className="rounded-3xl border border-border bg-card/80 p-6 shadow-xl"
            >
              <div className="mb-4 flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-black uppercase tracking-[0.2em] italic">Simpatizantes</h3>
              </div>
              <p className="text-4xl font-black italic leading-none">{sympathizers}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                torcedores que escolheram como 2º clube
              </p>
            </motion.section>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut", delay: 0.1 }}
            >
              <UFMGStats data={ufmgData} loading={isStatsLoading} />
            </motion.div>
          </div>
        </div>

        <motion.section
          id="ranking"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut", delay: 0.15 }}
          className="rounded-3xl border border-border bg-card/80 p-6 shadow-xl"
        >
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Trophy className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-black uppercase tracking-[0.2em] italic">Radar de Rivais</h3>
            </div>
            <span className="rounded-full border border-border bg-background/60 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Heart Club Census
            </span>
          </div>

          {rivalStats.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem rivais mapeados no momento para este clube.</p>
          ) : (
            <>
              <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
                {rivalStats.map((rival) => (
                  <button
                    key={rival.club}
                    onClick={() => setSelectedRival(rival.club)}
                    className={`shrink-0 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-wider transition-all ${
                      selectedRival === rival.club
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background/70 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {rival.club}
                  </button>
                ))}
              </div>

              {selectedRivalData ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-background/70 p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">Seu Clube</p>
                    <p className="mt-2 text-3xl font-black italic">{totalVotes}</p>
                    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
                      <motion.div
                        className="h-full rounded-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${(totalVotes / maxComparisonVotes) * 100}%` }}
                        transition={{ duration: 0.45, ease: "easeOut" }}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-background/70 p-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground">{selectedRivalData.club}</p>
                    <p className="mt-2 text-3xl font-black italic">{selectedRivalData.votes}</p>
                    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
                      <motion.div
                        className="h-full rounded-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${(selectedRivalData.votes / maxComparisonVotes) * 100}%` }}
                        transition={{ duration: 0.45, ease: "easeOut", delay: 0.05 }}
                      />
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border bg-background/60 p-3 text-sm">
                <ShieldAlert className="h-4 w-4 text-primary" />
                <p className="text-muted-foreground">
                  {selectedRivalData && totalVotes >= selectedRivalData.votes
                    ? `Seu clube está à frente de ${selectedRivalData.club} no engajamento atual.`
                    : selectedRivalData
                    ? `${selectedRivalData.club} está à frente no momento — oportunidade de virar o jogo no censo.`
                    : "Selecione um rival para comparar o engajamento."}
                </p>
              </div>
            </>
          )}
        </motion.section>
      </main>
    </div>
  );
};

export default Stats;
