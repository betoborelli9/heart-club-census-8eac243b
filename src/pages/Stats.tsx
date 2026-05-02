/**
 * ARQUIVO: src/pages/Stats.tsx
 * MÓDULO: War Room de Estatísticas — Inteligência Geográfica Universal
 * V25 - 2026-05-02 BRT
 *
 * ESTRUTURA:
 *  - Splash do Parceiro Master (2s, só aparece se houver parceiro configurado)
 *  - Slot fixo no TOPO para logo do Parceiro Master (oculto se vazio)
 *  - Banner do clube + NavBar
 *  - Inteligência Geográfica Universal (Mundo → País → Estado → Cidade → Bairro)
 *  - Recordista Regional + Destaque Global
 *  - Radar de Rivalidade automático (top-2 da região atual)
 *  - Busca livre por qualquer clube na região atual
 *  - UFMG: OCULTO até integração real existir
 */

import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  ChevronRight,
  Crown,
  Flame,
  Globe2,
  Loader2,
  LogOut,
  Search,
  ShieldAlert,
  Trophy,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClubLogo } from "@/components/ClubLogo";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { CLUBS_DATA, type ClubData } from "@/clubes-data";
import { useClubTheme } from "@/hooks/useClubTheme";
import { searchClubsWithFallback, type ClubSearchResult } from "@/lib/search-clubs";
import logo from "@/assets/logo.png";

/* =========================
 * Parceiro Master (Monetização)
 * Quando houver parceiro, popular { logoUrl, name }. Slot fica oculto se null.
 * ========================= */
const PARTNER_MASTER: { logoUrl: string; name: string } | null = null;

/* =========================
 * Helpers
 * ========================= */
type ViewLevel = "world" | "country" | "state" | "city";

type RegionRow = { region: string; votes: number };
type ClubRankRow = { club: string; votes: number };

const normalize = (v: string) =>
  (v || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const resolveClubData = (name: string | null): ClubData | null => {
  if (!name) return null;
  const n = normalize(name);
  return CLUBS_DATA.find((c) => normalize(c.nome) === n) ?? null;
};

const LEVEL_LABELS: Record<ViewLevel, { ranking: string; recordista: string; rivais: string }> = {
  world: { ranking: "Países", recordista: "Recordista Mundial", rivais: "Maior Rival Global" },
  country: { ranking: "Estados", recordista: "Recordista Nacional", rivais: "Maior Rival Nacional" },
  state: { ranking: "Cidades", recordista: "Recordista Estadual", rivais: "Maior Rival Estadual" },
  city: { ranking: "Bairros", recordista: "Recordista da Cidade", rivais: "Maior Rival Local" },
};

/* =========================
 * Splash Parceiro Master
 * ========================= */
const PartnerSplash = ({ onDone }: { onDone: () => void }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 2000);
    return () => clearTimeout(t);
  }, [onDone]);

  if (!PARTNER_MASTER) {
    onDone();
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black"
    >
      <div className="flex flex-col items-center gap-3">
        <img src={PARTNER_MASTER.logoUrl} alt={PARTNER_MASTER.name} className="h-24 w-auto" />
        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">
          Parceiro Master
        </span>
      </div>
    </motion.div>
  );
};

/* =========================
 * Componente: Slot Parceiro (topo fixo)
 * ========================= */
const PartnerSlot = () => {
  if (!PARTNER_MASTER) return null;
  return (
    <div className="flex items-center justify-center border-b border-white/5 bg-black py-2">
      <img src={PARTNER_MASTER.logoUrl} alt={PARTNER_MASTER.name} className="h-7 w-auto opacity-90" />
    </div>
  );
};

/* =========================
 * Stats principal
 * ========================= */
