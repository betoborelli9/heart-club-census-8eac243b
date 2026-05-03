import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminAuditTable from "@/components/admin/AdminAuditTable";
import AdminBIStats from "@/components/admin/AdminBIStats";
import AdminCorrectionsTable from "@/components/admin/AdminCorrectionsTable";
import NeighborhoodDominance from "@/components/admin/NeighborhoodDominance";
import SocioeconomicProfile from "@/components/admin/SocioeconomicProfile";
import AffinityEcosystem from "@/components/admin/AffinityEcosystem";
import PressReleaseGenerator from "@/components/admin/PressReleaseGenerator";
import RevenueTerminal from "@/components/admin/RevenueTerminal";
import BehavioralAudit from "@/components/admin/BehavioralAudit";
import FanaticCities from "@/components/ambassador/FanaticCities";
import ExecutiveReportButton from "@/components/admin/ExecutiveReportButton";
import logo from "@/assets/logo.png";

const Admin = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading } = useUser();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate("/login");
      return;
    }
    // Check admin role from profile
    if (profile?.role === "admin") {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
  }, [user, profile, isLoading, navigate]);

  if (isLoading || isAdmin === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-4">
        <div className="glass-card rounded-2xl p-12 text-center max-w-md">
          <ShieldAlert className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-black text-foreground mb-2">Acesso Restrito</h1>
          <p className="text-muted-foreground mb-6">
            Este painel é exclusivo para administradores do Heart Club.
          </p>
          <Button onClick={() => navigate("/dashboard")} className="btn-orange-gradient">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="h-9 w-9 object-contain" />
            <span className="text-lg font-black italic">HEART CLUB</span>
            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ExecutiveReportButton days={30} />
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Tabs defaultValue="audit" className="w-full">
          <TabsList className="bg-card border border-border mb-8 h-12">
            <TabsTrigger value="audit" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              🔍 Auditoria de Votos
            </TabsTrigger>
            <TabsTrigger value="bi" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              📊 BI & Estatísticas
            </TabsTrigger>
            <TabsTrigger value="neighborhoods" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              🗺️ Bairros
            </TabsTrigger>
            <TabsTrigger value="socio" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              💼 Perfil Socioeconômico
            </TabsTrigger>
            <TabsTrigger value="affinity" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              🕸️ Afinidades
            </TabsTrigger>
            <TabsTrigger value="revenue" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              💵 ROI Terminal
            </TabsTrigger>
            <TabsTrigger value="press" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              📰 Imprensa
            </TabsTrigger>
            <TabsTrigger value="behavior" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black">
              ⚠ Auditoria Comportamental
            </TabsTrigger>
            <TabsTrigger value="corrections" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              📝 Correções
            </TabsTrigger>
          </TabsList>

          <TabsContent value="audit">
            <AdminAuditTable />
          </TabsContent>

          <TabsContent value="bi">
            <AdminBIStats />
          </TabsContent>

          <TabsContent value="neighborhoods">
            <NeighborhoodDominance />
          </TabsContent>

          <TabsContent value="socio">
            <SocioeconomicProfile />
          </TabsContent>

          <TabsContent value="affinity">
            <AffinityEcosystem />
          </TabsContent>

          <TabsContent value="revenue">
            <RevenueTerminal days={30} />
          </TabsContent>

          <TabsContent value="press">
            <PressReleaseGenerator />
          </TabsContent>

          <TabsContent value="behavior">
            <BehavioralAudit />
          </TabsContent>

          <TabsContent value="corrections">
            <AdminCorrectionsTable />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
