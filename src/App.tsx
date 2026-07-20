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
import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UserProvider } from "@/contexts/UserContext";
import FeedbackWidget from "@/components/FeedbackWidget";
import InstallAppButton from "@/components/InstallAppButton";
import AppNavBar from "@/components/AppNavBar";
import GlobalFooter from "@/components/GlobalFooter";
import UsersTableSync from "@/integrations/users-table/UsersTableSync";
import { useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

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
    Carregadas sob demanda (code-splitting por rota) para reduzir
    o tamanho do pacote inicial.
   ═══════════════════════════════════════════════════════════ */
const Splash = lazy(() => import("./pages/Splash"));
const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const Verify = lazy(() => import("./pages/Verify")); // Nova página do Guardião
const ProfileSetup = lazy(() => import("./pages/ProfileSetup"));
const Voting = lazy(() => import("./pages/Voting"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const MapaCalor = lazy(() => import("./pages/MapaCalor"));
const Stats = lazy(() => import("./pages/Stats"));
const Ambassadors = lazy(() => import("./pages/Ambassadors"));
const AmbassadorCenter = lazy(() => import("./pages/AmbassadorCenter"));
const Correcao = lazy(() => import("./pages/Correcao"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Convite = lazy(() => import("./pages/Convite"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const PrivacyManagement = lazy(() => import("./pages/PrivacyManagement"));
const NotificationSettings = lazy(() => import("./pages/NotificationSettings"));

/* ═══════════════════════════════════════════════════════════
    MÓDULO: PÁGINAS (ADMIN & BI)
   ═══════════════════════════════════════════════════════════ */
const Admin = lazy(() => import("./pages/Admin"));
const DebugApi = lazy(() => import("./pages/DebugApi"));
const AdminIngestion = lazy(() => import("./pages/AdminIngestion"));
const ClubColors = lazy(() => import("./pages/Admin/ClubColors"));
const ClubFeminino = lazy(() => import("./pages/Admin/ClubFeminino"));
const GlobalBI = lazy(() => import("./pages/Admin/GlobalBI"));
const VotosFicticios = lazy(() => import("./pages/VotosFicticios"));
const MasterProfile = lazy(() => import("./pages/MasterProfile"));
const MasterVotesAdmin = lazy(() => import("./pages/MasterVotesAdmin"));

const queryClient = new QueryClient();

/* ═══════════════════════════════════════════════════════════
    MÓDULO: COMPONENTE PRINCIPAL (ROUTES)
   ═══════════════════════════════════════════════════════════ */
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <UserProvider>
        <UsersTableSync />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense
            fallback={
              <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
              </div>
            }
          >
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
            <Route path="/notificacoes" element={<NotificationSettings />} />

            {/* 👑 Gestão Administrativa e BI */}
            <Route path="/admin" element={<Admin />} />
            <Route path="/debug-api" element={<DebugApi />} />
            <Route path="/admin-ingestion" element={<AdminIngestion />} />
            <Route path="/admin/cores" element={<ClubColors />} />
            <Route path="/admin/feminino" element={<ClubFeminino />} />
            <Route path="/admin/global" element={<GlobalBI />} />
            <Route path="/admin/votos-ficticios" element={<VotosFicticios />} />
            <Route path="/master/perfil" element={<MasterProfile />} />
            <Route path="/master/votos" element={<MasterVotesAdmin />} />

            {/* Tratamento de Erros */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          <FeedbackWidget />
          <InstallAppButton />
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