/**
 * [CAMINHO/ARQUIVO]: src/pages/Dashboard.tsx
 * [MÓDULO]: DASHBOARD PRINCIPAL (INTEGRAÇÃO MESTRE)
 * [STATUS]: UNIFICADO (BANNER + NAVBAR + NEWS)
 */

/* [MÓDULO: IMPORTS] */
import { useEffect, useState } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { CLUBS_DATA } from "@/clubes-data";
import { ClubSearch } from "@/components/dashboard/ClubSearch";
import EditorialNews from "@/components/dashboard/EditorialNews";
import RivalsRadar from "@/components/dashboard/RivalsRadar";
import GeoLoyalty from "@/components/dashboard/GeoLoyalty";
import ClubBanner from "@/components/dashboard/ClubBanner";
import ClubIdentityCard from "@/components/dashboard/ClubIdentityCard";
import { useClubTheme } from "@/hooks/useClubTheme";
import AffiliateStore from "@/components/store/AffiliateStore";
import SympathyRanking from "@/components/dashboard/SympathyRanking";
import logo from "@/assets/logo.png";

/* [MÓDULO: COMPONENTE DASHBOARD] */
const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading, signOut } = useUser();
  const [activeClub, setActiveClub] = useState<any>(null);
  const [clubeName, setClubeName] = useState<string | null>(null);
  const [queriedTeam, setQueriedTeam] = useState<any>(null);

  /* [MÓDULO: LÓGICA DE CARREGAMENTO DE VOTO] */
  useEffect(() => {
    const loadVoto = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("votos")
        .select("clube_nome")
        .eq("user_id", user.id)
        .eq("is_original_vote", true)
        .maybeSingle();

      if (data?.clube_nome) {
        setClubeName(data.clube_nome);
        const clubInfo = CLUBS_DATA.find((c) => c.nome.toLowerCase() === data.clube_nome.toLowerCase());
        setActiveClub(clubInfo || { nome: data.clube_nome });
      }
    };
    loadVoto();
  }, [user]);

  /* [MÓDULO: TEMA DINÂMICO] */
  const theme = useClubTheme(clubeName);

  /* [MÓDULO: ESTADO DE LOADING] */
  if (isLoading || !profile)
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <Loader2 className="animate-spin text-[#ff6200] w-10 h-10" />
      </div>
    );

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      {/* [MÓDULO: HEADER DE NAVEGAÇÃO] */}
      <header className="h-16 border-b border-white/5 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/dashboard")}>
            <img src={logo} alt="Logo" className="h-8 md:h-10 w-auto" />
            <span className="font-black italic text-lg tracking-tighter uppercase">Heart Club</span>
          </div>
          <div className="flex-1 max-w-sm">
            <ClubSearch onSelect={(club) => setQueriedTeam(club)} />
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

      {/* [MÓDULO: CONTEÚDO PRINCIPAL] */}
      <main className="max-w-6xl mx-auto px-2 md:px-4 py-6 space-y-0">
        {/* [MÓDULO: BANNER MESTRE IMUTÁVEL — NÃO ALTERAR] */}
        <ClubBanner
          clubName={clubeName || "SELECIONE SEU CLUBE"}
          clubData={activeClub}
          theme={theme}
          profileName={profile.nome_exibicao || "TORCEDOR"}
          profileCity={profile.cidade || "BRASIL"}
          profileState={profile.estado || ""}
          ambassadorLevel={profile.nivel_embaixador || "BRONZE"}
          showProfileInfo={true}
        />

        {/* [MÓDULO: IDENTIDADE DO CLUBE — NÃO ALTERAR] */}
        {clubeName && <ClubIdentityCard clubName={clubeName} />}

        {/* [MÓDULO: FEED EDITORIAL — radar de notícias clean] */}
        <div className="pt-14 md:pt-20">
          <EditorialNews
            teamName={queriedTeam?.name || clubeName || null}
            primaryColor={theme?.primaryHex || "#ff6200"}
          />
        </div>

        {/* [MÓDULO: INTELIGÊNCIA — Rivais + Geografia] */}
        <div className="pt-16 md:pt-24 grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16">
          <RivalsRadar excludeClub={clubeName} />
          <GeoLoyalty clubName={clubeName} />
        </div>

        {/* [MÓDULO: RANKING DE SIMPATIA — segundo time mais querido] */}
        <div className="pt-16 md:pt-24">
          <SympathyRanking />
        </div>

        {/* [MÓDULO: LOJA DO TORCEDOR — Marketplace de Afiliados dinâmico] */}
        <div className="pt-16 md:pt-24">
          <AffiliateStore />
        </div>

        {/* [MÓDULO: RESPIRO INFERIOR] */}
        <div className="h-24" />
      </main>
    </div>
  );
};

export default Dashboard;

/**
 * [RODAPÉ TÉCNICO]
 * ARQUIVO: src/pages/Dashboard.tsx
 * MÓDULO: DASHBOARD PRINCIPAL
 * VERIFICAÇÃO: Build sincronizado com ClubBanner v2.0.
 */
