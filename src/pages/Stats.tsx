/**
 * 📁 src/pages/Stats.tsx
 * 🏆 RANKING GLOBAL — Heart Club
 * Filtros geográficos (Global → País → Estado → Cidade → Bairro),
 * ranking dinâmico com crescimento 24h/7d, rivalidade histórica + direta,
 * metas dinâmicas, frases de hype, eventos globais, convite viral.
 */

import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, LogOut, Search, Globe, Flag, MapPin, Building2, Home,
  TrendingUp, TrendingDown, Trophy, Swords, Target, Share2, Copy, Sparkles, Crown, Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { CLUBS_DATA } from "@/clubes-data";
import { searchClubsWithFallback } from "@/lib/search-clubs";
import { getHistoricalRival } from "@/lib/rivalries";

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

const getUniversalLogo = (clubName: string | null): string => {
  if (!clubName) return "";
  const local = CLUBS_DATA.find((c) => c.nome.toLowerCase() === clubName.toLowerCase());
  if (local?.logoUrl) return local.logoUrl;
  const clean = clubName.toLowerCase().replace(/f\.?c\.?|futebol clube/g, "").trim().replace(/\s+/g, "");
  return `https://logo.clearbit.com/${clean}.com.br`;
};

const fmt = (n: number) => (n || 0).toLocaleString("pt-BR");

type Level = "global" | "country" | "state" | "city" | "neighborhood";

interface RankRow {
  club: string;
  votes: number;
  growth_24h: number;
  growth_7d: number;
}

