/**
 * [CAMINHO/ARQUIVO]: src/pages/Dashboard.tsx
 * [MÓDULO]: DASHBOARD CALEIDOSCÓPIO
 * - Banner do Coração fixo no topo (intocável)
 * - Demais blocos dinâmicos via viewedClub (clube de simpatia ou pesquisado)
 * - Heatmap removido daqui (continua disponível em /mapa-calor)
 */

import { useEffect, useMemo, useState } from "react";
import { LogOut, Loader2, Eye, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { CLUBS_DATA } from "@/clubes-data";
import { ClubSearch } from "@/components/dashboard/ClubSearch";
import ClubBanner from "@/components/dashboard/ClubBanner";
import ClubIdentityCard from "@/components/dashboard/ClubIdentityCard";
import { useClubTheme } from "@/hooks/useClubTheme";
import AffiliateStore from "@/components/store/AffiliateStore";
import SympathyRanking from "@/components/dashboard/SympathyRanking";
import NewsFeedCards from "@/components/dashboard/NewsFeedCards";
import LeagueObjectives from "@/components/dashboard/LeagueObjectives";
import RivalsBlock from "@/components/dashboard/RivalsBlock";
import MatchSchedule from "@/components/dashboard/MatchSchedule";
import BannerFactory from "@/components/dashboard/BannerFactory";
import logo from "@/assets/logo.png";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading, signOut } = useUser();

  // Clube do coração (fixo)
  const [heartClubName, setHeartClubName] = useState<string | null>(null);
  const [heartClubData, setHeartClubData] = useState<any>(null);

  // Clube em visualização (caleidoscópio)
  const [viewedClubName, setViewedClubName] = useState<string | null>(null);
  const [viewedClubData, setViewedClubData] = useState<any>(null);
  const [sympathies, setSympathies] = useState<string[]>([]);

  useEffect(() => {
    const loadVoto = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("votos")
        .select("clube_nome, sympathy_1, sympathy_2, sympathy_3, sympathy_4")
        .eq("user_id", user.id)
        .eq("is_original_vote", true)
        .maybeSingle();

      if (data?.clube_nome) {
        setHeartClubName(data.clube_nome);
        const info = CLUBS_DATA.find((c) => c.nome.toLowerCase() === data.clube_nome.toLowerCase());
        setHeartClubData(info || { nome: data.clube_nome });
        setViewedClubName(data.clube_nome);
        setViewedClubData(info || { nome: data.clube_nome });
        setSympathies(
          [data.sympathy_1, data.sympathy_2, data.sympathy_3, data.sympathy_4].filter(Boolean) as string[],
        );
      }
    };
    loadVoto();
  }, [user]);

  const heartTheme = useClubTheme(heartClubName);
  const viewedTheme = useClubTheme(viewedClubName);

  const handlePickClub = (name: string) => {
    setViewedClubName(name);
    const info = CLUBS_DATA.find((c) => c.nome.toLowerCase() === name.toLowerCase());
    setViewedClubData(info || { nome: name });
  };

  const [viewedLogo, setViewedLogo] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const fetchLogo = async () => {
      if (!viewedClubName) {
        setViewedLogo(null);
        return;
      }
      const local = (viewedClubData as any)?.logoUrl;
      if (local) {
        setViewedLogo(local);
        return;
      }
      const { data } = await supabase
        .from("clubes_cache")
        .select("escudo_url")
        .ilike("nome", viewedClubName)
        .maybeSingle();
      if (!cancelled) setViewedLogo(data?.escudo_url || null);
    };
    fetchLogo();
    return () => { cancelled = true; };
  }, [viewedClubName, viewedClubData]);

  if (isLoading || !profile)
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <Loader2 className="animate-spin text-[#ff6200] w-10 h-10" />
      </div>
    );

  const isViewingHeart = viewedClubName === heartClubName;
  const primary = viewedTheme?.primaryHex || "#ff6200";

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <header className="h-16 border-b border-white/5 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/dashboard")}>
            <img src={logo} alt="Logo" className="h-8 md:h-10 w-auto" />
            <span className="font-black italic text-lg tracking-tighter uppercase">Heart Club</span>
          </div>
          <div className="flex-1 max-w-sm">
            <ClubSearch onSelect={(club) => handlePickClub(club.name)} />
          </div>
          {user?.email === "betoborelli9@gmail.com" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/admin/votos-ficticios")}
              className="border-[#ff6200]/50 text-[#ff6200] hover:bg-[#ff6200]/10 font-black italic uppercase text-xs"
            >
              🧪 Votos Fictícios
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => signOut()} className="text-white/50 hover:text-white">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-2 md:px-4 py-6 space-y-0">
        {/* BANNER MESTRE — SEMPRE DO CORAÇÃO */}
        <ClubBanner
          clubName={heartClubName || "SELECIONE SEU CLUBE"}
          clubData={heartClubData}
          theme={heartTheme}
          profileName={profile.nome_exibicao || "TORCEDOR"}
          profileCity={profile.cidade || "BRASIL"}
          profileState={profile.estado || ""}
          ambassadorLevel={profile.nivel_embaixador || "BRONZE"}
          showProfileInfo={true}
        />

        {/* SELETOR DE SIMPATIAS / VOLTAR AO CORAÇÃO */}
        {(sympathies.length > 0 || !isViewingHeart) && (
          <div className="px-2 md:px-4 mt-6 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase italic tracking-widest text-white/40">Visualizando:</span>
            <button
              onClick={() => heartClubName && handlePickClub(heartClubName)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black italic uppercase transition-all ${
                isViewingHeart ? "bg-[#ff6200] text-black" : "bg-white/5 text-white/60 hover:text-white"
              }`}
            >
              <Heart className="w-3 h-3" /> {heartClubName || "Coração"}
            </button>
            {sympathies.map((s) => (
              <button
                key={s}
                onClick={() => handlePickClub(s)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black italic uppercase transition-all ${
                  viewedClubName === s ? "bg-[#ff6200] text-black" : "bg-white/5 text-white/60 hover:text-white"
                }`}
              >
                <Eye className="w-3 h-3" /> {s}
              </button>
            ))}
          </div>
        )}

        {/* IDENTIDADE DO CLUBE EM VISUALIZAÇÃO */}
        {viewedClubName && (
          <div className="pt-6">
            <ClubIdentityCard clubName={viewedClubName} />
          </div>
        )}

        {/* NOTÍCIAS COM IMAGENS */}
        <div className="pt-12 md:pt-16">
          <NewsFeedCards
            teamName={viewedClubName}
            primaryColor={primary}
            fallbackLogo={viewedLogo}
          />
        </div>

        {/* OBJETIVOS / RIVAIS */}
        <div className="pt-12 md:pt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
          <LeagueObjectives clubName={viewedClubName} primaryColor={primary} />
          <RivalsBlock
            clubName={viewedClubName}
            refCode={profile.codigo_indicacao}
            primaryColor={primary}
          />
        </div>

        {/* CALENDÁRIO */}
        <div className="pt-12 md:pt-16">
          <MatchSchedule clubName={viewedClubName} primaryColor={primary} />
        </div>

        {/* FÁBRICA DE BANNERS */}
        <div className="pt-12 md:pt-16">
          <BannerFactory
            clubName={viewedClubName}
            clubLogo={viewedLogo}
            primaryColor={primary}
            secondaryColor={viewedTheme?.secondaryHex || "#000000"}
          />
        </div>

        {/* RANKING DE SIMPATIA */}
        <div className="pt-12 md:pt-16">
          <SympathyRanking />
        </div>

        {/* LOJA */}
        <div className="pt-12 md:pt-16">
          <AffiliateStore />
        </div>

        <div className="h-24" />
      </main>
    </div>
  );
};

export default Dashboard;
