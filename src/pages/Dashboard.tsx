/**
 * [CAMINHO/ARQUIVO]: src/pages/Dashboard.tsx
 * [MÓDULO]: DASHBOARD CALEIDOSCÓPIO — REESTRUTURAÇÃO FINAL 4.0
 * [STATUS]: BLINDAGEM ADMIN, REMOÇÃO DE LOGOS E GARANTIA DE ESCUDOS
 */

import { useEffect, useState } from "react";
import { LogOut, Loader2, Heart, Home, BarChart3, Map, Users, LayoutDashboard, Beaker } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { CLUBS_DATA } from "@/clubes-data";

/* ═══════════════════════════════════════════════════════════
   MÓDULO 1: COMPONENTES DO DASHBOARD
   ═══════════════════════════════════════════════════════════ */
import { ClubSearch } from "@/components/dashboard/ClubSearch";
import ClubBanner from "@/components/dashboard/ClubBanner";
import NewsFeedCards from "@/components/dashboard/NewsFeedCards";
import RivalsColumn from "@/components/dashboard/RivalsColumn";
import SympathyCarousel from "@/components/dashboard/SympathyCarousel";
import ObjectivesPanel from "@/components/dashboard/ObjectivesPanel";
import Z4Infographic from "@/components/dashboard/Z4Infographic";
import SocialShareBanners from "@/components/dashboard/SocialShareBanners";
import ClubIdentityCard from "@/components/dashboard/ClubIdentityCard";

/* ═══════════════════════════════════════════════════════════
   MÓDULO 2: HOOKS E ASSETS
   ═══════════════════════════════════════════════════════════ */
