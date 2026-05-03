/**
 * ═══════════════════════════════════════════════════════════════════
 * [CAMINHO]: src/App.tsx
 * [MÓDULO]: CORE - ROUTING SYSTEM
 * [STATUS]: PRODUÇÃO — VERSÃO 2.4 (ADMIN GLOBAL BI INTEGRATION)
 * [DESCRIÇÃO]:
 * Centralização de rotas do Heart Club.
 * Adicionada a rota /admin/global para o monitoramento mundial.
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

/* ═══════════════════════════════════════════════════════════
    MÓDULO: PÁGINAS (USER & PUBLIC)
   ═══════════════════════════════════════════════════════════ */
import Splash from "./pages/Splash";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import ProfileSetup from "./pages/ProfileSetup";
import Voting from "./pages/Voting";
import Dashboard from "./pages/Dashboard";
import MapaCalor from "./pages/MapaCalor";
import Stats from "./pages/Stats";
import Ambassadors from "./pages/Ambassadors";
import Correcao from "./pages/Correcao";
import NotFound from "./pages/NotFound";
import Convite from "./pages/Convite";

/* ═══════════════════════════════════════════════════════════
    MÓDULO: PÁGINAS (ADMIN & BI)
   ═══════════════════════════════════════════════════════════ */
import Admin from "./pages/Admin";
import DebugApi from "./pages/DebugApi";
import AdminIngestion from "./pages/AdminIngestion";
import ClubColors from "./pages/Admin/ClubColors";
import ClubFeminino from "./pages/Admin/ClubFeminino";
import GlobalBI from "./pages/Admin/GlobalBI"; // Rota Master Beto Borelli
import VotosFicticios from "./pages/VotosFicticios"; // Rota Master — Geração de votos para teste

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
            <Route path="/profile-setup" element={<ProfileSetup />} />

            {/* Experiência do Torcedor */}
            <Route path="/voting" element={<Voting />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/mapa-calor" element={<MapaCalor />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/estatisticas" element={<Stats />} />
            <Route path="/ranking" element={<Stats />} />
            <Route path="/embaixadores" element={<Ambassadors />} />
            <Route path="/correcao" element={<Correcao />} />
            <Route path="/convite" element={<Convite />} />

            {/* 👑 Gestão Administrativa e BI */}
            <Route path="/admin" element={<Admin />} />
            <Route path="/debug-api" element={<DebugApi />} />
            <Route path="/admin-ingestion" element={<AdminIngestion />} />
            <Route path="/admin/cores" element={<ClubColors />} />
            <Route path="/admin/feminino" element={<ClubFeminino />} />
            <Route path="/admin/global" element={<GlobalBI />} />
            <Route path="/admin/votos-ficticios" element={<VotosFicticios />} />

            {/* Tratamento de Erros */}
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <FeedbackWidget />
        </BrowserRouter>
      </UserProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

/**
 * ═══════════════════════════════════════════════════════════════════
 * [RODAPÉ TÉCNICO]
 * - Rota /admin/global integrada com sucesso.
 * - Preservada a duplicidade proposital de /stats e /estatisticas.
 * - Mantida a hierarquia de Ingestion e ClubColors original.
 * ═══════════════════════════════════════════════════════════════════
 */