const Stats = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading: isUserLoading, signOut } = useUser();

  // Splash
  const [showSplash, setShowSplash] = useState<boolean>(!!PARTNER_MASTER);

  // Identidade do clube do usuário
  const [clubName, setClubName] = useState<string | null>(null);
  const clubData = useMemo(() => resolveClubData(clubName), [clubName]);
  const theme = useClubTheme(clubName);
  const isLightText = theme.textClass === "text-black";
  const bannerTextColor = isLightText ? "hsl(0 0% 8%)" : "hsl(0 0% 100%)";

  // Geo navegação universal
  const [viewLevel, setViewLevel] = useState<ViewLevel>("world");
  const [activeCountry, setActiveCountry] = useState<string | null>(null);
  const [activeState, setActiveState] = useState<string | null>(null);
  const [activeCity, setActiveCity] = useState<string | null>(null);

  // Dados
  const [regionRows, setRegionRows] = useState<RegionRow[]>([]);
  const [topClubsInRegion, setTopClubsInRegion] = useState<ClubRankRow[]>([]);
  const [globalTotal, setGlobalTotal] = useState<number>(0);
  const [globalSympathy, setGlobalSympathy] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Busca livre — REAL (Supabase clubes_cache + edge function API-Football)
  const [search, setSearch] = useState<string>("");
  const [searchResults, setSearchResults] = useState<ClubSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [comparedClub, setComparedClub] = useState<ClubSearchResult | null>(null);
  const [comparedVotes, setComparedVotes] = useState<number>(0);
  const [comparedTotalGlobal, setComparedTotalGlobal] = useState<number>(0);

  /* ──────────────── Carrega clube do usuário ──────────────── */
  useEffect(() => {
    if (!user) return;
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("votos")
        .select("clube_nome")
        .eq("user_id", user.id)
        .eq("is_original_vote", true)
        .maybeSingle();
      if (mounted) setClubName(data?.clube_nome ?? null);
    })();
    return () => {
      mounted = false;
    };
  }, [user]);

  /* ──────────────── Carrega dados geo (universal) ──────────────── */
  useEffect(() => {
    if (!clubName) return;
    let mounted = true;
    setIsLoading(true);

    (async () => {
      try {
        // Nível p/ RPC heatmap
        const rpcLevel: "country" | "state" | "city" =
          viewLevel === "world" ? "country" : viewLevel === "country" ? "state" : viewLevel === "state" ? "city" : "city";

        const filterValue =
          viewLevel === "world" ? null : viewLevel === "country" ? activeCountry : viewLevel === "state" ? activeState : activeCity;

        // 1) Ranking da região (Países/Estados/Cidades) OU bairros
        let regionRanking: RegionRow[] = [];
        if (viewLevel === "city" && activeCity) {
          const { data } = await supabase.rpc("get_heatmap_neighborhoods", {
            p_club_name: clubName,
            p_city: activeCity,
          });
          regionRanking = ((data as any[]) || []).map((r) => ({
            region: r.neighborhood,
            votes: Number(r.votes) || 0,
          }));
        } else {
          const { data } = await supabase.rpc("get_heatmap_data", {
            p_club_name: clubName,
            p_level: rpcLevel,
            p_filter_value: filterValue,
          });
          regionRanking = ((data as any[]) || []).map((r) => ({
            region: r.region,
            votes: Number(r.votes) || 0,
          }));
        }

        // 2) Top clubes na região (Recordista + Rivais) — não aplica em "city" (bairros)
        let topClubs: ClubRankRow[] = [];
        if (viewLevel !== "city") {
          // Para nível "world", buscamos top clubes globais (sem filtro)
          if (viewLevel === "world") {
            const { data } = await supabase.rpc("get_club_vote_ranking", { p_limit: 10 });
            topClubs = ((data as any[]) || []).map((r) => ({ club: r.club, votes: Number(r.votes) || 0 }));
          } else {
            const { data } = await supabase.rpc("get_top_clubs_by_region", {
              p_level: rpcLevel === "country" ? "country" : rpcLevel === "state" ? "state" : "city",
              p_value: filterValue ?? "",
              p_limit: 10,
            });
            // Quando viewLevel=country, queremos top clubes do país atual (não estados)
            // Ajuste: usamos o nível corrente como p_level
            const correctLevel: "country" | "state" | "city" =
              viewLevel === "country" ? "country" : viewLevel === "state" ? "state" : "city";
            const { data: d2 } = await supabase.rpc("get_top_clubs_by_region", {
              p_level: correctLevel,
              p_value: filterValue ?? "",
              p_limit: 10,
            });
            topClubs = ((d2 as any[]) || []).map((r) => ({ club: r.club, votes: Number(r.votes) || 0 }));
          }
        } else if (activeCity) {
          const { data } = await supabase.rpc("get_top_clubs_by_region", {
            p_level: "city",
            p_value: activeCity,
            p_limit: 10,
          });
          topClubs = ((data as any[]) || []).map((r) => ({ club: r.club, votes: Number(r.votes) || 0 }));
        }

        // 3) Destaque Global (Total Corações + Simpatias)
        const { data: summary } = await supabase.rpc("get_club_vote_summary", { p_club_name: clubName });
        const s = (summary as any) || {};

        if (!mounted) return;
        setRegionRows(regionRanking);
        setTopClubsInRegion(topClubs);
        setGlobalTotal(Number(s.total_votes) || 0);
        setGlobalSympathy(Number(s.sympathizers) || 0);
      } catch (err) {
        console.error("[Stats] erro:", err);
        if (mounted) {
          setRegionRows([]);
          setTopClubsInRegion([]);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [clubName, viewLevel, activeCountry, activeState, activeCity]);

  /* ──────────────── Drill-down ──────────────── */
  const drillInto = (region: string) => {
    if (viewLevel === "world") {
      setActiveCountry(region);
      setViewLevel("country");
    } else if (viewLevel === "country") {
      setActiveState(region);
      setViewLevel("state");
    } else if (viewLevel === "state") {
      setActiveCity(region);
      setViewLevel("city");
    }
  };

  const goToLevel = (level: ViewLevel) => {
    if (level === "world") {
      setActiveCountry(null);
      setActiveState(null);
      setActiveCity(null);
    } else if (level === "country") {
      setActiveState(null);
      setActiveCity(null);
    } else if (level === "state") {
      setActiveCity(null);
    }
    setViewLevel(level);
  };

  /* ──────────────── Recordista + Rival ──────────────── */
  const recordista = topClubsInRegion[0] ?? null;
  const myRank = topClubsInRegion.find((c) => normalize(c.club) === normalize(clubName || ""));
  const myVotesInRegion = myRank?.votes ?? 0;
  const mainRival =
    topClubsInRegion.find((c) => normalize(c.club) !== normalize(clubName || "")) ?? null;

  const enagementGap = useMemo(() => {
    if (!mainRival || !myRank) return null;
    if (myRank.votes === 0 && mainRival.votes === 0) return null;
    const diff = myRank.votes - mainRival.votes;
    const base = Math.max(myRank.votes, mainRival.votes, 1);
    const pct = Math.abs((diff / base) * 100);
    return { diff, pct, ahead: diff >= 0 };
  }, [mainRival, myRank]);

  /* ──────────────── Filtra busca ──────────────── */
  const filteredClubs = useMemo(() => {
    if (!search.trim()) return topClubsInRegion;
    const q = normalize(search);
    return topClubsInRegion.filter((c) => normalize(c.club).includes(q));
  }, [topClubsInRegion, search]);

  /* ──────────────── Header label dinâmico ──────────────── */
  const contextLabel = useMemo(() => {
    if (viewLevel === "world") return "Mundo";
    if (viewLevel === "country") return activeCountry ?? "—";
    if (viewLevel === "state") return `${activeState ?? "—"} · ${activeCountry ?? ""}`;
    return `${activeCity ?? "—"} · ${activeState ?? ""}`;
  }, [viewLevel, activeCountry, activeState, activeCity]);

  const labels = LEVEL_LABELS[viewLevel];
  const maxRegionVotes = regionRows[0]?.votes || 1;

  /* ──────────────── Loading / Auth gates ──────────────── */
  if (isUserLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-9 w-9 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card/80 p-8 text-center shadow-xl">
          <h1 className="text-2xl font-black italic uppercase">Estatísticas</h1>
          <p className="mt-3 text-sm text-muted-foreground">Faça login para acessar o painel.</p>
          <Button className="mt-6 w-full" onClick={() => navigate("/login")}>Entrar</Button>
        </div>
      </div>
    );
  }

  const isStatsActive = location.pathname === "/stats" || location.pathname === "/estatisticas";

  return (
    <>
      <AnimatePresence>{showSplash && <PartnerSplash onDone={() => setShowSplash(false)} />}</AnimatePresence>

      <div className="min-h-screen bg-black text-white">
        {/* Slot fixo Parceiro Master (oculto até existir) */}
        <PartnerSlot />

        {/* Header */}
        <header className="sticky top-0 z-40 h-14 border-b border-white/10 bg-black/95 backdrop-blur-xl">
          <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-4 px-3">
            <button className="flex items-center gap-2" onClick={() => navigate("/dashboard")}>
              <img src={logo} alt="Heart Club" className="h-7 w-auto" />
              <span className="text-sm font-black italic tracking-tighter">HEART CLUB</span>
            </button>
            <Button variant="ghost" size="icon" onClick={() => signOut()} className="text-white/60 hover:text-white">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <main className="mx-auto max-w-6xl space-y-4 px-3 py-4">
          {/* Banner clube */}
          <section
            className="relative overflow-hidden rounded-t-[2rem] border border-white/10 border-b-0 p-4 sm:p-6"
            style={{ backgroundColor: theme.primaryHex }}
          >
            <div className="absolute inset-y-0 right-[10%] w-[3px] rotate-[22deg] bg-white/60" />
            <div className="absolute inset-y-[-20%] right-[4%] w-[10px] rotate-[22deg] bg-white/40" />

            <div className="relative z-10 flex items-center gap-3 sm:gap-4">
              <div
                className="flex h-[88px] w-[88px] sm:h-[120px] sm:w-[120px] shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: "#fff" }}
              >
                <ClubLogo src={clubData?.logoUrl} alt={clubName || "Clube"} className="h-[94%] w-[94%] rounded-full" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.26em]" style={{ color: bannerTextColor }}>
                  WAR ROOM
                </p>
                <h1
                  className="text-2xl sm:text-4xl font-black italic uppercase leading-none"
                  style={{ color: bannerTextColor }}
                >
                  {clubName || "Clube não identificado"}
                </h1>
              </div>
            </div>
          </section>

          {/* NavBar secundária */}
          <nav className="flex items-center justify-center gap-2 -mt-2 rounded-b-2xl border border-white/10 border-t-0 bg-zinc-950/80 px-2 py-2 backdrop-blur-md">
            {[
              { label: "MAPAS", icon: Flame, path: "/mapa-calor", active: location.pathname === "/mapa-calor" },
              { label: "ESTATÍSTICAS", icon: BarChart3, path: "/estatisticas", active: isStatsActive },
              { label: "RANKING", icon: Crown, path: "/estatisticas#ranking", active: location.hash === "#ranking" },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-black uppercase tracking-wider transition-all ${
                  item.active ? "bg-primary text-primary-foreground" : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </nav>

          {/* Destaque Global do clube */}
          <section className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-zinc-950 p-4">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
                <Trophy className="h-3.5 w-3.5 text-primary" /> Corações Globais
              </div>
              <p className="mt-2 text-3xl sm:text-4xl font-black italic">{globalTotal.toLocaleString("pt-BR")}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-zinc-950 p-4">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
                <Users className="h-3.5 w-3.5 text-primary" /> Simpatias
              </div>
              <p className="mt-2 text-3xl sm:text-4xl font-black italic">{globalSympathy.toLocaleString("pt-BR")}</p>
            </div>
          </section>

          {/* Breadcrumb geográfico */}
          <section className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              onClick={() => goToLevel("world")}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 font-black uppercase tracking-wider transition-all ${
                viewLevel === "world" ? "bg-primary text-primary-foreground" : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              <Globe2 className="h-3 w-3" /> Mundo
            </button>
            {activeCountry && (
              <>
                <ChevronRight className="h-3 w-3 text-white/30" />
                <button
                  onClick={() => goToLevel("country")}
                  className={`rounded-full px-3 py-1.5 font-black uppercase tracking-wider ${
                    viewLevel === "country" ? "bg-primary text-primary-foreground" : "bg-white/5 text-white/60 hover:bg-white/10"
                  }`}
                >
                  {activeCountry}
                </button>
              </>
            )}
            {activeState && (
              <>
                <ChevronRight className="h-3 w-3 text-white/30" />
                <button
                  onClick={() => goToLevel("state")}
                  className={`rounded-full px-3 py-1.5 font-black uppercase tracking-wider ${
                    viewLevel === "state" ? "bg-primary text-primary-foreground" : "bg-white/5 text-white/60 hover:bg-white/10"
                  }`}
                >
                  {activeState}
                </button>
              </>
            )}
            {activeCity && (
              <>
                <ChevronRight className="h-3 w-3 text-white/30" />
                <span className="rounded-full bg-primary px-3 py-1.5 font-black uppercase tracking-wider text-primary-foreground">
                  {activeCity}
                </span>
              </>
            )}
          </section>

          {/* Recordista Regional */}
          {recordista && (
            <section className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-4">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                <Crown className="h-3.5 w-3.5" /> {labels.recordista}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 rounded-full bg-white p-1">
                  <ClubLogo
                    src={resolveClubData(recordista.club)?.logoUrl}
                    alt={recordista.club}
                    className="h-full w-full"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-base font-black italic uppercase leading-tight">{recordista.club}</p>
                  <p className="text-xs text-white/60">
                    {recordista.votes.toLocaleString("pt-BR")} corações em {contextLabel}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Radar de Rivalidade auto */}
          {mainRival && enagementGap && (
            <section id="ranking" className="rounded-2xl border border-white/10 bg-zinc-950 p-4">
              <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/50">
                <ShieldAlert className="h-3.5 w-3.5 text-primary" /> {labels.rivais}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-full bg-white p-0.5">
                      <ClubLogo src={clubData?.logoUrl} alt={clubName || ""} className="h-full w-full" />
                    </div>
                    <p className="text-[11px] font-black uppercase">{clubName}</p>
                  </div>
                  <p className="mt-2 text-2xl font-black italic">{myVotesInRegion.toLocaleString("pt-BR")}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-full bg-white p-0.5">
                      <ClubLogo
                        src={resolveClubData(mainRival.club)?.logoUrl}
                        alt={mainRival.club}
                        className="h-full w-full"
                      />
                    </div>
                    <p className="text-[11px] font-black uppercase">{mainRival.club}</p>
                  </div>
                  <p className="mt-2 text-2xl font-black italic">{mainRival.votes.toLocaleString("pt-BR")}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-white/70">
                <span className="font-black text-primary">{clubName}</span>{" "}
                {enagementGap.ahead ? "está" : "está"}{" "}
                <span className="font-black text-primary">{enagementGap.pct.toFixed(1)}%</span>{" "}
                {enagementGap.ahead ? "à frente" : "atrás"} de{" "}
                <span className="font-black">{mainRival.club}</span> em engajamento em {contextLabel}.
              </p>
            </section>
          )}

          {/* Ranking dinâmico (Países/Estados/Cidades/Bairros) */}
          <section className="rounded-2xl border border-white/10 bg-zinc-950 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] italic">
                <Trophy className="h-4 w-4 text-primary" /> {labels.ranking} de {contextLabel}
              </h2>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-10 animate-pulse rounded-lg bg-white/5" />
                ))}
              </div>
            ) : regionRows.length === 0 ? (
              <p className="text-sm text-white/50">Sem dados nesta região para {clubName}.</p>
            ) : (
              <div className="space-y-2">
                {regionRows.slice(0, 12).map((row, i) => {
                  const ratio = (row.votes / maxRegionVotes) * 100;
                  const canDrill = viewLevel !== "city";
                  return (
                    <button
                      key={`${row.region}-${i}`}
                      onClick={() => canDrill && drillInto(row.region)}
                      disabled={!canDrill}
                      className={`group relative w-full overflow-hidden rounded-lg border border-white/5 bg-black/40 px-3 py-2.5 text-left transition-all ${
                        canDrill ? "hover:border-primary/40 hover:bg-black/70" : "cursor-default"
                      }`}
                    >
                      <div
                        className="absolute inset-y-0 left-0 bg-primary/15"
                        style={{ width: `${ratio}%` }}
                      />
                      <div className="relative flex items-center justify-between gap-2 text-xs">
                        <span className="font-black uppercase tracking-wide">
                          #{i + 1} · {row.region}
                        </span>
                        <span className="font-bold text-white/70">
                          {row.votes.toLocaleString("pt-BR")}
                          {canDrill && <ChevronRight className="ml-1 inline h-3 w-3 text-primary" />}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Busca livre por outro clube na região */}
          {viewLevel !== "city" && (
            <section className="rounded-2xl border border-white/10 bg-zinc-950 p-4">
              <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/50">
                <Search className="h-3.5 w-3.5 text-primary" /> Consultar outro clube em {contextLabel}
              </div>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Digite o nome do clube..."
                className="border-white/10 bg-black/60 text-white placeholder:text-white/30"
              />
              {search.trim() && (
                <div className="mt-3 space-y-1.5">
                  {filteredClubs.length === 0 ? (
                    <p className="text-xs text-white/50">Nenhum clube encontrado nesta região.</p>
                  ) : (
                    filteredClubs.slice(0, 6).map((c) => (
                      <div
                        key={c.club}
                        className="flex items-center justify-between rounded-lg border border-white/5 bg-black/40 px-3 py-2 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-white p-0.5">
                            <ClubLogo src={resolveClubData(c.club)?.logoUrl} alt={c.club} className="h-full w-full" />
                          </div>
                          <span className="font-black uppercase">{c.club}</span>
                        </div>
                        <span className="font-bold text-white/70">{c.votes.toLocaleString("pt-BR")}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </section>
          )}

          {/* UFMG: ocultado intencionalmente até integração real existir */}
        </main>
      </div>
    </>
  );
};

export default Stats;

/**
 * [RODAPÉ TÉCNICO]
 * V25 — 2026-05-02 BRT
 * - Splash + Slot Parceiro Master (oculto se PARTNER_MASTER=null)
 * - Inteligência geográfica universal via RPCs (get_heatmap_data, get_heatmap_neighborhoods, get_top_clubs_by_region, get_club_vote_summary, get_club_vote_ranking)
 * - Recordista Regional + Rival Auto (top-2 da região, sem hardcode)
 * - Drill-down: Mundo → País → Estado → Cidade → Bairros
 * - Busca livre por clube na região atual
 * - Módulo UFMG ocultado até dados oficiais reais existirem
 */
