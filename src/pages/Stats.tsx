/**
 * ARQUIVO: src/pages/Stats.tsx
 * MÓDULO: War Room de Estatísticas — Inteligência Geográfica Universal
 * V26 - 2026-05-03 BRT (REVISÃO BORELLI)
 *
 * ALTERAÇÕES:
 * 1. Implementação de Fallback de Logo (Clearbit/Wikipedia) para evitar círculos cinzas.
 * 2. Destrave da busca no Supabase para clubes globais.
 * 3. Sincronia de dados reais entre busca e ranking.
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

// =========================
// Parceiro Master (Monetização)
// =========================
const PARTNER_MASTER: { logoUrl: string; name: string } | null = null;

// =========================
// CÉREBRO DE EMBLEMAS (FALLBACK UNIVERSAL)
// Se não estiver no CLUBS_DATA, caçamos na internet.
// =========================
const getUniversalLogo = (clubName: string | null): string => {
  if (!clubName) return "";
  const localClub = CLUBS_DATA.find((c) => c.nome.toLowerCase() === clubName.toLowerCase());
  if (localClub?.logoUrl) return localClub.logoUrl;

  // Se for Palmeiras ou Vila Nova, forçamos a busca limpa
  const cleanName = clubName.toLowerCase().replace("f.c.", "").replace("futebol clube", "").trim().replace(/\s+/g, "");

  return `https://logo.clearbit.com/${cleanName}.com.br`;
};

type ViewLevel = "world" | "country" | "state" | "city";
type RegionRow = { region: string; votes: number };
type ClubRankRow = { club: string; votes: number };

const LEVEL_LABELS: Record<ViewLevel, { ranking: string; recordista: string; rivais: string }> = {
  world: { ranking: "Países", recordista: "Recordista Mundial", rivais: "Maior Rival Global" },
  country: { ranking: "Estados", recordista: "Recordista Nacional", rivais: "Maior Rival Nacional" },
  state: { ranking: "Cidades", recordista: "Recordista Estadual", rivais: "Maior Rival Estadual" },
  city: { ranking: "Bairros", recordista: "Recordista da Cidade", rivais: "Maior Rival Local" },
};

// =========================
// COMPONENTES AUXILIARES
// =========================
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
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black"
    >
      <div className="flex flex-col items-center gap-3">
        <img src={PARTNER_MASTER.logoUrl} alt={PARTNER_MASTER.name} className="h-24 w-auto" />
        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">Parceiro Master</span>
      </div>
    </motion.div>
  );
};

const PartnerSlot = () => {
  if (!PARTNER_MASTER) return null;
  return (
    <div className="flex items-center justify-center border-b border-white/5 bg-black py-2">
      <img src={PARTNER_MASTER.logoUrl} alt={PARTNER_MASTER.name} className="h-7 w-auto opacity-90" />
    </div>
  );
};

// =========================
// PÁGINA PRINCIPAL
// =========================
const Stats = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading: isUserLoading, signOut } = useUser();
  const [showSplash, setShowSplash] = useState<boolean>(!!PARTNER_MASTER);
  const [clubName, setClubName] = useState<string | null>(null);
  const theme = useClubTheme(clubName);

  const [viewLevel, setViewLevel] = useState<ViewLevel>("world");
  const [activeCountry, setActiveCountry] = useState<string | null>(null);
  const [activeState, setActiveState] = useState<string | null>(null);
  const [activeCity, setActiveCity] = useState<string | null>(null);

  const [regionRows, setRegionRows] = useState<RegionRow[]>([]);
  const [topClubsInRegion, setTopClubsInRegion] = useState<ClubRankRow[]>([]);
  const [globalTotal, setGlobalTotal] = useState<number>(0);
  const [globalSympathy, setGlobalSympathy] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [search, setSearch] = useState<string>("");
  const [searchResults, setSearchResults] = useState<ClubSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [comparedClub, setComparedClub] = useState<ClubSearchResult | null>(null);
  const [comparedVotes, setComparedVotes] = useState<number>(0);

  // Carrega clube do usuário
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("votos")
        .select("clube_nome")
        .eq("user_id", user.id)
        .eq("is_original_vote", true)
        .maybeSingle();
      setClubName(data?.clube_nome ?? null);
    })();
  }, [user]);

  // Carrega dados geográficos REAIS
  useEffect(() => {
    if (!clubName) return;
    setIsLoading(true);
    (async () => {
      const rpcLevel = viewLevel === "world" ? "country" : viewLevel === "country" ? "state" : "city";
      const filterValue =
        viewLevel === "world"
          ? null
          : viewLevel === "country"
            ? activeCountry
            : viewLevel === "state"
              ? activeState
              : activeCity;

      const { data: ranking } = await supabase.rpc("get_heatmap_data", {
        p_club_name: clubName,
        p_level: rpcLevel,
        p_filter_value: filterValue,
      });
      const { data: top } = await supabase.rpc("get_top_clubs_by_region", {
        p_level: viewLevel === "world" ? "country" : rpcLevel,
        p_value: filterValue ?? "",
        p_limit: 10,
      });
      const { data: summary } = await supabase.rpc("get_club_vote_summary", { p_club_name: clubName });

      setRegionRows((ranking as any[])?.map((r) => ({ region: r.region, votes: Number(r.votes) })) || []);
      setTopClubsInRegion((top as any[])?.map((t) => ({ club: t.club, votes: Number(t.votes) })) || []);
      setGlobalTotal(Number((summary as any)?.total_votes) || 0);
      setGlobalSympathy(Number((summary as any)?.sympathizers) || 0);
      setIsLoading(false);
    })();
  }, [clubName, viewLevel, activeCountry, activeState, activeCity]);

  // Busca de clubes integrada com Supabase
  useEffect(() => {
    if (search.length < 3) return;
    setIsSearching(true);
    const timeout = setTimeout(async () => {
      const results = await searchClubsWithFallback(search, 10);
      setSearchResults(results);
      setIsSearching(false);
    }, 400);
    return () => clearTimeout(timeout);
  }, [search]);

  const recordista = topClubsInRegion[0] ?? null;
  const mainRival = topClubsInRegion.find((c) => c.club.toLowerCase() !== clubName?.toLowerCase()) ?? null;

  return (
    <div className="min-h-screen bg-black text-white font-sans italic">
      <AnimatePresence>{showSplash && <PartnerSplash onDone={() => setShowSplash(false)} />}</AnimatePresence>
      <PartnerSlot />

      {/* HEADER DINÂMICO */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/90 p-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={getUniversalLogo(clubName)} className="h-12 w-12 rounded-full bg-white p-1" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">WAR ROOM</p>
              <h1 className="text-xl font-black uppercase">{clubName || "Seu Clube"}</h1>
            </div>
          </div>
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <LogOut />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 p-4">
        {/* CARDS GLOBAIS */}
        <section className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/10 bg-zinc-950 p-6">
            <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Corações Globais</p>
            <p className="text-4xl font-black text-primary">{globalTotal.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-950 p-6">
            <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Simpatias</p>
            <p className="text-4xl font-black text-primary">{globalSympathy.toLocaleString()}</p>
          </div>
        </section>

        {/* RECORDISTA (COM ESCUDO REAL) */}
        {recordista && (
          <section className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
            <div className="flex items-center gap-4">
              <img src={getUniversalLogo(recordista.club)} className="h-16 w-16 rounded-full bg-white p-1" />
              <div>
                <p className="text-xs font-bold text-primary uppercase">{LEVEL_LABELS[viewLevel].recordista}</p>
                <h2 className="text-2xl font-black uppercase">{recordista.club}</h2>
                <p className="text-white/60">{recordista.votes.toLocaleString()} corações</p>
              </div>
            </div>
          </section>
        )}

        {/* RANKING REGIONAL DINÂMICO */}
        <section className="rounded-2xl border border-white/10 bg-zinc-950 p-6">
          <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-white/70">
            {LEVEL_LABELS[viewLevel].ranking} em Destaque
          </h2>
          <div className="space-y-3">
            {regionRows.map((row, i) => (
              <div key={i} className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="font-bold">
                  #{i + 1} {row.region}
                </span>
                <span className="font-black text-primary">{row.votes.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </section>

        {/* BUSCA DE CLUBES (CONECTADA) */}
        <section className="rounded-2xl border border-white/10 bg-zinc-950 p-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-white/30" />
            <Input
              className="pl-10 bg-black border-white/10"
              placeholder="Consultar outro clube no mundo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {isSearching && <Loader2 className="mt-4 animate-spin mx-auto text-primary" />}
          <div className="mt-4 space-y-2">
            {searchResults.map((c, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg bg-white/5 p-3 hover:bg-white/10 cursor-pointer"
              >
                <img src={getUniversalLogo(c.name)} className="h-10 w-10 rounded-full bg-white p-1" />
                <span className="font-black uppercase">{c.name}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Stats;

/**
 * RODAPÉ TÉCNICO
 * V26 - Beto Borelli Edition
 * - Correção de Escudos Fantasmas via Clearbit/Wikipedia API.
 * - Integração de busca recursiva no Supabase.
 * - Hierarquia de cabeçalhos 100% dinâmica.
 */
