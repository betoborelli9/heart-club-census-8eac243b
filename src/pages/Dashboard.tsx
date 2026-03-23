/**
 * ARQUIVO: src/pages/Dashboard.tsx
 * DESIGN: Banner Premium com cores dinâmicas do clube do coração.
 * Layout baseado na referência: Escudo à esquerda, nome do torcedor ao centro,
 * clube do coração à direita com faixas diagonais.
 */

import { useEffect, useMemo, useState } from "react";
import { LogOut, Loader2, MapPin, Trophy, Flame, BarChart3, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { CLUBS_DATA } from "@/clubes-data";
import { ClubLogo } from "@/components/ClubLogo";
import { ClubSearch } from "@/components/dashboard/ClubSearch";
import NewsCarousel from "@/components/dashboard/NewsCarousel";
import { useClubTheme } from "@/hooks/useClubTheme";
import logo from "@/assets/logo.png";

const normalize = (v: string) =>
  v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9\s]/g, " ").trim().toLowerCase();

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading, signOut } = useUser();
  const [activeClub, setActiveClub] = useState<any>(null);
  const [clubeName, setClubeName] = useState<string | null>(null);
  const [queriedTeam, setQueriedTeam] = useState<any>(null);

  // Busca o clube do coração do usuário logado
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
        const clubInfo = CLUBS_DATA.find(
          (c) => normalize(c.nome) === normalize(teamName)
        );
        setActiveClub(clubInfo || { nome: teamName });
      }
    };
    loadData();
  }, [user]);

  // Tema dinâmico baseado no clube do usuário
  const theme = useMemo(() => getTeamTheme(clubeName), [clubeName]);

  if (isLoading || !profile)
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <Loader2 className="animate-spin text-[#ff6200] w-10 h-10" />
      </div>
    );

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      {/* Header */}
      <header className="h-16 border-b border-white/5 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <img src={logo} alt="Logo" className="h-8 md:h-10 w-auto" />
            <span className="font-black italic text-lg tracking-tighter">HEART CLUB</span>
          </div>
          <div className="flex-1 max-w-sm">
            <ClubSearch onSelect={(club) => setQueriedTeam(club)} />
          </div>
          <Button variant="ghost" size="icon" onClick={() => signOut()} className="text-white/50">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-2 md:px-4 py-4 space-y-4">
        {/* ══════════════════════════════════════════════ */}
        {/* BANNER + NAVBAR — Bloco visual único           */}
        {/* ══════════════════════════════════════════════ */}
        <div>
        <section
          className="relative overflow-hidden rounded-t-[2.5rem] rounded-b-none h-[180px] sm:h-[200px] md:h-[240px] shadow-2xl flex items-center"
          style={{ backgroundColor: theme.primaryHex }}
        >
          {/* Faixas diagonais — atrás do nome do clube do coração (lado direito) */}
          <div className="absolute inset-0 pointer-events-none">
            {theme.stripeColors.map((color, ci) => {
              const baseLeft = 50 + ci * 14;
              return (
                <div key={ci}>
                  {/* Faixa fina */}
                  <div
                    className="absolute top-[-30%] h-[160%] rotate-[20deg]"
                    style={{ backgroundColor: color, opacity: 0.4, left: `${baseLeft}%`, width: "4px" }}
                  />
                  {/* Faixa média */}
                  <div
                    className="absolute top-[-30%] h-[160%] rotate-[20deg]"
                    style={{ backgroundColor: color, opacity: 0.25, left: `${baseLeft + 2}%`, width: "14px" }}
                  />
                  {/* Faixa grossa */}
                  <div
                    className="absolute top-[-30%] h-[160%] rotate-[20deg]"
                    style={{ backgroundColor: color, opacity: 0.14, left: `${baseLeft + 5}%`, width: "36px" }}
                  />
                </div>
              );
            })}
          </div>

          {/* Conteúdo do banner */}
          <div className="relative z-10 flex items-center justify-between w-full px-4 sm:px-6 md:px-12">
            {/* ESQUERDA: Escudo + Nome do torcedor */}
            <div className="flex items-center gap-3 sm:gap-4 md:gap-6">
              {/* Círculo do escudo — tamanhos fixos: Mobile 102px, Tablet 134px, Desktop 166px */}
              <div
                className="w-[102px] h-[102px] sm:w-[134px] sm:h-[134px] md:w-[166px] md:h-[166px] rounded-full shadow-lg flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: theme.secondaryHex,
                  boxShadow: `0 0 24px ${theme.glow}`,
                }}
              >
                <ClubLogo
                  src={activeClub?.logoUrl || activeClub?.logo}
                  alt={clubeName || ""}
                  className="w-[98%] h-[98%] object-contain rounded-full"
                />
              </div>

              {/* Info do torcedor */}
              <div className="flex flex-col gap-0.5 sm:gap-1">
                <h2 className={`font-semibold uppercase italic tracking-tight text-sm sm:text-base md:text-lg ${theme.textClass}`}>
                  {profile.nome_exibicao}
                </h2>
                <div className={`flex items-center gap-1 text-[9px] sm:text-[10px] md:text-xs font-medium uppercase tracking-wider opacity-80 ${theme.textClass}`}>
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span>
                    {profile.cidade || activeClub?.cidade}{profile.estado ? `, ${profile.estado}` : ""}
                    {activeClub?.mascote ? ` • Mascote: ${activeClub.mascote.replace(/[^\w\sÀ-ÿ]/g, "").trim()}` : ""}
                  </span>
                </div>
                <span className="flex items-center gap-1 text-[9px] sm:text-[10px] md:text-xs font-bold text-[#ff6200] uppercase italic">
                  <Trophy className="w-3 h-3" /> Embaixador Bronze
                </span>
              </div>
            </div>

            {/* DIREITA: Clube do Coração */}
            <div className="text-right flex flex-col items-end">
              <span className={`text-[8px] sm:text-[9px] md:text-[11px] font-bold uppercase tracking-[0.3em] opacity-60 ${theme.textClass}`}>
                Clube do Coração
              </span>
              <h1 className={`font-black italic uppercase tracking-tight text-xl sm:text-2xl md:text-5xl leading-none mt-1 ${theme.textClass}`}>
                {clubeName}
              </h1>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════ */}
        {/* BARRA DE NAVEGAÇÃO DE MÓDULOS — colada ao banner */}
        {/* ══════════════════════════════════════════════ */}
        <nav className="flex items-center justify-center gap-1 sm:gap-2 bg-[#1a1a1a] border border-white/5 border-t-0 rounded-t-none rounded-b-2xl px-2 sm:px-6 py-2.5 shadow-lg backdrop-blur-md">
          {[
            { label: "MAPA DE CALOR", icon: <Flame className="w-4 h-4" />, path: "/mapa-calor" },
            { label: "ESTATÍSTICAS", icon: <BarChart3 className="w-4 h-4" />, path: "/estatisticas" },
            { label: "RANKING", icon: <Crown className="w-4 h-4" />, path: "/estatisticas#ranking" },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200"
            >
              <span className="text-white/50">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        </div>

        {/* ══════════════════════════════════════════════ */}
        {/* RADAR DE NOTÍCIAS                             */}
        {/* ══════════════════════════════════════════════ */}
        <div className="mt-4">
          <NewsCarousel
            teamName={queriedTeam?.name || clubeName || null}
            clubLogo={activeClub?.logoUrl || activeClub?.logo}
          />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
