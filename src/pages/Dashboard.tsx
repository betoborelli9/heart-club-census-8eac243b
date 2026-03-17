/**
 * ARQUIVO: src/pages/Dashboard.tsx
 * DESIGN: Banner Premium com tipografia flutuante e linhas dinâmicas.
 */

//////////////////////////////
// MÓDULO 1 — Imports e Setup
//////////////////////////////
import { useEffect, useMemo, useState } from "react";
import { LogOut, Loader2, MapPin, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { CLUBS_DATA } from "@/clubes-data";
import { ClubLogo } from "@/components/ClubLogo";
import { ClubSearch } from "@/components/dashboard/ClubSearch";
import NewsCarousel from "@/components/dashboard/NewsCarousel";
import logo from "@/assets/logo.png";

const normalize = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .trim()
    .toLowerCase();

//////////////////////////////
// MÓDULO 2 — Componente Principal
//////////////////////////////
const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading, signOut } = useUser();
  const [activeClub, setActiveClub] = useState<any>(null);
  const [clubeName, setClubeName] = useState<string | null>(null);
  const [queriedTeam, setQueriedTeam] = useState<any>(null);

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

//////////////////////////////
// MÓDULO 3 — Estilo Dinâmico por Clube
//////////////////////////////
  const teamStyle = useMemo(() => {
    const name = normalize(clubeName || "");
    let config = { bg: "#1a1a1a", colors: ["#ffffff", "#333333"], text: "text-white" };

    if (name.includes("palmeiras"))
      config = { bg: "#006437", colors: ["#ffffff", "#006437"], text: "text-white" };
    else if (name.includes("sao paulo"))
      config = { bg: "#ffffff", colors: ["#C1272D", "#000000"], text: "text-black" };
    else if (name.includes("flamengo"))
      config = { bg: "#C1272D", colors: ["#000000", "#C1272D"], text: "text-white" };
    else if (name.includes("internacional"))
      config = { bg: "#E20E0E", colors: ["#ffffff", "#E20E0E"], text: "text-white" };
    else if (name.includes("sampaio correa"))
      config = { bg: "#FFD700", colors: ["#C1272D", "#006400"], text: "text-black" };

    return config;
  }, [clubeName]);

//////////////////////////////
// MÓDULO 4 — Renderização
//////////////////////////////
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
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <img src={logo} alt="Logo" className="h-8 md:h-10 w-auto" />
            <span className="font-black italic text-lg tracking-tighter">
              HEART CLUB
            </span>
          </div>
          <div className="flex-1 max-w-sm">
            <ClubSearch onSelect={(club) => setQueriedTeam(club)} />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => signOut()}
            className="text-white/50"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

//////////////////////////////
// MÓDULO 5 — Banner Premium Corrigido
//////////////////////////////
      <main className="max-w-6xl mx-auto px-2 md:px-4 py-4 space-y-4">
        <section
          className="relative overflow-hidden rounded-[2.5rem] h-[200px] md:h-[240px] shadow-2xl flex items-center"
          style={{ backgroundColor: teamStyle.bg }}
        >
          {/* Três faixas diagonais elegantes */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[-20%] left-[10%] w-[6px] h-[140%] rotate-[22deg] bg-current opacity-40" style={{ color: teamStyle.colors[0] }} />
            <div className="absolute top-[-20%] left-[18%] w-[14px] h-[140%] rotate-[22deg] bg-current opacity-25" style={{ color: teamStyle.colors[1] }} />
            <div className="absolute top-[-20%] left-[26%] w-[28px] h-[140%] rotate-[22deg] bg-current opacity-15" style={{ color: teamStyle.colors[0] }} />
          </div>

          {/* Conteúdo da faixa */}
          <div className="relative z-10 flex items-center justify-between w-full px-6 md:px-12">
            {/* Emblema + nome do clube */}
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-white shadow-lg flex items-center justify-center p-1">
                <ClubLogo
                  src={activeClub?.logoUrl || activeClub?.logo}
                  alt={clubeName || ""}
                  className="w-[98%] h-[98%] object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-xs md:text-sm font-bold uppercase opacity-70">
                  Clube do Coração
                </span>
                <h1
                  className={`font-black italic uppercase tracking-tight text-2xl md:text-4xl ${teamStyle.text}`}
                >
                  {clubeName}
                </h1>
              </div>
            </div>

            {/* Nome do usuário e status */}
            <div className="text-right">
              <h2
                className={`font-black uppercase italic tracking-tight text-xl md:text-3xl ${teamStyle.text}`}
              >
                {profile.nome_exibicao}
              </h2>
              <div className="flex flex-col items-end text-[10px] md:text-xs font-bold uppercase tracking-widest opacity-70 italic">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {profile.cidade}, {profile.estado}
                </span>
                <span className="flex items-center gap-1 text-[#ff6200]">
                  <Trophy className="w-3 h-3" /> Embaixador Bronze
                </span>
              </div>
            </div>
          </div>
        </section>

//////////////////////////////
// MÓDULO 6 — Notícias
//////////////////////////////
        <div className="mt-8">
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
