// Path: src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { LogOut, Loader2, MapPin, Trophy, Globe, Users, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { CLUBS_DATA } from "@/clubes-data";
import { ClubLogo } from "@/components/ClubLogo";
import { ClubSearch } from "@/components/dashboard/ClubSearch";
import NewsCarousel from "@/components/dashboard/NewsCarousel";
import CensusDuel from "@/components/dashboard/CensusDuel";
import AmbassadorHierarchy from "@/components/dashboard/AmbassadorHierarchy";
import logo from "@/assets/logo.png";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading, signOut } = useUser();
  const [heartTeam, setHeartTeam] = useState<any>(null);
  const [queriedTeam, setQueriedTeam] = useState<any>(null);

  useEffect(() => {
    const loadInitial = async () => {
      if (!user) return;
      const { data } = await supabase.from("votos").select("clube_nome").eq("user_id", user.id).maybeSingle();
      const teamName = data?.clube_nome || "Vila Nova";
      setHeartTeam(CLUBS_DATA.find(c => c.nome === teamName));
    };
    loadInitial();
  }, [user]);

  if (isLoading || !profile) return <div className="h-screen flex items-center justify-center bg-black"><Loader2 className="animate-spin text-white" /></div>;

  return (
    <div className="min-h-screen bg-[#020202] text-white">
      <header className="h-20 border-b border-white/5 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between gap-6">
          <div className="flex items-center gap-4 shrink-0 cursor-pointer h-full py-2" onClick={() => navigate("/")}>
            <img src={logo} alt="Heart Club" className="h-full w-auto object-contain scale-150" />
            <span className="font-black italic text-2xl tracking-tighter hidden xl:block ml-4 text-white">HEART CLUB</span>
          </div>
          <div className="flex-1 max-w-sm relative z-[1200]">
            <ClubSearch onSelect={(club) => {
              console.log("DASHBOARD RECEBEU:", club.name);
              setQueriedTeam(club);
            }} />
          </div>
          <Button variant="ghost" size="icon" onClick={() => signOut()} className="hover:text-red-500"><LogOut className="w-6 h-6" /></Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* BARRA DO TIME DO CORAÇÃO - VISUAL QUE VOCÊ GOSTA */}
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0A0A0A] shadow-2xl">
          <div className="absolute inset-y-0 left-0 w-1.5 bg-[#E21A21]" />
          <div className="relative z-10 px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-8">
              <div className="w-24 h-24 rounded-full bg-black flex items-center justify-center shadow-2xl border border-white/5 shrink-0">
                 <ClubLogo src={heartTeam?.logoUrl} alt={heartTeam?.nome} size="lg" />
              </div>
              <div className="text-left">
                <h1 className="text-4xl font-black uppercase italic tracking-tighter leading-none mb-2">{profile.nome_exibicao}</h1>
                <div className="flex flex-col gap-1">
                  <span className="text-zinc-400 font-bold uppercase text-[10px] tracking-widest">
                    <MapPin className="inline w-3 h-3 mr-1 text-red-600" /> 
                    {profile.cidade || "GOIÂNIA"}, GO, BRASIL • 🐾 {heartTeam?.mascote || "TIGRE"}
                  </span>
                  <span className="text-yellow-500 font-black uppercase text-[10px] tracking-widest flex items-center gap-1">
                    <Trophy className="w-3 h-3" /> EMBAIXADOR BRONZE
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-600 mb-1">Coração</p>
              <h2 className="text-5xl font-black italic uppercase leading-none text-[#E21A21]">{heartTeam?.nome || "VILA NOVA"}</h2>
            </div>
          </div>
        </section>

        {/* LINKS VITRIFICADOS */}
        <section className="relative z-20 border border-white/10 bg-black/90 backdrop-blur-3xl px-10 py-4 flex items-center gap-8 rounded-b-3xl shadow-xl">
          <Link to="#" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-red-600" /> Mapa Nacional
          </Link>
          <Link to="#" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-red-600" /> Ranking Geral
          </Link>
          <Link to="#" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white flex items-center gap-2">
            <Gift className="w-4 h-4 text-red-600" /> Benefícios
          </Link>
        </section>

        {/* A BARRA DO INTRUSO - SLIM, ELEGANTE E FUNCIONAL */}
        {queriedTeam && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-red-600/20 bg-zinc-950/80 p-5 flex items-center justify-between shadow-2xl animate-in fade-in slide-in-from-top duration-500">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-white rounded-full p-2 flex items-center justify-center shadow-lg">
                 <ClubLogo src={queriedTeam.logo} alt={queriedTeam.name} size="sm" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Consultando Agora:</span>
                <h3 className="text-2xl font-black italic uppercase text-white leading-none">
                  {queriedTeam.name} <span className="text-[10px] text-zinc-600 not-italic ml-2">{queriedTeam.location} • {queriedTeam.mascote}</span>
                </h3>
              </div>
            </div>
            <button onClick={() => setQueriedTeam(null)} className="bg-red-600/10 hover:bg-red-600/20 text-red-500 text-[10px] font-black px-4 py-2 rounded-full transition-colors">
              FECHAR X
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mt-10">
          <div className="lg:col-span-8">
            <NewsCarousel teamName={queriedTeam?.name || heartTeam?.nome || "Vila Nova"} />
          </div>
          <div className="lg:col-span-4 space-y-10">
            <CensusDuel />
            <AmbassadorHierarchy />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;