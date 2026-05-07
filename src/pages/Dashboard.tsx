/**
 * [CAMINHO/ARQUIVO]: src/pages/Dashboard.tsx
 * [MÓDULO]: DASHBOARD CALEIDOSCÓPIO — GRID 3 COLUNAS (25/45/30)
 * - Banner do Coração fixo no topo (intocável)
 * - Coluna 1: Rivalry Intelligence
 * - Coluna 2: Caleidoscópio (Simpatias + Notícias)
 * - Coluna 3: Cálculo de Objetivos + Z4 + Compartilhamento Social
 * - Trocar viewedClubName aplica fade-in nas colunas 2 e 3 (col 1 também atualiza, mas o foco é centro/direita)
 */

import { useEffect, useState } from "react";
import { LogOut, Loader2, Eye, Heart } from "lucide-react";
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
  const secondary = viewedTheme?.secondaryHex || "#000000";

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.4s ease-out; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <header className="h-14 border-b border-white/5 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 h-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/dashboard")}>
            <img src={logo} alt="Logo" className="h-7 w-auto" />
            <span className="font-black italic text-base tracking-tighter uppercase">Heart Club</span>
          </div>
          <div className="flex-1 max-w-md">
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

      <main className="max-w-[1400px] mx-auto px-3 md:px-5 py-4 space-y-4">
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

        {/* GRID PRINCIPAL 3 COLUNAS — 25 / 45 / 30 */}
        <div className="grid grid-cols-1 lg:grid-cols-[25%_45%_30%] gap-4">
          {/* COLUNA 1 — RIVALRY INTELLIGENCE */}
          <aside className="lg:pr-2">
            <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-4 lg:sticky lg:top-20">
              <RivalsColumn
                clubName={viewedClubName}
                refCode={profile.codigo_indicacao}
                primaryColor={primary}
              />
            </div>
          </aside>

          {/* COLUNA 2 — CALEIDOSCÓPIO (SIMPATIAS + NOTÍCIAS) */}
          <section key={`col2-${fadeKey}`} className="fade-in space-y-4 min-w-0">
            <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-4">
              <SympathyCarousel
                sympathies={sympathies}
                heartClubName={heartClubName}
                viewedClubName={viewedClubName}
                onPick={handlePickClub}
              />
            </div>

            {/* Indicador de visualização atual (mini) */}
            {!isViewingHeart && viewedClubName && (
              <div className="flex items-center justify-between gap-2 px-2">
                <div className="flex items-center gap-2 text-[10px] font-black italic uppercase tracking-widest text-white/60">
                  <Eye className="w-3 h-3" style={{ color: primary }} />
                  Visualizando: <span className="text-white">{viewedClubName}</span>
                </div>
                <button
                  onClick={() => heartClubName && handlePickClub(heartClubName)}
                  className="flex items-center gap-1 text-[10px] font-black italic uppercase text-white/40 hover:text-white"
                >
                  <Heart className="w-3 h-3" /> Voltar ao Coração
                </button>
              </div>
            )}

            <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-4">
              <NewsFeedCards
                teamName={viewedClubName}
                primaryColor={primary}
                fallbackLogo={viewedLogo}
              />
            </div>
          </section>

          {/* COLUNA 3 — CÁLCULO + Z4 + SOCIAL */}
          <aside key={`col3-${fadeKey}`} className="fade-in space-y-4 min-w-0">
            <ObjectivesPanel
              clubName={viewedClubName}
              clubLogo={viewedLogo}
              primaryColor={primary}
            />
            <Z4Infographic
              clubName={viewedClubName}
              clubLogo={viewedLogo}
              primaryColor={primary}
            />
            <SocialShareBanners
              clubName={viewedClubName}
              clubLogo={viewedLogo}
              primaryColor={primary}
              secondaryColor={secondary}
            />
          </aside>
        </div>

        <div className="h-12" />
      </main>
    </div>
  );
};

export default Dashboard;
