/**
 * ARQUIVO: src/pages/Stats.tsx
 * MÓDULO: Estatísticas do Clube — Página de engajamento e comparação de torcidas.
 * DESIGN: Banner minimalista com faixas diagonais brancas + módulos de dados dinâmicos.
 * REGRA: Dados vinculados ao perfil do usuário — zero hardcoded.
 */

/* ══════════════════════════════════════════════ */
/* IMPORTS                                        */
/* ══════════════════════════════════════════════ */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LogOut, Loader2, MapPin, BarChart3, Search, Trophy,
  TrendingUp, Users, Swords, Globe, ChevronRight, Flame, Crown, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { CLUBS_DATA } from "@/clubes-data";
import { ClubLogo } from "@/components/ClubLogo";
import { getTeamTheme } from "@/data/teamColors";
import { searchClubsLocal, ClubSearchResult } from "@/lib/search-clubs";
import logo from "@/assets/logo.png";
import { motion, AnimatePresence } from "framer-motion";

/* ══════════════════════════════════════════════ */
/* CONFIG & HELPERS                               */
/* ══════════════════════════════════════════════ */
const normalize = (v: string) =>
  v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9\s]/g, " ").trim().toLowerCase();

// Mapeamento de rivais clássicos
const RIVALS_MAP: Record<string, string[]> = {
  "Palmeiras":     ["Corinthians", "São Paulo", "Santos", "Flamengo"],
  "Flamengo":      ["Vasco", "Fluminense", "Botafogo", "Corinthians"],
  "Corinthians":   ["Palmeiras", "São Paulo", "Santos", "Flamengo"],
  "São Paulo":     ["Corinthians", "Palmeiras", "Santos"],
  "Santos":        ["Corinthians", "Palmeiras", "São Paulo"],
  "Vasco":         ["Flamengo", "Fluminense", "Botafogo"],
  "Botafogo":      ["Flamengo", "Vasco", "Fluminense"],
  "Fluminense":    ["Flamengo", "Vasco", "Botafogo"],
  "Grêmio":        ["Internacional", "Flamengo"],
  "Internacional": ["Grêmio", "Flamengo"],
  "Atlético-MG":   ["Cruzeiro", "Flamengo"],
  "Cruzeiro":      ["Atlético-MG", "Flamengo"],
  "Bahia":         ["Vitória", "Sport"],
  "Vitória":       ["Bahia"],
  "Athletico-PR":  ["Coritiba", "Flamengo"],
  "Coritiba":      ["Athletico-PR"],
  "Goiás":         ["Vila Nova", "Atlético-GO"],
  "Vila Nova":     ["Goiás", "Atlético-GO"],
  "Atlético-GO":   ["Goiás", "Vila Nova"],
  "Sport":         ["Náutico", "Santa Cruz"],
  "Santa Cruz":    ["Sport", "Náutico"],
  "Fortaleza":     ["Ceará"],
  "Ceará":         ["Fortaleza"],
  "Paysandu":      ["Remo"],
};

interface ClubVoteStats {
  clube_nome: string;
  total: number;
  logo?: string;
}

interface GeoStat {
  label: string;
  count: number;
}

