/**
 * =========================================
 * 📁 Caminho: src/pages/Stats.tsx
 * 🧠 Módulo: War Room de Estatísticas — Inteligência Geográfica Universal
 * 🔥 Versão: V27 - 2026-05-03 BRT (Borelli Evolution)
 *
 * 🚀 MELHORIAS IMPLEMENTADAS:
 * - Comparação direta entre clubes (Duelo Global)
 * - Clique ativo na busca com carregamento real
 * - Indicador de domínio territorial
 * - Mensagem dinâmica (hype emocional)
 * - Estética refinada (gradientes + profundidade)
 * - Estrutura modular organizada
 * =========================================
 */

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, LogOut, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { CLUBS_DATA } from "@/clubes-data";
import { useClubTheme } from "@/hooks/useClubTheme";
import { searchClubsWithFallback } from "@/lib/search-clubs";

/**
 * =========================================
 * 🧩 MÓDULO: CONFIGURAÇÃO GLOBAL
 * =========================================
 */

const PARTNER_MASTER: { logoUrl: string; name: string } | null = null;

/**
 * =========================================
 * 🧠 MÓDULO: FALLBACK UNIVERSAL DE ESCUDOS
 * =========================================
 */

const getUniversalLogo = (clubName: string | null): string => {
  if (!clubName) return "";

  const localClub = CLUBS_DATA.find((c) => c.nome.toLowerCase() === clubName.toLowerCase());

  if (localClub?.logoUrl) return localClub.logoUrl;

  const cleanName = clubName.toLowerCase().replace("f.c.", "").replace("futebol clube", "").trim().replace(/\s+/g, "");

  return `https://logo.clearbit.com/${cleanName}.com.br`;
};

/**
 * =========================================
 * 🧩 TIPAGENS
 * =========================================
 */

type RegionRow = { region: string; votes: number };
type ClubRankRow = { club: string; votes: number };

/**
 * =========================================
 * 🧠 COMPONENTES AUXILIARES
 * =========================================
 */

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
    <motion.div className="fixed inset-0 flex items-center justify-center bg-black z-[9999]">
      <img src={PARTNER_MASTER.logoUrl} className="h-24" />
    </motion.div>
  );
};

/**
 * =========================================
 * 🧠 PÁGINA PRINCIPAL
 * =========================================
 */

