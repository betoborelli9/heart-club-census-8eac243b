/**
 * ═══════════════════════════════════════════════════════════════════
 * [CAMINHO]: src/App.tsx
 * [MÓDULO]: CORE - ROUTING SYSTEM
 * [STATUS]: PRODUÇÃO — VERSÃO 2.5 (GUARDIAO AUTH INTEGRATION)
 * [DESCRIÇÃO]:
 * Centralização de rotas do Heart Club.
 * Adicionada a rota /verify para validação de tokens do Guardião.
 * ═══════════════════════════════════════════════════════════════════
 */

/* ═══════════════════════════════════════════════════════════
    MÓDULO: IMPORTS (CORE & UI)
   ═══════════════════════════════════════════════════════════ */
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UserProvider } from "@/contexts/UserContext";
import FeedbackWidget from "@/components/FeedbackWidget";
import AppNavBar from "@/components/AppNavBar";
import GlobalFooter from "@/components/GlobalFooter";
import { useLocation } from "react-router-dom";

// Inclusão do Verify no HIDE_NAV para não mostrar barra de navegação durante o login
const HIDE_NAV_ROUTES = ["/", "/splash", "/login", "/profile-setup", "/voting", "/convite", "/verify"];
const GlobalNav = () => {
  const { pathname } = useLocation();
  if (HIDE_NAV_ROUTES.includes(pathname)) return null;
  if (pathname.startsWith("/admin") || pathname.startsWith("/debug")) return null;
  return <AppNavBar />;
};

/* ═══════════════════════════════════════════════════════════
    MÓDULO: PÁGINAS (USER & PUBLIC)
   ═══════════════════════════════════════════════════════════ */
import Splash from "./pages/Splash";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Verify from "./pages/Verify"; // Nova página do Guardião
import ProfileSetup from "./pages/ProfileSetup";
import Voting from "./pages/Voting";
import Dashboard from "./pages/Dashboard";
import MapaCalor from "./pages/MapaCalor";
import Stats from "./pages/Stats";
import Ambassadors from "./pages/Ambassadors";
import AmbassadorCenter from "./pages/AmbassadorCenter";
import Correcao from "./pages/Correcao";
import NotFound from "./pages/NotFound";
import Convite from "./pages/Convite";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import PrivacyManagement from "./pages/PrivacyManagement";

/* ═══════════════════════════════════════════════════════════
    MÓDULO: PÁGINAS (ADMIN & BI)
   ═══════════════════════════════════════════════════════════ */
import Admin from "./pages/Admin";
import DebugApi from "./pages/DebugApi";
import AdminIngestion from "./pages/AdminIngestion";
import ClubColors from "./pages/Admin/ClubColors";
import ClubFeminino from "./pages/Admin/ClubFeminino";
import GlobalBI from "./pages/Admin/GlobalBI"; 
import VotosFicticios from "./pages/VotosFicticios"; 
import MasterProfile from "./pages/MasterProfile";

const queryClient = new QueryClient();

/* ═══════════════════════════════════════════════════════════
    MÓDULO: COMPONENTE PRINCIPAL (ROUTES)
   ═══════════════════════════════════════════════════════════ */
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <UserProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Fluxo Inicial e Auth */}
            <Route path="/" element={<Landing />} />
            <Route path="/splash" element={<Splash />} />
            <Route path="/login" element={<Login />} />
            <Route path="/verify" element={<Verify />} />
            <Route path="/profile-setup" element={<ProfileSetup />} />

            {/* Experiência do Torcedor */}
            <Route path="/voting" element={<Voting />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/mapa-calor" element={<MapaCalor />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/estatisticas" element={<Stats />} />
            <Route path="/ranking" element={<Stats />} />
            <Route path="/embaixadores" element={<Ambassadors />} />
            <Route path="/embaixador" element={<AmbassadorCenter />} />
            <Route path="/painel-embaixador" element={<AmbassadorCenter />} />
            <Route path="/correcao" element={<Correcao />} />
            <Route path="/convite" element={<Convite />} />

            {/* LGPD — Privacidade e Termos (públicos) */}
            <Route path="/privacidade" element={<Privacy />} />
            <Route path="/termos" element={<Terms />} />
            <Route path="/gerenciar-dados" element={<PrivacyManagement />} />

            {/* 👑 Gestão Administrativa e BI */}
            <Route path="/admin" element={<Admin />} />
            <Route path="/debug-api" element={<DebugApi />} />
            <Route path="/admin-ingestion" element={<AdminIngestion />} />
            <Route path="/admin/cores" element={<ClubColors />} />
            <Route path="/admin/feminino" element={<ClubFeminino />} />
            <Route path="/admin/global" element={<GlobalBI />} />
            <Route path="/admin/votos-ficticios" element={<VotosFicticios />} />
            <Route path="/master/perfil" element={<MasterProfile />} />

            {/* Tratamento de Erros */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <FeedbackWidget />
          <GlobalNav />
          <GlobalFooter />
        </BrowserRouter>
      </UserProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

/**
 * ═══════════════════════════════════════════════════════════════════
 * [RODAPÉ TÉCNICO]
 * - Rota /verify adicionada para suporte ao Magic Link próprio.
 * - Página Verify incluída no HIDE_NAV_ROUTES para consistência visual.
 * - Preservada a estrutura Master de Admin e BI do Beto Borelli.
 * ═══════════════════════════════════════════════════════════════════
 */