/* ══════════════════════════════════════════════ */
/* COMPONENT                                      */
/* ══════════════════════════════════════════════ */
const Stats = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading, signOut } = useUser();
  const [activeClub, setActiveClub] = useState<any>(null);
  const [clubeName, setClubeName] = useState<string | null>(null);

  // Stats data
  const [myClubTotal, setMyClubTotal] = useState(0);
  const [rivalStats, setRivalStats] = useState<ClubVoteStats[]>([]);
  const [topCities, setTopCities] = useState<GeoStat[]>([]);
  const [topStates, setTopStates] = useState<GeoStat[]>([]);
  const [totalCensus, setTotalCensus] = useState(0);
  const [ranking, setRanking] = useState(0);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ClubSearchResult[]>([]);
  const [comparedClub, setComparedClub] = useState<ClubVoteStats | null>(null);

  // Load user's club
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("votos")
        .select("clube_nome")
        .eq("user_id", user.id)
        .eq("is_original_vote", true)
        .maybeSingle();

      const teamName = data?.clube_nome || null;
      setClubeName(teamName);
      if (teamName) {
        const clubInfo = CLUBS_DATA.find((c) => normalize(c.nome) === normalize(teamName));
        setActiveClub(clubInfo || { nome: teamName });
      }
    };
    loadData();
  }, [user]);

  // Load all statistics
  useEffect(() => {
    if (!clubeName) return;

    const loadStats = async () => {
      // My club total
      const { count: myCount } = await supabase
        .from("votos")
        .select("*", { count: "exact", head: true })
        .eq("clube_nome", clubeName)
        .eq("is_original_vote", true);
      setMyClubTotal(myCount || 0);

      // Total census
      const { count: total } = await supabase
        .from("votos")
        .select("*", { count: "exact", head: true })
        .eq("is_original_vote", true);
      setTotalCensus(total || 0);

      // Rivals
      const rivals = RIVALS_MAP[clubeName] || [];
      if (rivals.length > 0) {
        const rivalData: ClubVoteStats[] = [];
        for (const rival of rivals) {
          const { count } = await supabase
            .from("votos")
            .select("*", { count: "exact", head: true })
            .eq("clube_nome", rival)
            .eq("is_original_vote", true);
          const club = CLUBS_DATA.find((c) => normalize(c.nome) === normalize(rival));
          rivalData.push({
            clube_nome: rival,
            total: count || 0,
            logo: club?.logoUrl,
          });
        }
        rivalData.sort((a, b) => b.total - a.total);
        setRivalStats(rivalData);
      }

      // Geographic data — cities
      const { data: cityData } = await supabase
        .from("votos")
        .select("cidade")
        .eq("clube_nome", clubeName)
        .eq("is_original_vote", true);
      if (cityData) {
        const cityMap: Record<string, number> = {};
        cityData.forEach((v) => { cityMap[v.cidade] = (cityMap[v.cidade] || 0) + 1; });
        const sorted = Object.entries(cityMap)
          .map(([label, count]) => ({ label, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8);
        setTopCities(sorted);
      }

      // Geographic data — states
      const { data: stateData } = await supabase
        .from("votos")
        .select("estado")
        .eq("clube_nome", clubeName)
        .eq("is_original_vote", true);
      if (stateData) {
        const stateMap: Record<string, number> = {};
        stateData.forEach((v) => { stateMap[v.estado] = (stateMap[v.estado] || 0) + 1; });
        const sorted = Object.entries(stateMap)
          .map(([label, count]) => ({ label, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8);
        setTopStates(sorted);
      }

      // Ranking position
      const { data: allClubs } = await supabase
        .from("votos")
        .select("clube_nome")
        .eq("is_original_vote", true);
      if (allClubs) {
        const clubCounts: Record<string, number> = {};
        allClubs.forEach((v) => { clubCounts[v.clube_nome] = (clubCounts[v.clube_nome] || 0) + 1; });
        const sorted = Object.entries(clubCounts).sort((a, b) => b[1] - a[1]);
        const pos = sorted.findIndex(([name]) => name === clubeName);
        setRanking(pos >= 0 ? pos + 1 : 0);
      }
    };

    loadStats();
  }, [clubeName]);

  // Search handler
  const handleSearch = (val: string) => {
    setSearchQuery(val);
    if (val.length > 1) {
      setSearchResults(searchClubsLocal(val, 8));
    } else {
      setSearchResults([]);
    }
  };

  const selectCompareClub = async (club: ClubSearchResult) => {
    setSearchQuery("");
    setSearchResults([]);
    const { count } = await supabase
      .from("votos")
      .select("*", { count: "exact", head: true })
      .eq("clube_nome", club.name)
      .eq("is_original_vote", true);
    setComparedClub({ clube_nome: club.name, total: count || 0, logo: club.logo });
  };

  const theme = useMemo(() => getTeamTheme(clubeName), [clubeName]);

  if (isLoading || !profile)
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <Loader2 className="animate-spin text-[#ff6200] w-10 h-10" />
      </div>
    );

  const maxRivalVotes = Math.max(myClubTotal, ...rivalStats.map((r) => r.total), 1);

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      {/* ══════════════════════════════════════════════ */}
      {/* HEADER                                        */}
      {/* ══════════════════════════════════════════════ */}
      <header className="h-16 border-b border-white/5 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <img src={logo} alt="Logo" className="h-8 md:h-10 w-auto" />
            <span className="font-black italic text-lg tracking-tighter">HEART CLUB</span>
          </div>
          <nav className="hidden sm:flex items-center gap-1">
            {[
              { label: "Dashboard", path: "/dashboard" },
              { label: "Mapa", path: "/mapa-calor" },
              { label: "Estatísticas", path: "/stats" },
            ].map((item) => (
              <Button
                key={item.path}
                variant="ghost"
                size="sm"
                onClick={() => navigate(item.path)}
                className={`text-xs font-bold uppercase tracking-wider ${
                  item.path === "/stats" ? "text-[#ff6200]" : "text-white/50 hover:text-white"
                }`}
              >
                {item.label}
              </Button>
            ))}
          </nav>
          <Button variant="ghost" size="icon" onClick={() => signOut()} className="text-white/50">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-2 md:px-4 py-4 space-y-6">
        {/* ══════════════════════════════════════════════ */}
        {/* BANNER DE RESPEITO                            */}
        {/* ══════════════════════════════════════════════ */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-[2rem] h-[140px] sm:h-[160px] md:h-[180px] shadow-2xl flex items-center"
          style={{ backgroundColor: theme.primaryHex }}
        >
          {/* Duas faixas diagonais brancas — fina + grossa */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div
              className="absolute top-[-40%] h-[200%] rotate-[22deg]"
              style={{ backgroundColor: "#ffffff", opacity: 0.18, right: "18%", width: "3px" }}
            />
            <div
              className="absolute top-[-40%] h-[200%] rotate-[22deg]"
              style={{ backgroundColor: "#ffffff", opacity: 0.12, right: "14%", width: "14px" }}
            />
          </div>

          {/* Glow sutil */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at 80% 50%, ${theme.glow}, transparent 70%)`,
            }}
          />

          {/* Conteúdo */}
          <div className="relative z-10 flex items-center justify-between w-full px-4 sm:px-6 md:px-10">
            {/* Escudo */}
            <div
              className="w-[60px] h-[60px] sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full shadow-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: theme.secondaryHex, boxShadow: `0 0 20px ${theme.glow}` }}
            >
              <ClubLogo
                src={activeClub?.logoUrl || activeClub?.logo}
                alt={clubeName || ""}
                className="w-[98%] h-[98%] object-contain rounded-full"
              />
            </div>

            {/* Texto */}
            <div className="text-right flex flex-col items-end">
              <span className={`text-[8px] sm:text-[9px] md:text-[10px] font-bold uppercase tracking-[0.35em] opacity-50 ${theme.textClass}`}>
                Estatísticas do Clube
              </span>
              <h1 className={`font-black italic uppercase tracking-tight text-lg sm:text-2xl md:text-4xl leading-none mt-0.5 ${theme.textClass}`}>
                {clubeName}
              </h1>
              <div className={`flex items-center gap-1 mt-1 text-[8px] sm:text-[9px] md:text-xs opacity-60 ${theme.textClass}`}>
                <MapPin className="w-3 h-3" />
                <span>{activeClub?.cidade}, {activeClub?.estado}</span>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ══════════════════════════════════════════════ */}
        {/* STATS RÁPIDAS — Cards de destaque             */}
        {/* ══════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Users, label: "Torcedores", value: myClubTotal, color: theme.primaryHex },
            { icon: Crown, label: "Ranking Geral", value: ranking > 0 ? `#${ranking}` : "—", color: "#FFD700" },
            { icon: Globe, label: "Censo Total", value: totalCensus, color: "#ff6200" },
            { icon: Flame, label: "Rivais Mapeados", value: rivalStats.length, color: "#ef4444" },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i, duration: 0.5 }}
            >
              <Card className="bg-white/[0.04] border-white/[0.06] hover:border-white/10 transition-all">
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${stat.color}22` }}>
                    <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                  </div>
                  <span className="text-2xl md:text-3xl font-black italic text-white">{stat.value}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">{stat.label}</span>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* ══════════════════════════════════════════════ */}
        {/* RADAR DE RIVAIS                               */}
        {/* ══════════════════════════════════════════════ */}
        {rivalStats.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            <Card className="bg-white/[0.03] border-white/[0.06]">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-white text-base md:text-lg">
                  <Swords className="w-5 h-5 text-red-500" />
                  <span className="font-black italic uppercase tracking-wider">Radar de Rivais</span>
                </CardTitle>
                <p className="text-white/30 text-xs">Quem está na frente no Heart Club Census?</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* User's club first */}
                <RivalBar
                  name={clubeName || ""}
                  logo={activeClub?.logoUrl}
                  total={myClubTotal}
                  maxVotes={maxRivalVotes}
                  color={theme.primaryHex}
                  isUser
                />
                {rivalStats.map((rival, i) => {
                  const rivalTheme = getTeamTheme(rival.clube_nome);
                  return (
                    <RivalBar
                      key={i}
                      name={rival.clube_nome}
                      logo={rival.logo}
                      total={rival.total}
                      maxVotes={maxRivalVotes}
                      color={rivalTheme.primaryHex}
                    />
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════ */}
        {/* BUSCA DE CLUBES + COMPARAÇÃO                  */}
        {/* ══════════════════════════════════════════════ */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          <Card className="bg-white/[0.03] border-white/[0.06]">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-white text-base md:text-lg">
                <Search className="w-5 h-5 text-blue-400" />
                <span className="font-black italic uppercase tracking-wider">Comparar com Outro Clube</span>
              </CardTitle>
              <p className="text-white/30 text-xs">Busque qualquer clube e veja como sua torcida se compara.</p>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Digite o nome de um clube..."
                  className="bg-white/[0.05] border-white/10 pl-10 text-white placeholder:text-white/20 rounded-xl"
                />
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-white/10 rounded-xl overflow-hidden z-50 max-h-[260px] overflow-y-auto">
                    {searchResults.map((club) => (
                      <button
                        key={`${club.id}-${club.shortName}`}
                        onMouseDown={(e) => { e.preventDefault(); selectCompareClub(club); }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-white/[0.06] border-b border-white/5 text-left"
                      >
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                          <ClubLogo src={club.logo} alt={club.name} size="sm" />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-white">{club.name}</span>
                          <span className="text-[10px] text-white/40 ml-2">{club.location}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Comparison result */}
              {comparedClub && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-6 p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08]"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold uppercase tracking-widest text-white/40">Comparação Direta</span>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* My club */}
                    <div className="flex-1 text-center">
                      <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: theme.secondaryHex }}>
                        <ClubLogo src={activeClub?.logoUrl} alt={clubeName || ""} className="w-[90%] h-[90%] object-contain rounded-full" />
                      </div>
                      <span className="text-xs font-bold text-white uppercase">{clubeName}</span>
                      <div className="text-2xl font-black italic text-white mt-1">{myClubTotal}</div>
                      <span className="text-[9px] text-white/30 uppercase">torcedores</span>
                    </div>

                    {/* VS */}
                    <div className="flex flex-col items-center">
                      <span className="text-lg font-black italic text-[#ff6200]">VS</span>
                      <div className="w-px h-8 bg-white/10 mt-1" />
                    </div>

                    {/* Compared club */}
                    <div className="flex-1 text-center">
                      <div className="w-14 h-14 mx-auto rounded-full bg-white/10 flex items-center justify-center mb-2">
                        <ClubLogo src={comparedClub.logo} alt={comparedClub.clube_nome} className="w-[90%] h-[90%] object-contain rounded-full" />
                      </div>
                      <span className="text-xs font-bold text-white uppercase">{comparedClub.clube_nome}</span>
                      <div className="text-2xl font-black italic text-white mt-1">{comparedClub.total}</div>
                      <span className="text-[9px] text-white/30 uppercase">torcedores</span>
                    </div>
                  </div>

                  {/* Winner indicator */}
                  {myClubTotal !== comparedClub.total && (
                    <div className="mt-4 text-center">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase" style={{
                        backgroundColor: myClubTotal > comparedClub.total ? `${theme.primaryHex}33` : "rgba(239,68,68,0.15)",
                        color: myClubTotal > comparedClub.total ? theme.primaryHex === "#ffffff" ? "#000" : theme.primaryHex : "#ef4444",
                      }}>
                        <TrendingUp className="w-3 h-3" />
                        {myClubTotal > comparedClub.total
                          ? `${clubeName} lidera por ${myClubTotal - comparedClub.total}`
                          : `${comparedClub.clube_nome} lidera por ${comparedClub.total - myClubTotal}`
                        }
                      </span>
                    </div>
                  )}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* ══════════════════════════════════════════════ */}
        {/* DADOS GEOGRÁFICOS                             */}
        {/* ══════════════════════════════════════════════ */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Top Cities */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}>
            <Card className="bg-white/[0.03] border-white/[0.06] h-full">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-white text-sm md:text-base">
                  <MapPin className="w-4 h-4 text-green-400" />
                  <span className="font-black italic uppercase tracking-wider">Cidades Líderes</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {topCities.length === 0 ? (
                  <p className="text-white/20 text-xs italic">Nenhum dado disponível ainda.</p>
                ) : (
                  topCities.map((city, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs font-black text-white/20 w-5 text-right">{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-bold text-white/80">{city.label}</span>
                          <span className="text-[10px] font-bold text-white/40">{city.count}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(city.count / (topCities[0]?.count || 1)) * 100}%` }}
                            transition={{ delay: 0.7 + i * 0.05, duration: 0.5 }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: theme.primaryHex === "#ffffff" ? "#ff6200" : theme.primaryHex }}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Top States */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}>
            <Card className="bg-white/[0.03] border-white/[0.06] h-full">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-white text-sm md:text-base">
                  <Globe className="w-4 h-4 text-blue-400" />
                  <span className="font-black italic uppercase tracking-wider">Estados Líderes</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {topStates.length === 0 ? (
                  <p className="text-white/20 text-xs italic">Nenhum dado disponível ainda.</p>
                ) : (
                  topStates.map((state, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs font-black text-white/20 w-5 text-right">{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-bold text-white/80">{state.label}</span>
                          <span className="text-[10px] font-bold text-white/40">{state.count}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(state.count / (topStates[0]?.count || 1)) * 100}%` }}
                            transition={{ delay: 0.7 + i * 0.05, duration: 0.5 }}
                            className="h-full rounded-full bg-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Footer spacing */}
        <div className="h-8" />
      </main>
    </div>
  );
};

/* ══════════════════════════════════════════════ */
/* SUB-COMPONENT: RivalBar                        */
/* ══════════════════════════════════════════════ */
const RivalBar = ({
  name, logo, total, maxVotes, color, isUser,
}: {
  name: string; logo?: string; total: number; maxVotes: number; color: string; isUser?: boolean;
}) => {
  const pct = maxVotes > 0 ? (total / maxVotes) * 100 : 0;
  return (
    <div className={`flex items-center gap-3 p-2.5 rounded-xl ${isUser ? "bg-white/[0.06] border border-white/[0.08]" : "hover:bg-white/[0.03]"} transition-all`}>
      <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0">
        <ClubLogo src={logo} alt={name} size="sm" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className={`text-xs font-bold uppercase tracking-wider truncate ${isUser ? "text-white" : "text-white/70"}`}>
            {name}
            {isUser && <Shield className="w-3 h-3 inline ml-1 text-[#ff6200]" />}
          </span>
          <span className="text-xs font-black text-white/50 ml-2">{total}</span>
        </div>
        <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ backgroundColor: color === "#ffffff" ? "#ff6200" : color }}
          />
        </div>
      </div>
    </div>
  );
};

export default Stats;
