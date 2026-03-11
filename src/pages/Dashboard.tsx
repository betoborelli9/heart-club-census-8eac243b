// Path: src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { LogOut, Loader2, MapPin, Trophy, Flame, BarChart3, Medal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { CLUBS_DATA } from "@/clubes-data";
import { ClubLogo } from "@/components/ClubLogo";
import { ClubSearch } from "@/components/dashboard/ClubSearch";
import NewsCarousel from "@/components/dashboard/NewsCarousel";
import logo from "@/assets/logo.png";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading, signOut } = useUser();
  const [heartTeam, setHeartTeam] = useState<any>(null);
  const [queriedTeam, setQueriedTeam] = useState<any>(null);
  
  // Cores iniciais padrão (Vila Nova)
  const [colors, setColors] = useState({ 
    primary: "#E21A21", 
    secondary: "#FFFFFF" 
  });

  // --- BLOCO 1: LÓGICA DE CARREGAMENTO E CORES DINÂMICAS ---
  useEffect(() => {
    const loadInitial = async () => {
      if (!user) return;
      const { data } = await supabase.from("votos").select("clube_nome").eq("user_id", user.id).maybeSingle();
      const teamName = data?.clube_nome || "Vila Nova";
      const clubInfo = CLUBS_DATA.find(c => c.nome === teamName);
      setHeartTeam(clubInfo);
      
      // Lógica de cores por clube para as faixas elegantes
      if (teamName.includes("Vila Nova")) {
        setColors({ primary: "#E21A21", secondary: "#FFFFFF" });
      } else if (teamName.includes("Flamengo")) {
        setColors({ primary: "#E21A21", secondary: "#000000" });
      } else if (teamName.includes("Palmeiras")) {
        setColors({ primary: "#006437", secondary: "#FFFFFF" });
      } else if (teamName.includes("Sampaio Corrêa")) {
        setColors({ primary: "#ffc107", secondary: "#198754" }); // Amarelo com faixa verde/vermelha
      } else if (teamName.includes("São Paulo")) {
        setColors({ primary: "#FFFFFF", secondary: "#E21A21" }); // Branco com faixa vermelha/preta
      } else {
        setColors({ 
          primary: clubInfo?.cor_principal || "#E21A21", 
          secondary: "#FFFFFF" 
        });
      }
    };
    loadInitial();
  }, [user]);

  if (isLoading || !profile) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <Loader2 className="animate-spin text-white w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020202] text-white selection:bg-red-600">
      
      {/* --- MÓDULO: CABEÇALHO --- */}
      <header className="h-16 md:h-20 border-b border-white/5 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between gap-6">
          <div className="flex items-center gap-4 shrink-0 cursor-pointer" onClick={() => navigate("/")}>
            <img src={logo} alt="Heart Club" className="h-10 md:h-14 w-auto object-contain" />
            <span className="font-black italic text-sm md:text-2xl tracking-tighter hidden sm:block">HEART CLUB</span>
          </div>
          
          <div className="flex-1 max-w-sm relative z-50">
            <ClubSearch onSelect={(club) => setQueriedTeam(club)} />
          </div>

          <Button variant="ghost" size="icon" onClick={() => signOut()} className="hover:text-red-500 shrink-0">
            <LogOut className="w-6 h-6" />
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-2 md:px-4 py-4">
        
        {/* --- MÓDULO: BANNER COM FAIXAS ELEGANTES --- */}
        <section 
          className="relative overflow-hidden rounded-t-3xl border border-white/10 h-[220px] md:h-[280px] landscape:h-[180px] transition-colors duration-700" 
          style={{ backgroundColor: colors.primary }}
        >
          {/* FAIXAS DIAGONAIS DINÂMICAS */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Faixa mais larga */}
            <div 
              className="absolute top-[-50%] right-[8%] w-[60px] md:w-[120px] h-[200%] rotate-[25deg] opacity-20 transition-all duration-700"
              style={{ backgroundColor: colors.secondary }}
            />
            {/* Faixa mais fina */}
            <div 
              className="absolute top-[-50%] right-[18%] w-[10px] md:w-[20px] h-[200%] rotate-[25deg] opacity-40 transition-all duration-700"
              style={{ backgroundColor: colors.secondary }}
            />
          </div>

          <div className="relative z-10 h-full px-4 md:px-12 flex items-center justify-between">
            <div className="flex items-center gap-5 md:gap-10 min-w-0 flex-1">
              
              {/* EMBLEMA (PREENCHIMENTO TOTAL) */}
              <div className="w-32 h-32 md:w-56 md:h-56 rounded-full bg-white flex items-center justify-center shadow-2xl border-4 border-black/10 overflow-hidden shrink-0 transition-transform duration-500 hover:scale-105">
                <div className="w-full h-full flex items-center justify-center">
                  <ClubLogo 
                    src={heartTeam?.logoUrl} 
                    alt={heartTeam?.nome} 
                    size="lg" 
                    className="w-[100%] h-[100%] object-contain p-1" 
                  />
                </div>
              </div>
              
              {/* INFOS DO USUÁRIO (NOME RESPONSIVO) */}
              <div className="text-white min-w-0 flex-1">
                <h1 className="font-black uppercase italic tracking-tighter leading-none mb-3 drop-shadow-xl text-wrap break-words text-2xl sm:text-3xl md:text-5xl lg:text-6xl">
                  {profile.nome_exibicao}
                </h1>
                <div className="flex flex-col gap-1.5 font-medium uppercase text-[10px] md:text-sm tracking-widest text-white/90">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" /> {profile.cidade || "CIDADE"}, {profile.estado || "UF"} • {heartTeam?.mascote || "MASCOTE"}
                  </span>
                  <span className="flex items-center gap-1.5 text-yellow-300 font-bold">
                    <Trophy className="w-4 h-4" /> EMBAIXADOR BRONZE
                  </span>
                </div>
              </div>
            </div>

            {/* NOME DO CLUBE (DIREITA) */}
            <div className="text-right hidden lg:block pr-6 shrink-0">
              <p className="text-[12px] font-black uppercase tracking-[0.6em] text-white/60 mb-1">Clube do Coração</p>
              <h2 className="text-4xl md:text-7xl font-black italic uppercase leading-none drop-shadow-2xl">
                {heartTeam?.nome || "VILA NOVA"}
              </h2>
            </div>
          </div>
        </section>

        {/* --- MÓDULO: BARRA DE LINKS --- */}
        <section className="relative z-20 -mt-px border border-white/10 rounded-b-3xl overflow-hidden shadow-2xl bg-black/95">
          <div className="relative px-4 md:px-12 py-4 md:py-6 flex items-center justify-around md:justify-start gap-4 md:gap-12 overflow-x-auto no-scrollbar">
            <Link to="#" className="flex flex-col md:flex-row items-center gap-2 text-[10px] md:text-sm font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all min-w-max">
              <Flame className="w-6 h-6 text-red-600" /> MAPA DE CALOR
            </Link>
            <Link to="#" className="flex flex-col md:flex-row items-center gap-2 text-[10px] md:text-sm font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all min-w-max">
              <BarChart3 className="w-6 h-6 text-red-600" /> ESTATÍSTICAS
            </Link>
            <Link to="#" className="flex flex-col md:flex-row items-center gap-2 text-[10px] md:text-sm font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-all min-w-max">
              <Medal className="w-6 h-6 text-red-600" /> RANKING
            </Link>
          </div>
        </section>

        {/* --- MÓDULO: BARRA DO INTRUSO --- */}
        {queriedTeam && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/60 p-5 flex items-center justify-between shadow-2xl animate-in fade-in slide-in-from-top duration-500">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-white rounded-full p-2 flex items-center justify-center">
                 <ClubLogo src={queriedTeam.logo} alt={queriedTeam.name} size="sm" />
              </div>
              <div>
                <span className="text-[12px] font-black uppercase tracking-widest text-zinc-500">Consultando:</span>
                <h3 className="text-2xl md:text-3xl font-black italic uppercase text-white leading-none">{queriedTeam.name}</h3>
              </div>
            </div>
            <button onClick={() => setQueriedTeam(null)} className="text-red-500 text-[12px] font-black uppercase hover:underline">Fechar X</button>
          </div>
        )}

        {/* --- MÓDULO: CARROSSEL DE NOTÍCIAS --- */}
        <div className="mt-10">
          <NewsCarousel teamName={queriedTeam?.name || heartTeam?.nome || "Vila Nova"} />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;