import { useClubTheme } from "@/hooks/useClubTheme";
import logo from "@/assets/logo.png";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading, signOut } = useUser();

  const [heartClubName, setHeartClubName] = useState<string | null>(null);
  const [heartClubData, setHeartClubData] = useState<any>(null);
  const [viewedClubName, setViewedClubName] = useState<string | null>(null);
  const [viewedClubData, setViewedClubData] = useState<any>(null);
  const [sympathies, setSympathies] = useState<string[]>([]);
  const [fadeKey, setFadeKey] = useState(0);
  const [viewedLogo, setViewedLogo] = useState<string | null>(null);

  const isAdmin = user?.email === "betoborelli9@gmail.com";

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
        setSympathies([data.sympathy_1, data.sympathy_2, data.sympathy_3, data.sympathy_4].filter(Boolean) as string[]);
      }
    };
    loadVoto();
  }, [user]);

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
    return () => {
      cancelled = true;
    };
  }, [viewedClubName, viewedClubData]);

  const handlePickClub = (name: string) => {
    if (name === viewedClubName) return;
    setViewedClubName(name);
    const info = CLUBS_DATA.find((c) => c.nome.toLowerCase() === name.toLowerCase());
    setViewedClubData(info || { nome: name });
    setFadeKey((k) => k + 1);
  };

  const viewedTheme = useClubTheme(viewedClubName);
  const heartTheme = useClubTheme(heartClubName);
  const primary = viewedTheme?.primaryHex || "#ff6200";
  const secondary = viewedTheme?.secondaryHex || "#000000";
  const isViewingHeart = viewedClubName === heartClubName;

  if (isLoading || !profile)
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <Loader2 className="animate-spin text-[#ff6200] w-10 h-10" />
      </div>
    );

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#ff6200]/30 overflow-x-hidden">
      <style>{`
        @keyframes fadeInScale { from { opacity: 0; transform: scale(0.99) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .fade-in { animation: fadeInScale 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .glass-card { background: rgba(255, 255, 255, 0.015); border: 1px solid rgba(255, 255, 255, 0.05); }
      `}</style>

      {/* HEADER */}
      <header className="h-16 border-b border-white/5 bg-black/60 backdrop-blur-xl sticky top-0 z-[60]">
        <div className="max-w-[1440px] mx-auto px-6 h-full flex items-center justify-between gap-8">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate("/dashboard")}>
            <img src={logo} alt="Logo" className="h-7 w-auto" />
            <span className="font-black italic text-xl tracking-tighter uppercase">Heart Club</span>
          </div>
          <div className="flex-1 max-w-xl">
            <ClubSearch onSelect={(club) => handlePickClub(club.name)} />
          </div>
          <div className="flex items-center gap-4">
            {/* BOTÃO VOTAÇÃO - EXCLUSIVO ADMIN */}
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/votação")}
                className="border-[#ff6200] text-[#ff6200] hover:bg-[#ff6200] hover:text-white font-black italic uppercase text-[10px]"
              >
                Votação
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => signOut()} className="text-white/30 hover:text-white">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-4 md:px-6 py-6 space-y-6 pb-24">
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

        {heartClubName && <ClubIdentityCard clubName={heartClubName} />}

        <section className="fade-in w-full">
          <div className="glass-card rounded-[32px] p-4 md:p-6">
            <SympathyCarousel
              sympathies={sympathies}
              heartClubName={heartClubName}
              viewedClubName={viewedClubName}
              onPick={handlePickClub}
            />
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-[26%_44%_30%] gap-6">
          <aside className="space-y-4">
            <div className="glass-card rounded-3xl p-5 lg:sticky lg:top-24">
              <RivalsColumn clubName={viewedClubName} refCode={profile.codigo_indicacao} primaryColor={primary} />
            </div>
          </aside>

          <section key={`col2-${fadeKey}`} className="fade-in space-y-6 min-w-0">
            {!isViewingHeart && viewedClubName && (
              <div className="flex items-center justify-between gap-4 px-4 py-3 bg-[#ff6200]/5 border border-[#ff6200]/10 rounded-2xl">
                <div className="flex items-center gap-3 text-[10px] font-black italic uppercase tracking-[0.15em] text-white/60">
                  <div className="w-2 h-2 rounded-full animate-pulse bg-[#ff6200]" />
                  Radar Ativo: <span className="text-white">{viewedClubName}</span>
                </div>
                <button
                  onClick={() => heartClubName && handlePickClub(heartClubName)}
                  className="text-[10px] font-black italic uppercase text-[#ff6200] flex items-center gap-1"
                >
                  <Heart className="w-3 h-3 fill-current" /> Voltar ao Coração
                </button>
              </div>
            )}
            <div className="glass-card rounded-[32px] p-2 min-h-[600px]">
              {/* NEWSFEED - FORÇANDO REMOÇÃO DE LOGOS EXTERNAS */}
              <NewsFeedCards teamName={viewedClubName} primaryColor={primary} />
            </div>
          </section>

          <aside key={`col3-${fadeKey}`} className="fade-in space-y-6 min-w-0">
            <div className="glass-card rounded-3xl p-6 space-y-8">
              <ObjectivesPanel clubName={viewedClubName} clubLogo={viewedLogo} primaryColor={primary} />
              <div className="h-px bg-white/5" />
              <Z4Infographic clubName={viewedClubName} clubLogo={viewedLogo} primaryColor={primary} />
            </div>
            <div className="glass-card rounded-3xl p-6">
              <SocialShareBanners
                clubName={viewedClubName}
                clubLogo={viewedLogo}
                primaryColor={primary}
                secondaryColor={secondary}
              />
            </div>
          </aside>
        </div>
      </main>

      {/* RODAPÉ TAB BAR */}
      <footer className="fixed bottom-0 left-0 right-0 h-16 bg-black/80 backdrop-blur-2xl border-t border-white/5 z-[100] flex items-center justify-center">
        <nav className="flex items-center gap-8 md:gap-16">
          <button className="flex flex-col items-center gap-1 text-[#ff6200]">
            <Home className="w-5 h-5" />
            <span className="text-[9px] font-bold uppercase tracking-widest">Início</span>
          </button>
          <button
            className="flex flex-col items-center gap-1 text-white/40 hover:text-white"
            onClick={() => navigate("/ranking")}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-[9px] font-bold uppercase tracking-widest">Ranking</span>
          </button>
          <button
            className="flex flex-col items-center gap-1 text-white/40 hover:text-white"
            onClick={() => navigate("/mapa-calor")}
          >
            <Map className="w-5 h-5" />
            <span className="text-[9px] font-bold uppercase tracking-widest">Mapa</span>
          </button>
          <button
            className="flex flex-col items-center gap-1 text-white/40 hover:text-white"
            onClick={() => navigate("/embaixadores")}
          >
            <Users className="w-5 h-5" />
            <span className="text-[9px] font-bold uppercase tracking-widest">Embaixadores</span>
          </button>
          {isAdmin && (
            <>
              <button
                className="flex flex-col items-center gap-1 text-white/40 hover:text-white"
                onClick={() => navigate("/painel")}
              >
                <LayoutDashboard className="w-5 h-5" />
                <span className="text-[9px] font-bold uppercase tracking-widest">Painel</span>
              </button>
              <button
                className="flex flex-col items-center gap-1 text-[#ff6200] hover:text-white"
                onClick={() => navigate("/admin/votos-ficticios")}
              >
                <Beaker className="w-5 h-5" />
                <span className="text-[9px] font-bold uppercase tracking-widest">Fictícios</span>
              </button>
            </>
          )}
        </nav>
      </footer>
    </div>
  );
};

export default Dashboard;
