/**
 * 📁 src/pages/Stats.tsx
 * 🏆 RANKING GLOBAL — Heart Club (v2)
 * - Emblemas reais via clubes_cache → CLUBS_DATA → Clearbit
 * - Censo de bairros detalhado (modo Cidade)
 * - Radar de rivalidade infalível (até 3 rivais históricos)
 * - Busca discreta no header
 * - Convite com link /convite?ref={user.id}
 */

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Loader2, LogOut, Search, Globe, Flag, MapPin, Building2, Home,
  TrendingUp, TrendingDown, Trophy, Swords, Target, Share2, Copy, Sparkles, Crown, Zap,
  Radar, Megaphone,
} from "lucide-react";
import ShareTropaModal from "@/components/dashboard/ShareTropaModal";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { CLUBS_DATA } from "@/clubes-data";
import { searchClubsWithFallback } from "@/lib/search-clubs";
import { getHistoricalRivals } from "@/lib/rivalries";

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

const fmt = (n: number) => (n || 0).toLocaleString("pt-BR");
const norm = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

const clearbitLogo = (clubName: string) => {
  const clean = clubName.toLowerCase().replace(/f\.?c\.?|futebol clube/g, "").trim().replace(/\s+/g, "");
  return `https://logo.clearbit.com/${clean}.com.br`;
};

const localLogo = (clubName: string) => {
  const local = CLUBS_DATA.find((c) => norm(c.nome) === norm(clubName));
  return local?.logoUrl || "";
};

// ─────────────────────────────────────────────────────────
// ClubBadge — emblema com cascade clubes_cache → CLUBS_DATA → Clearbit
// ─────────────────────────────────────────────────────────

const ClubBadge = ({
  club, cacheUrl, size = 36, className = "",
}: { club: string; cacheUrl?: string; size?: number; className?: string }) => {
  const sources = useMemo(() => {
    const arr = [cacheUrl, localLogo(club), clearbitLogo(club)].filter(Boolean) as string[];
    return Array.from(new Set(arr));
  }, [club, cacheUrl]);
  const [idx, setIdx] = useState(0);
  useEffect(() => { setIdx(0); }, [club, cacheUrl]);

  if (idx >= sources.length) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`rounded-full bg-white/10 flex items-center justify-center ${className}`}
        title={club}
      >
        <Trophy className="h-1/2 w-1/2 text-white/40" />
      </div>
    );
  }
  return (
    <img
      src={sources[idx]}
      alt={club}
      style={{ width: size, height: size }}
      onError={() => setIdx((i) => i + 1)}
      className={`rounded-full bg-white p-0.5 object-contain ${className}`}
      referrerPolicy="no-referrer"
      loading="lazy"
    />
  );
};

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

type Level = "global" | "country" | "state" | "city" | "neighborhood";
interface RankRow { club: string; votes: number; growth_24h: number; growth_7d: number; }
interface RegionOpt { name: string; votes: number; }
interface NeighborhoodRow { neighborhood: string; votes: number; }

const LEVEL_META: Record<Level, { label: string; icon: any }> = {
  global: { label: "Global", icon: Globe },
  country: { label: "País", icon: Flag },
  state: { label: "Estado", icon: MapPin },
  city: { label: "Cidade", icon: Building2 },
  neighborhood: { label: "Bairro", icon: Home },
};

// ─────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────

