/**
 * [CAMINHO/ARQUIVO]: src/pages/Dashboard.tsx
 * [MÓDULO]: DASHBOARD CALEIDOSCÓPIO — REFINAMENTO VISUAL 2.1
 * [ALTERAÇÕES]:
 * - Ajuste fino de paddings e gaps para visual "Clean/High-End".
 * - Otimização da lógica de logo de fallback para evitar "pulos" de layout.
 * - Refinamento da animação fadeIn.
 */

import { useEffect, useState } from "react";
import { LogOut, Loader2, Eye, Heart, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { CLUBS_DATA } from "@/clubes-data";
import { ClubSearch } from "@/components/dashboard/ClubSearch";
import ClubBanner from "@/components/dashboard/ClubBanner";
import { useClubTheme } from "@/hooks/useClubTheme";
import NewsFeedCards from "@/components/dashboard/NewsFeedCards";
import RivalsColumn from "@/components/dashboard/RivalsColumn";
import SympathyCarousel from "@/components/dashboard/SympathyCarousel";
import ObjectivesPanel from "@/components/dashboard/ObjectivesPanel";
import Z4Infographic from "@/components/dashboard/Z4Infographic";
import SocialShareBanners from "@/components/dashboard/SocialShareBanners";
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

  const heartTheme = useClubTheme(heartClubName);
  const viewedTheme = useClubTheme(viewedClubName);

  const handlePickClub = (name: string) => {
    if (name === viewedClubName) return; // Evita re-render desnecessário
    setViewedClubName(name);
    const info = CLUBS_DATA.find((c) => c.nome.toLowerCase() === name.toLowerCase());
    setViewedClubData(info || { nome: name });
    setFadeKey((k) => k + 1);
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
    return () => {
      cancelled = true;
    };
  }, [viewedClubName, viewedClubData]);

  if (isLoading || !profile)
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <Loader2 className="animate-spin text-[#ff6200] w-10 h-10" />
      </div>
    );

  const isViewingHeart = viewedClubName === heartClubName;
  const primary = viewedTheme?.primaryHex || "#ff6200";
  const secondary = viewedTheme?.secondaryHex || "#000000";

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#ff6200]/30">
      <style>{`
        @keyframes fadeInScale { 
          from { opacity: 0; transform: scale(0.99) translateY(8px); } 
          to { opacity: 1; transform: scale(1) translateY(0); } 
        }
        .fade-in { animation: fadeInScale 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .glass-card { background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); }
      `}</style>

      {/* HEADER PREMIUM */}
      <header className="h-16 border-b border-white/5 bg-black/60 backdrop-blur-xl sticky top-0 z-[60]">
        <div className="max-w-[1440px] mx-auto px-6 h-full flex items-center justify-between gap-8">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate("/dashboard")}>
            <div className="p-1.5 bg-gradient-to-br from-[#ff6200] to-[#ff4500] rounded-lg transition-transform group-hover:scale-105">
              <img src={logo} alt="Logo" className="h-6 w-auto" />
            </div>
            <span className="font-black italic text-xl tracking-tighter uppercase group-hover:text-[#ff6200] transition-colors">
              Heart Club
            </span>
          </div>

          <div className="flex-1 max-w-xl">
            <ClubSearch onSelect={(club) => handlePickClub(club.name)} />
          </div>

          <div className="flex items-center gap-4">
            {user?.email === "betoborelli9@gmail.com" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/admin/votos-ficticios")}
                className="hidden md:flex border-[#ff6200]/30 text-[#ff6200] hover:bg-[#ff6200]/10 font-bold italic uppercase text-[10px] tracking-widest"
              >
                🧪 ADMIN
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut()}
              className="text-white/30 hover:text-white hover:bg-white/5 transition-all"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-4 md:px-6 py-6 space-y-6">
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

        {/* GRID PRINCIPAL 3 COLUNAS */}
        <div className="grid grid-cols-1 lg:grid-cols-[26%_44%_30%] gap-6">
          {/* COLUNA 1 — RIVALRY INTELLIGENCE */}
          <aside className="space-y-4">
            <div className="glass-card rounded-3xl p-5 lg:sticky lg:top-24 transition-all">
              <div className="flex items-center gap-2 mb-6 px-1">
                <Trophy className="w-4 h-4 text-[#ff6200]" />
                <h2 className="text-[11px] font-black italic uppercase tracking-[0.2em] text-white/40">
                  Rivalry Intelligence
                </h2>
              </div>
              <RivalsColumn clubName={viewedClubName} refCode={profile.codigo_indicacao} primaryColor={primary} />
            </div>
          </aside>

          {/* COLUNA 2 — CENTRO (SIMPATIAS + NOTÍCIAS) */}
          <section key={`col2-${fadeKey}`} className="fade-in space-y-6 min-w-0">
            <div className="glass-card rounded-3xl p-2 md:p-1 overflow-hidden">
              <SympathyCarousel
                sympathies={sympathies}
                heartClubName={heartClubName}
                viewedClubName={viewedClubName}
                onPick={handlePickClub}
              />
            </div>

            {/* STATUS DE VISUALIZAÇÃO */}
            {!isViewingHeart && viewedClubName && (
              <div className="flex items-center justify-between gap-4 px-4 py-2 bg-[#ff6200]/5 border border-[#ff6200]/10 rounded-2xl">
                <div className="flex items-center gap-3 text-[10px] font-black italic uppercase tracking-[0.15em] text-white/60">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: primary }} />
                  Radar: <span className="text-white">{viewedClubName}</span>
                </div>
                <button
                  onClick={() => heartClubName && handlePickClub(heartClubName)}
                  className="flex items-center gap-2 text-[10px] font-black italic uppercase tracking-tighter text-[#ff6200] hover:brightness-125 transition-all"
                >
                  <Heart className="w-3 h-3 fill-current" /> Voltar ao Coração
                </button>
              </div>
            )}

            <div className="glass-card rounded-3xl p-1 md:p-2 min-h-[600px]">
              <NewsFeedCards teamName={viewedClubName} primaryColor={primary} fallbackLogo={viewedLogo} />
            </div>
          </section>

          {/* COLUNA 3 — DIREITA (CÁLCULO + Z4 + SOCIAL) */}
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

        <div className="h-20" />
      </main>
    </div>
  );
};

export default Dashboard;