const Stats = () => {
  const navigate = useNavigate();
  const { user } = useUser();

  const [clubName, setClubName] = useState<string | null>(null);
  const [regionRows, setRegionRows] = useState<RegionRow[]>([]);
  const [topClubs, setTopClubs] = useState<ClubRankRow[]>([]);
  const [globalTotal, setGlobalTotal] = useState(0);
  const [globalSympathy, setGlobalSympathy] = useState(0);

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [comparedClub, setComparedClub] = useState<any>(null);
  const [comparedVotes, setComparedVotes] = useState(0);

  /**
   * =========================================
   * 🧠 MÓDULO: FRASE DINÂMICA
   * =========================================
   */

  const hypeMessage = useMemo(() => {
    if (globalTotal > 1000000) return "Seu clube é uma potência global.";
    if (globalTotal > 100000) return "Seu clube está dominando o cenário.";
    if (globalTotal > 10000) return "Seu clube está crescendo forte.";
    return "Seu clube ainda está conquistando o mundo.";
  }, [globalTotal]);

  /**
   * =========================================
   * 🔄 CARREGAMENTO DE DADOS
   * =========================================
   */

  useEffect(() => {
    if (!user) return;

    (async () => {
      const { data } = await supabase.from("votos").select("clube_nome").eq("user_id", user.id).maybeSingle();

      setClubName(data?.clube_nome);
    })();
  }, [user]);

  useEffect(() => {
    if (!clubName) return;

    (async () => {
      const { data: summary } = await supabase.rpc("get_club_vote_summary", { p_club_name: clubName });

      const { data: ranking } = await supabase.rpc("get_heatmap_data", { p_club_name: clubName, p_level: "country" });

      const { data: top } = await supabase.rpc("get_top_clubs_by_region", { p_level: "country", p_limit: 10 });

      setGlobalTotal(Number((summary as any)?.total_votes) || 0);
      setGlobalSympathy(Number((summary as any)?.sympathizers) || 0);

      setRegionRows(
        (ranking as any[])?.map((r) => ({
          region: r.region,
          votes: Number(r.votes),
        })) || [],
      );

      setTopClubs(
        (top as any[])?.map((t) => ({
          club: t.club,
          votes: Number(t.votes),
        })) || [],
      );
    })();
  }, [clubName]);

  /**
   * =========================================
   * 🔍 BUSCA
   * =========================================
   */

  useEffect(() => {
    if (search.length < 3) return;

    setIsSearching(true);

    const t = setTimeout(async () => {
      const results = await searchClubsWithFallback(search, 10);
      setSearchResults(results);
      setIsSearching(false);
    }, 400);

    return () => clearTimeout(t);
  }, [search]);

  /**
   * =========================================
   * 🎨 RENDER
   * =========================================
   */

  return (
    <div className="min-h-screen bg-black text-white">
      <AnimatePresence>
        <PartnerSplash onDone={() => {}} />
      </AnimatePresence>

      {/* HEADER */}
      <header className="sticky top-0 p-4 bg-black/90 border-b border-white/10">
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <img src={getUniversalLogo(clubName)} className="h-12 w-12 rounded-full bg-white p-1" />
            <div>
              <p className="text-xs text-primary">WAR ROOM</p>
              <h1 className="font-black text-xl">{clubName}</h1>
            </div>
          </div>

          <Button onClick={() => navigate("/dashboard")}>
            <LogOut />
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-6">
        {/* HYPE */}
        <p className="text-center text-white/60 italic">{hypeMessage}</p>

        {/* CARDS */}
        <section className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-zinc-950 to-black p-6 rounded-2xl">
            <p>Corações Globais</p>
            <h2 className="text-4xl font-black text-primary">{globalTotal.toLocaleString()}</h2>
          </div>

          <div className="bg-gradient-to-br from-zinc-950 to-black p-6 rounded-2xl">
            <p>Simpatias</p>
            <h2 className="text-4xl font-black text-primary">{globalSympathy.toLocaleString()}</h2>
          </div>
        </section>

        {/* DOMÍNIO */}
        <section className="bg-green-500/5 border border-green-500/20 p-6 rounded-2xl">
          <h2 className="text-green-400 font-black">Domínio Territorial</h2>
          <p className="text-2xl font-black">{regionRows.filter((r) => r.votes > 100).length} regiões dominadas</p>
        </section>

        {/* COMPARAÇÃO */}
        {comparedClub && (
          <section className="bg-zinc-950 p-6 rounded-2xl">
            <h2 className="mb-4">Duelo Global</h2>

            <div className="grid grid-cols-3 text-center">
              <div>
                <img src={getUniversalLogo(clubName)} className="h-16 mx-auto" />
                <p>{clubName}</p>
                <p>{globalTotal}</p>
              </div>

              <div className="flex items-center justify-center">VS</div>

              <div>
                <img src={getUniversalLogo(comparedClub.name)} className="h-16 mx-auto" />
                <p>{comparedClub.name}</p>
                <p>{comparedVotes}</p>
              </div>
            </div>
          </section>
        )}

        {/* BUSCA */}
        <section className="bg-zinc-950 p-6 rounded-2xl">
          <div className="relative">
            <Search className="absolute left-3 top-3" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>

          {isSearching && <Loader2 className="animate-spin mx-auto mt-4" />}

          <div className="mt-4 space-y-2">
            {searchResults.map((c, i) => (
              <div
                key={i}
                onClick={async () => {
                  setComparedClub(c);

                  const { data } = await supabase.rpc("get_club_vote_summary", { p_club_name: c.name });

                  setComparedVotes(Number((data as any)?.total_votes) || 0);
                }}
                className="flex gap-3 p-3 bg-white/5 rounded cursor-pointer"
              >
                <img src={getUniversalLogo(c.name)} className="h-10 w-10 bg-white rounded-full p-1" />
                <span>{c.name}</span>
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
 * =========================================
 * 📌 RODAPÉ TÉCNICO
 * =========================================
 *
 * - Página transformada em experiência interativa
 * - Sistema de comparação ativado
 * - Indicadores emocionais implementados
 * - Estrutura modular limpa
 * - Pronto para evolução (real-time, ranking global real)
 *
 * 🔥 Beto Borelli Signature Build
 * =========================================
 */