interface RegionOpt {
  name: string;
  votes: number;
}

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

  const [clubName, setClubName] = useState<string | null>(null);
  const [userVote, setUserVote] = useState<{ pais?: string; estado?: string; cidade?: string; bairro?: string }>({});

  const [level, setLevel] = useState<Level>("global");
  const [scope, setScope] = useState<{ country?: string; state?: string; city?: string; neighborhood?: string }>({});

  const [ranking, setRanking] = useState<RankRow[]>([]);
  const [prevRanking, setPrevRanking] = useState<Map<string, number>>(new Map());
  const [regionOptions, setRegionOptions] = useState<RegionOpt[]>([]);
  const [loadingRanking, setLoadingRanking] = useState(false);

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

  // ─── Compute scope value for current level ───
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
      p_level: level,
      p_value: scopeValue,
      p_limit: 50,
    });
    if (!error && data) {
      setRanking((data as any[]).map((r) => ({
        club: r.club, votes: Number(r.votes),
        growth_24h: Number(r.growth_24h), growth_7d: Number(r.growth_7d),
      })));
    } else {
      setRanking([]);
    }
    setLoadingRanking(false);
  }, [level, scopeValue]);

  useEffect(() => { fetchRanking(); }, [level, scopeValue]);

  // ─── Fetch region options for current level ───
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

  // ─── Derived: user's club position + targets ───
  const myIdx = ranking.findIndex((r) => r.club === clubName);
  const myRow = myIdx >= 0 ? ranking[myIdx] : null;
  const aboveRow = myIdx > 0 ? ranking[myIdx - 1] : null;
  const top10Row = ranking[9];

  const historicalRival = useMemo(() => getHistoricalRival(clubName), [clubName]);
  const historicalRivalRow = useMemo(
    () => ranking.find((r) => r.club.toLowerCase() === (historicalRival || "").toLowerCase()),
    [ranking, historicalRival],
  );

  const positionDelta = (club: string, currentIdx: number) => {
    const prev = prevRanking.get(club);
    if (prev === undefined || prev === currentIdx) return 0;
    return prev - currentIdx; // positive = subiu
  };

  // ─── Hype message ───
  const hypeMessage = useMemo(() => {
    if (!myRow) return "Seu clube ainda não recebeu votos neste recorte.";
    if (myRow.growth_24h >= 50) return "🔥 Crescimento explosivo nas últimas 24h!";
    if (myIdx === 0) return "👑 Domínio absoluto nesta região.";
    if (myIdx < 3) return "🚀 Seu clube está no pódio — empurre mais um pouco!";
    if (myRow.growth_7d > 0) return "📈 Movimento crescente. Hora de convocar a torcida.";
    return "🎯 Cada voto conta. Convide a torcida e suba no ranking.";
  }, [myRow, myIdx]);

  // ─── Goals ───
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

  // ─── Search ───
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
    const code = user?.id ? user.id.slice(0, 8) : "";
    return `${window.location.origin}/?ref=${code}`;
  }, [user]);

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteLink);
    toast({ title: "Link copiado!", description: "Compartilhe com a torcida 🔥" });
  };

  // ─── Render ───

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* HEADER */}
      <header className="sticky top-0 z-30 p-3 bg-black/95 backdrop-blur border-b border-primary/20">
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            {clubName && (
              <img
                src={getUniversalLogo(clubName)}
                onError={(e) => ((e.currentTarget.style.display = "none"))}
                className="h-10 w-10 rounded-full bg-white p-1 object-contain"
                alt={clubName}
              />
            )}
            <div>
              <p className="text-[10px] tracking-widest text-primary font-black">RANKING GLOBAL</p>
              <h1 className="font-black italic text-lg leading-tight">{clubName || "Heart Club"}</h1>
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={() => navigate("/dashboard")}>
            <LogOut className="h-4 w-4" />
          </Button>
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
        {/* HYPE BANNER */}
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border border-primary/30 rounded-2xl p-4"
        >
          <p className="text-sm italic text-primary font-bold flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> {hypeMessage}
          </p>
          {myRow && (
            <p className="text-xs text-white/60 mt-1">
              Posição atual: <span className="text-white font-black">#{myIdx + 1}</span> · {fmt(myRow.votes)} votos
              {myRow.growth_24h > 0 && (
                <span className="ml-2 text-green-400">+{fmt(myRow.growth_24h)} (24h)</span>
              )}
            </p>
          )}
        </motion.div>

        {/* RIVALIDADE */}
        {(historicalRivalRow || aboveRow) && (
          <section className="grid md:grid-cols-2 gap-3">
            {historicalRivalRow && (
              <div className="bg-zinc-950 border border-white/10 rounded-2xl p-4">
                <p className="text-[10px] uppercase tracking-widest text-primary font-black flex items-center gap-1.5">
                  <Swords className="h-3.5 w-3.5" /> Rival Histórico
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <img src={getUniversalLogo(historicalRivalRow.club)} className="h-12 w-12 bg-white rounded-full p-1" />
                  <div className="flex-1">
                    <p className="font-black italic">{historicalRivalRow.club}</p>
                    <p className="text-xs text-white/60">{fmt(historicalRivalRow.votes)} votos</p>
                  </div>
                  {myRow && (
                    <p className={`text-sm font-black ${myRow.votes > historicalRivalRow.votes ? "text-green-400" : "text-primary"}`}>
                      {myRow.votes > historicalRivalRow.votes ? "+" : ""}
                      {fmt(myRow.votes - historicalRivalRow.votes)}
                    </p>
                  )}
                </div>
              </div>
            )}
            {aboveRow && myRow && (
              <div className="bg-zinc-950 border border-primary/20 rounded-2xl p-4">
                <p className="text-[10px] uppercase tracking-widest text-primary font-black flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5" /> Próximo Alvo
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <img src={getUniversalLogo(aboveRow.club)} className="h-12 w-12 bg-white rounded-full p-1" />
                  <div className="flex-1">
                    <p className="font-black italic">{aboveRow.club}</p>
                    <p className="text-xs text-white/60">#{myIdx} · {fmt(aboveRow.votes)} votos</p>
                  </div>
                  <p className="text-sm font-black text-primary">
                    Faltam {fmt(aboveRow.votes - myRow.votes + 1)}
                  </p>
                </div>
              </div>
            )}
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
                  <img
                    src={getUniversalLogo(r.club)}
                    onError={(e) => ((e.currentTarget.style.opacity = "0.2"))}
                    className="h-9 w-9 rounded-full bg-white p-0.5 object-contain"
                    alt={r.club}
                  />
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

        {/* CONVITE */}
        <section className="bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/30 rounded-2xl p-5">
          <p className="font-black italic text-lg flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Ajude seu clube a subir no ranking
          </p>
          <p className="text-xs text-white/70 mt-1">
            Convide amigos. Cada novo torcedor pelo seu link impulsiona seu time.
          </p>
          <div className="mt-3 flex gap-2">
            <Input value={inviteLink} readOnly className="bg-black/40 text-xs" />
            <Button onClick={copyInvite} className="bg-primary text-black hover:bg-primary/90">
              <Copy className="h-4 w-4 mr-1" /> Copiar
            </Button>
          </div>
        </section>

        {/* CONSULTA OUTRO CLUBE */}
        <section className="bg-zinc-950 border border-white/10 rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-widest text-primary font-black mb-2">
            Consultar outro clube
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-white/40" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Digite o nome do clube..."
              className="pl-10 bg-black/40"
            />
          </div>
          {isSearching && <Loader2 className="animate-spin mx-auto mt-3 h-4 w-4 text-primary" />}
          {searchResults.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {searchResults.map((c, i) => (
                <button
                  key={i}
                  onClick={() => { setClubName(c.name); setSearch(""); setSearchResults([]); }}
                  className="w-full flex items-center gap-3 p-2 bg-white/5 hover:bg-white/10 rounded-lg text-left transition"
                >
                  <img
                    src={c.logo || getUniversalLogo(c.name)}
                    onError={(e) => ((e.currentTarget.style.opacity = "0.2"))}
                    className="h-8 w-8 rounded-full bg-white p-0.5 object-contain"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-black italic">{c.name}</p>
                    <p className="text-[10px] text-white/50">{c.location}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Stats;