const Stats = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { toast } = useToast();

  // ROI tracking — counts /stats page views for the Revenue Terminal
  useEffect(() => {
    try {
      const k = "heartclub_stats_views";
      const n = parseInt(localStorage.getItem(k) || "0", 10) + 1;
      localStorage.setItem(k, String(n));
    } catch {}
  }, []);

  const [clubName, setClubName] = useState<string | null>(null);
  const [userVote, setUserVote] = useState<{ pais?: string; estado?: string; cidade?: string; bairro?: string }>({});

  const [level, setLevel] = useState<Level>("global");
  const [scope, setScope] = useState<{ country?: string; state?: string; city?: string; neighborhood?: string }>({});

  const [ranking, setRanking] = useState<RankRow[]>([]);
  const [prevRanking, setPrevRanking] = useState<Map<string, number>>(new Map());
  const [regionOptions, setRegionOptions] = useState<RegionOpt[]>([]);
  const [loadingRanking, setLoadingRanking] = useState(false);

  const [neighborhoods, setNeighborhoods] = useState<NeighborhoodRow[]>([]);
  const [loadingNeighborhoods, setLoadingNeighborhoods] = useState(false);

  // Logo cache: club name → escudo_url (clubes_cache)
  const [logoMap, setLogoMap] = useState<Map<string, string>>(new Map());
  const fetchedLogosRef = useRef<Set<string>>(new Set());

  // Header search
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // ─── Load user's club + vote location ───
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("votos")
        .select("clube_nome, voto_pais, pais, estado, voto_cidade, cidade, bairro")
        .eq("user_id", user.id)
        .eq("is_original_vote", true)
        .maybeSingle();
      if (data) {
        setClubName(data.clube_nome);
        setUserVote({
          pais: data.voto_pais || data.pais || undefined,
          estado: data.estado || undefined,
          cidade: data.voto_cidade || data.cidade || undefined,
          bairro: data.bairro || undefined,
        });
      }
    })();
  }, [user]);

  // ─── Compute scope value ───
  const scopeValue = useMemo(() => {
    if (level === "global") return null;
    if (level === "country") return scope.country || userVote.pais || null;
    if (level === "state") return scope.state || userVote.estado || null;
    if (level === "city") return scope.city || userVote.cidade || null;
    if (level === "neighborhood") return scope.neighborhood || userVote.bairro || null;
    return null;
  }, [level, scope, userVote]);

  // ─── Fetch ranking ───
  const fetchRanking = useCallback(async () => {
    setLoadingRanking(true);
    setPrevRanking(new Map(ranking.map((r, i) => [r.club, i])));
    const { data, error } = await supabase.rpc("get_ranking_with_growth", {
      p_level: level, p_value: scopeValue, p_limit: 50,
    });
    if (!error && data) {
      setRanking((data as any[]).map((r) => ({
        club: r.club, votes: Number(r.votes),
        growth_24h: Number(r.growth_24h), growth_7d: Number(r.growth_7d),
      })));
    } else { setRanking([]); }
    setLoadingRanking(false);
  }, [level, scopeValue]);

  useEffect(() => { fetchRanking(); /* eslint-disable-next-line */ }, [level, scopeValue]);

  // ─── Fetch region options ───
  useEffect(() => {
    if (level === "global") { setRegionOptions([]); return; }
    let parent: string | null = null;
    if (level === "state") parent = scope.country || userVote.pais || null;
    if (level === "city") parent = scope.state || userVote.estado || null;
    if (level === "neighborhood") parent = scope.city || userVote.cidade || null;
    (async () => {
      const { data } = await supabase.rpc("get_distinct_regions", { p_level: level, p_parent: parent });
      setRegionOptions((data as any[])?.map((r) => ({ name: r.name, votes: Number(r.votes) })) || []);
    })();
  }, [level, scope, userVote]);

  // ─── Fetch neighborhood census (city mode) ───
  useEffect(() => {
    const city = level === "city" ? scopeValue : null;
    if (!clubName || !city) { setNeighborhoods([]); return; }
    setLoadingNeighborhoods(true);
    (async () => {
      const { data } = await supabase.rpc("get_heatmap_neighborhoods", {
        p_club_name: clubName, p_city: city,
      });
      setNeighborhoods(((data as any[]) || []).map((n) => ({
        neighborhood: n.neighborhood, votes: Number(n.votes),
      })));
      setLoadingNeighborhoods(false);
    })();
  }, [clubName, level, scopeValue]);

  // ─── Resolve logos via clubes_cache for visible clubs ───
  useEffect(() => {
    const targets = new Set<string>();
    ranking.forEach((r) => targets.add(r.club));
    if (clubName) targets.add(clubName);
    getHistoricalRivals(clubName, 3).forEach((r) => targets.add(r));

    const toFetch = Array.from(targets).filter(
      (c) => c && !fetchedLogosRef.current.has(norm(c)),
    );
    if (toFetch.length === 0) return;
    toFetch.forEach((c) => fetchedLogosRef.current.add(norm(c)));

    (async () => {
      // Match acento-insensível e tolerante a sufixos (ex.: "Atlético-GO" ↔ "Atletico Goianiense")
      const { data } = await supabase
        .from("clubes_cache")
        .select("nome, escudo_url")
        .not("escudo_url", "is", null);
      if (data && data.length) {
        const cache = data as Array<{ nome: string; escudo_url: string }>;
        setLogoMap((prev) => {
          const next = new Map(prev);
          for (const target of toFetch) {
            const nt = norm(target);
            // 1) match exato normalizado
            let hit = cache.find((r) => norm(r.nome) === nt);
            // 2) prefixo (cobre "Atlético-GO" ⊂ "Atletico Goianiense" via primeira palavra)
            if (!hit) {
              const head = nt.split(/[\s\-]/)[0];
              if (head && head.length >= 4) {
                hit = cache.find((r) => norm(r.nome).startsWith(head));
              }
            }
            // 3) inclui token significativo
            if (!hit) {
              hit = cache.find((r) => {
                const nr = norm(r.nome);
                return nr.includes(nt) || nt.includes(nr);
              });
            }
            if (hit?.escudo_url) next.set(nt, hit.escudo_url);
          }
          return next;
        });
      }
    })();
  }, [ranking, clubName]);

  const logoFor = useCallback((club: string) => logoMap.get(norm(club)) || "", [logoMap]);

  // ─── Derived: position + targets ───
  const myIdx = ranking.findIndex((r) => r.club === clubName);
  const myRow = myIdx >= 0 ? ranking[myIdx] : null;
  const aboveRow = myIdx > 0 ? ranking[myIdx - 1] : null;
  const top10Row = ranking[9];

  const historicalRivals = useMemo(() => getHistoricalRivals(clubName, 3), [clubName]);
  const rivalRows = useMemo(
    () => historicalRivals.map((name) => {
      const row = ranking.find((r) => norm(r.club) === norm(name));
      return { name, row };
    }),
    [historicalRivals, ranking],
  );

  const positionDelta = (club: string, currentIdx: number) => {
    const prev = prevRanking.get(club);
    if (prev === undefined || prev === currentIdx) return 0;
    return prev - currentIdx;
  };

  const hypeMessage = useMemo(() => {
    if (!myRow) return "Seu clube ainda não recebeu votos neste recorte.";
    if (myRow.growth_24h >= 50) return "🔥 Crescimento explosivo nas últimas 24h!";
    if (myIdx === 0) return "👑 Domínio absoluto nesta região.";
    if (myIdx < 3) return "🚀 Seu clube está no pódio — empurre mais um pouco!";
    if (myRow.growth_7d > 0) return "📈 Movimento crescente. Hora de convocar a torcida.";
    return "🎯 Cada voto conta. Convide a torcida e suba no ranking.";
  }, [myRow, myIdx]);

  const goals = useMemo(() => {
    const list: string[] = [];
    if (myRow && aboveRow) {
      const diff = aboveRow.votes - myRow.votes + 1;
      list.push(`Faltam ${fmt(diff)} votos para ultrapassar o ${aboveRow.club}.`);
    }
    if (myRow && top10Row && myIdx > 9) {
      list.push(`A ${fmt(top10Row.votes - myRow.votes + 1)} votos do Top 10 ${LEVEL_META[level].label.toLowerCase()}.`);
    }
    if (level !== "neighborhood" && userVote.bairro) {
      list.push(`Confira o ranking no seu bairro (${userVote.bairro}).`);
    }
    if (myIdx === 0 && myRow) list.push("Liderança consolidada — defenda o topo.");
    return list.slice(0, 3);
  }, [myRow, aboveRow, top10Row, myIdx, level, userVote]);

  // ─── Search (debounced) ───
  useEffect(() => {
    if (search.length < 3) { setSearchResults([]); return; }
    setIsSearching(true);
    const t = setTimeout(async () => {
      setSearchResults(await searchClubsWithFallback(search, 8));
      setIsSearching(false);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // ─── Invite link ───
  const inviteLink = useMemo(() => {
    const code = user?.id || "";
    return `${window.location.origin}/convite?ref=${code}`;
  }, [user]);

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteLink);
    toast({ title: "Link copiado!", description: "Compartilhe com a torcida 🔥" });
  };

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* HEADER */}
      <header className="sticky top-0 z-30 p-3 bg-black/95 backdrop-blur border-b border-primary/20">
        <div className="flex justify-between items-center gap-3 max-w-6xl mx-auto">
          <div className="flex items-center gap-3 min-w-0">
            {clubName && (
              <ClubBadge club={clubName} cacheUrl={logoFor(clubName)} size={40} />
            )}
            <div className="min-w-0">
              <p className="text-[10px] tracking-widest text-primary font-black">RANKING GLOBAL</p>
              <h1 className="font-black italic text-lg leading-tight truncate">
                {clubName || "Heart Club"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Discrete header search */}
            <div className="relative">
              {!searchOpen ? (
                <Button size="sm" variant="ghost" onClick={() => setSearchOpen(true)} title="Consultar outro clube">
                  <Search className="h-4 w-4" />
                </Button>
              ) : (
                <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full pl-3 pr-1 h-9 w-[220px] md:w-[280px]">
                  <Search className="h-3.5 w-3.5 text-white/50" />
                  <input
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onBlur={() => setTimeout(() => { if (!search) setSearchOpen(false); }, 200)}
                    placeholder="Buscar clube..."
                    className="bg-transparent outline-none text-xs flex-1 placeholder:text-white/40"
                  />
                  {isSearching && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                </div>
              )}
              {searchOpen && searchResults.length > 0 && (
                <div className="absolute right-0 top-11 w-[300px] bg-zinc-950 border border-white/10 rounded-xl p-2 shadow-2xl z-50 max-h-[60vh] overflow-y-auto">
                  {searchResults.map((c, i) => (
                    <button
                      key={i}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setClubName(c.name); setSearch(""); setSearchResults([]); setSearchOpen(false);
                      }}
                      className="w-full flex items-center gap-3 p-2 hover:bg-white/10 rounded-lg text-left transition"
                    >
                      <ClubBadge club={c.name} cacheUrl={c.logo} size={32} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black italic truncate">{c.name}</p>
                        <p className="text-[10px] text-white/50 truncate">{c.location}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button size="sm" variant="ghost" onClick={() => navigate("/dashboard")} title="Voltar">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* LEVEL TABS */}
        <div className="max-w-6xl mx-auto mt-3 flex gap-1 overflow-x-auto scrollbar-none">
          {(Object.keys(LEVEL_META) as Level[]).map((lv) => {
            const Icon = LEVEL_META[lv].icon;
            const active = level === lv;
            return (
              <button
                key={lv}
                onClick={() => { setLevel(lv); setScope({}); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black italic whitespace-nowrap transition ${
                  active ? "bg-primary text-black" : "bg-white/5 text-white/70 hover:bg-white/10"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {LEVEL_META[lv].label}
              </button>
            );
          })}
        </div>

        {/* REGION SELECTOR */}
        {level !== "global" && regionOptions.length > 0 && (
          <div className="max-w-6xl mx-auto mt-2 flex gap-1 overflow-x-auto scrollbar-none">
            {regionOptions.slice(0, 20).map((r) => {
              const sel = scopeValue === r.name;
              return (
                <button
                  key={r.name}
                  onClick={() => setScope((s) => ({ ...s, [level]: r.name }))}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold whitespace-nowrap transition ${
                    sel ? "bg-primary/20 text-primary border border-primary/40" : "bg-white/5 text-white/60 hover:bg-white/10"
                  }`}
                >
                  {r.name} <span className="opacity-60">· {fmt(r.votes)}</span>
                </button>
              );
            })}
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-5">
        {/* HYPE BANNER + CONVITE INLINE */}
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border border-primary/30 rounded-2xl p-4"
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <p className="text-sm italic text-primary font-bold flex items-center gap-2">
                <Sparkles className="h-4 w-4 shrink-0" /> {hypeMessage}
              </p>
              {myRow && (
                <p className="text-xs text-white/60 mt-1">
                  Posição atual: <span className="text-white font-black">#{myIdx + 1}</span> · {fmt(myRow.votes)} votos
                  {myRow.growth_24h > 0 && (
                    <span className="ml-2 text-green-400">+{fmt(myRow.growth_24h)} (24h)</span>
                  )}
                </p>
              )}
            </div>
            <Button
              onClick={copyInvite}
              size="sm"
              className="bg-primary text-black hover:bg-primary/90 font-black italic shrink-0"
              title={inviteLink}
            >
              <Share2 className="h-4 w-4 mr-1.5" />
              Ajude seu clube a subir no ranking
              <Copy className="h-3.5 w-3.5 ml-2 opacity-70" />
            </Button>
          </div>
        </motion.div>

        {/* RADAR DE RIVALIDADE */}
        {clubName && historicalRivals.length > 0 && (
          <section className="bg-zinc-950 border border-primary/20 rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-widest text-primary font-black flex items-center gap-1.5 mb-3">
              <Radar className="h-3.5 w-3.5" /> Radar de Rivalidade
              {scopeValue && <span className="text-white/40">· {scopeValue}</span>}
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {rivalRows.map(({ name, row }) => {
                const myV = myRow?.votes || 0;
                const rivalV = row?.votes || 0;
                const diff = myV - rivalV;
                const ahead = diff > 0;
                const pct = rivalV > 0 ? Math.abs(diff) / rivalV * 100 : 0;
                return (
                  <div key={name} className="bg-black/40 border border-white/10 rounded-xl p-3 flex items-center gap-3">
                    <ClubBadge club={name} cacheUrl={logoFor(name)} size={42} />
                    <div className="flex-1 min-w-0">
                      <p className="font-black italic text-sm truncate">{name}</p>
                      <p className="text-[10px] text-white/50">
                        {row ? `${fmt(rivalV)} votos` : "sem votos no recorte"}
                      </p>
                    </div>
                    <div className="text-right">
                      {row && myRow ? (
                        <>
                          <p className={`text-sm font-black ${ahead ? "text-green-400" : "text-primary"}`}>
                            {ahead ? "+" : ""}{fmt(diff)}
                          </p>
                          <p className="text-[10px] text-white/50">
                            {ahead ? `${pct.toFixed(0)}% à frente` : `faltam ${pct.toFixed(0)}%`}
                          </p>
                        </>
                      ) : (
                        <Swords className="h-4 w-4 text-white/30" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* PRÓXIMO ALVO (proximidade) */}
        {aboveRow && myRow && (
          <section className="bg-zinc-950 border border-primary/20 rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-widest text-primary font-black flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5" /> Próximo Alvo
            </p>
            <div className="flex items-center gap-3 mt-2">
              <ClubBadge club={aboveRow.club} cacheUrl={logoFor(aboveRow.club)} size={48} />
              <div className="flex-1 min-w-0">
                <p className="font-black italic truncate">{aboveRow.club}</p>
                <p className="text-xs text-white/60">#{myIdx} · {fmt(aboveRow.votes)} votos</p>
              </div>
              <p className="text-sm font-black text-primary whitespace-nowrap">
                Faltam {fmt(aboveRow.votes - myRow.votes + 1)}
              </p>
            </div>
          </section>
        )}

        {/* METAS */}
        {goals.length > 0 && (
          <section className="bg-zinc-950 border border-white/10 rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-widest text-primary font-black mb-2 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" /> Metas Dinâmicas
            </p>
            <ul className="space-y-1.5">
              {goals.map((g, i) => (
                <li key={i} className="text-sm text-white/80 flex gap-2">
                  <span className="text-primary">▸</span>{g}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* CENSO DE BAIRROS (City mode) */}
        {level === "city" && scopeValue && clubName && (
          <section className="bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <p className="font-black italic flex items-center gap-2">
                <Home className="h-4 w-4 text-primary" />
                Censo por Bairro · {clubName} em {scopeValue}
              </p>
              {loadingNeighborhoods && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            </div>
            {neighborhoods.length === 0 && !loadingNeighborhoods ? (
              <p className="p-6 text-center text-white/40 italic text-sm">
                Sem votos registrados por bairro neste recorte.
              </p>
            ) : (
              <div className="divide-y divide-white/5 max-h-[420px] overflow-y-auto">
                {neighborhoods.map((n, i) => {
                  const isMine = userVote.bairro && norm(userVote.bairro) === norm(n.neighborhood);
                  return (
                    <div
                      key={n.neighborhood + i}
                      className={`flex items-center gap-3 p-3 ${isMine ? "bg-primary/10 border-l-4 border-primary" : ""}`}
                    >
                      <span className="font-black italic text-white/60 w-8 text-center text-xs">
                        #{i + 1}
                      </span>
                      <p className={`flex-1 text-sm truncate italic ${isMine ? "text-primary font-black" : "text-white/85"}`}>
                        {n.neighborhood}
                      </p>
                      <p className="text-sm font-black text-white tabular-nums">
                        {fmt(n.votes)} <span className="text-white/40 text-[10px] font-bold">votos</span>
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* RANKING */}
        <section className="bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <p className="font-black italic flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              Ranking {LEVEL_META[level].label}
              {scopeValue && <span className="text-white/50 text-sm">· {scopeValue}</span>}
            </p>
            {loadingRanking && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          </div>
          <div className="divide-y divide-white/5">
            {ranking.length === 0 && !loadingRanking && (
              <p className="p-6 text-center text-white/40 italic text-sm">
                Sem dados para este recorte.
              </p>
            )}
            {ranking.map((r, i) => {
              const isMe = r.club === clubName;
              const delta = positionDelta(r.club, i);
              return (
                <motion.div
                  key={r.club}
                  layout
                  className={`flex items-center gap-3 p-3 transition ${
                    isMe ? "bg-primary/10 border-l-4 border-primary" : "hover:bg-white/5"
                  }`}
                >
                  <div className="w-8 text-center">
                    {i === 0 ? (
                      <Crown className="h-5 w-5 text-yellow-400 mx-auto" />
                    ) : (
                      <span className="font-black italic text-white/70">#{i + 1}</span>
                    )}
                  </div>
                  <ClubBadge club={r.club} cacheUrl={logoFor(r.club)} size={36} />
                  <div className="flex-1 min-w-0">
                    <p className={`font-black italic truncate text-sm ${isMe ? "text-primary" : ""}`}>
                      {r.club}
                    </p>
                    <p className="text-[10px] text-white/50">
                      {fmt(r.votes)} votos
                      {r.growth_24h > 0 && (
                        <span className="text-green-400 ml-2">+{fmt(r.growth_24h)} (24h)</span>
                      )}
                      {r.growth_7d > 0 && (
                        <span className="text-white/40 ml-2">+{fmt(r.growth_7d)} (7d)</span>
                      )}
                    </p>
                  </div>
                  {delta !== 0 && (
                    <span className={`text-xs font-black flex items-center ${delta > 0 ? "text-green-400" : "text-white/40"}`}>
                      {delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {Math.abs(delta)}
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Stats;
