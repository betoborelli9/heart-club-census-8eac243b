/**
 * ═══════════════════════════════════════════════════════════════════
 * [CAMINHO]: src/pages/Admin/GlobalBI.tsx
 * [MÓDULO]: ADMIN - GLOBAL BUSINESS INTELLIGENCE
 * [STATUS]: PRODUÇÃO — VERSÃO 2.3 (MODULARIZADO & REAL-TIME)
 * [DESCRIÇÃO]:
 * Dashboard Master de monitoramento global em tempo real.
 * - Organização modular por blocos de lógica e visualização.
 * - Integração total com Supabase Realtime para auditoria de votos.
 * - Mapa de calor dinâmico com representação geográfica.
 * ═══════════════════════════════════════════════════════════════════
 */

/* ═══════════════════════════════════════════════════════════
    MÓDULO 1: IMPORTS (CORE, UI & ICONS)
   ═══════════════════════════════════════════════════════════ */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Globe,
  ShieldAlert,
  Zap,
  Users,
  BarChart3,
  Map as MapIcon,
  Crown,
  RefreshCcw,
  FileText,
  Send,
  UserCheck,
  ShieldCheck,
  MapPin,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

/* ═══════════════════════════════════════════════════════════
    MÓDULO 2: COMPONENTES AUXILIARES VISUAIS (WORLD MAP)
   ═══════════════════════════════════════════════════════════ */
const WorldMap = ({ votes }: { votes: any[] }) => {
  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* SVG do Mapa Mundial (Representação Visual War Room) */}
      <svg viewBox="0 0 1000 500" className="w-full h-full opacity-20 fill-white/10 stroke-white/5">
        <path d="M150,150 L180,150 L200,180 L150,220 Z M400,100 L450,120 L440,180 L380,160 Z M600,300 L680,320 L650,400 L580,380 Z M800,100 L850,150 L820,200 L780,180 Z" />
      </svg>

      {/* Pontos de Votos (Animação de Ping Baseada em Real-time) */}
      <div className="absolute inset-0">
        {votes.slice(0, 15).map((vote) => {
          // Dispersão visual baseada no hash do ID (Simulação enquanto não usamos Lat/Lng reais)
          const x = (parseInt(vote.id?.slice(0, 2) || "0", 16) % 80) + 10;
          const y = (parseInt(vote.id?.slice(2, 4) || "0", 16) % 60) + 20;

          return (
            <div key={vote.id} className="absolute group" style={{ left: `${x}%`, top: `${y}%` }}>
              <div className="relative">
                <div className="absolute -inset-2 bg-orange-500 rounded-full animate-ping opacity-75" />
                <div className="w-2 h-2 bg-orange-500 rounded-full shadow-[0_0_10px_#f97316]" />

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/90 border border-white/10 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                  <p className="text-[10px] font-black uppercase italic text-orange-500">{vote.clube_nome}</p>
                  <p className="text-[8px] text-white/60 uppercase">
                    {vote.voto_cidade}, {vote.voto_pais}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
    MÓDULO 3: COMPONENTE PRINCIPAL (LÓGICA E ESTADO)
   ═══════════════════════════════════════════════════════════ */
const GlobalBI = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useUser();
  const [votes, setVotes] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalGlobal: 0,
    paisesAtivos: 0,
    votosResidentes: 0,
    fraudesBloqueadas: 0,
  });
  const [isLive, setIsLive] = useState(true);

  // 3.1: SEGURANÇA MASTER (Bloqueio estrito Beto Borelli)
  useEffect(() => {
    if (!isLoading && user?.email !== "betoborelli9@gmail.com") {
      navigate("/dashboard");
      toast.error("Acesso negado. Área restrita ao Administrador Master.");
    }
  }, [user, isLoading, navigate]);

  // 3.2: SINCRONIZAÇÃO DE DADOS (Carga Inicial + Real-time)
  useEffect(() => {
    if (!user || user.email !== "betoborelli9@gmail.com") return;

    const fetchInitialData = async () => {
      const { data, error } = await supabase
        .from("votos")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (!error && data) {
        setVotes(data);
        calculateStats(data);
      }
    };

    fetchInitialData();

    const channel = supabase
      .channel("votos-global-audit")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "votos" }, (payload) => {
        setVotes((prev) => [payload.new, ...prev].slice(0, 50));
        setStats((prev) => ({ ...prev, totalGlobal: prev.totalGlobal + 1 }));
        toast.info(`Novo voto: ${payload.new.clube_nome}`, {
          description: `${payload.new.voto_cidade}, ${payload.new.voto_pais}`,
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // 3.3: PROCESSAMENTO DE MÉTRICAS (Auditoria)
  const calculateStats = (data: any[]) => {
    const countries = new Set(data.map((v) => v.voto_pais)).size;
    const residents = data.filter((v) => v.is_residente).length;

    setStats({
      totalGlobal: data.length,
      paisesAtivos: countries,
      votosResidentes: residents,
      fraudesBloqueadas: 0,
    });
  };

  if (isLoading)
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <RefreshCcw className="animate-spin text-orange-500" size={40} />
      </div>
    );

  /* ═══════════════════════════════════════════════════════════
      MÓDULO 4: RENDERIZAÇÃO DA INTERFACE (JSX)
     ═══════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-orange-500/30">
      {/* 4.1: TOP BAR (CONTROL TOWER) */}
      <header className="h-20 border-b border-white/5 bg-black/60 backdrop-blur-3xl sticky top-0 z-[100] flex items-center px-8 justify-between">
        <div className="flex items-center gap-4">
          <img src={logo} alt="Heart Club" className="h-10 w-10 object-contain" />
          <div className="h-8 w-[1px] bg-white/10 mx-2" />
          <div>
            <h1 className="text-xl font-black italic uppercase tracking-tighter leading-none text-white">
              Global Intelligence
            </h1>
            <p className="text-[9px] font-bold text-cyan-400 uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
              <Activity size={10} className="animate-pulse" />
              {isLive ? "Live Feed Active" : "Stream Paused"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/admin")}
            className="font-black italic text-xs opacity-50 hover:opacity-100 text-white"
          >
            PAINEL ADMIN
          </Button>
          <div className="h-10 w-10 rounded-full border border-orange-500/20 flex items-center justify-center overflow-hidden bg-white/5">
            <img src={logo} className="w-full h-full object-cover grayscale opacity-50" alt="Beto Borelli" />
          </div>
        </div>
      </header>

      <main className="p-8 max-w-[1600px] mx-auto">
        {/* 4.2: METRICS GRID (AUDIT DATA) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Votos Auditados"
            value={stats.totalGlobal}
            sub="Carga Global"
            icon={ShieldCheck}
            color="text-cyan-500"
          />
          <StatCard
            title="Alcance Mundial"
            value={stats.paisesAtivos}
            sub="Países Detectados"
            icon={Globe}
            color="text-orange-500"
          />
          <StatCard
            title="Fidelidade Local"
            value={stats.votosResidentes}
            sub="Residentes Confirmados"
            icon={UserCheck}
            color="text-green-500"
          />
          <StatCard
            title="Alerta de Fraude"
            value={stats.fraudesBloqueadas}
            sub="Logs de Segurança"
            icon={ShieldAlert}
            color="text-red-500"
          />
        </div>

        {/* 4.3: WAR ROOM NAVIGATION */}
        <Tabs defaultValue="heatmap" className="space-y-8">
          <TabsList className="bg-[#111] border border-white/5 p-1.5 h-14 rounded-2xl w-full md:w-auto">
            <TabsTrigger
              value="heatmap"
              className="rounded-xl px-6 font-black italic uppercase text-xs data-[state=active]:bg-orange-600"
            >
              <MapIcon size={14} className="mr-2" /> War Room Map
            </TabsTrigger>
            <TabsTrigger
              value="partners"
              className="rounded-xl px-6 font-black italic uppercase text-xs data-[state=active]:bg-orange-600"
            >
              <Crown size={14} className="mr-2" /> Inteligência Nike/Adidas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="heatmap" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 4.3.1: GEOGRAPHIC HEATMAP */}
            <div className="lg:col-span-2 bg-[#111] border border-white/5 rounded-[2.5rem] p-8 h-[650px] relative overflow-hidden shadow-2xl group">
              <div className="absolute top-8 left-8 z-10 space-y-2">
                <span className="bg-orange-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase italic flex items-center gap-2">
                  <Zap size={12} fill="white" /> Live Intelligence
                </span>
                <h3 className="text-3xl font-black italic uppercase tracking-tighter leading-none">
                  Radar de Expansão Global
                </h3>
              </div>

              <WorldMap votes={votes} />

              <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end z-10">
                <div className="bg-black/60 backdrop-blur-2xl p-6 rounded-[2rem] border border-white/10 max-w-sm">
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">
                    Destaque Geográfico
                  </p>
                  <p className="font-black italic text-xl uppercase leading-tight text-white">
                    {votes[0] ? (
                      <>
                        Novo Torcedor: <span className="text-orange-500">{votes[0].clube_nome}</span> <br /> em{" "}
                        {votes[0].voto_cidade}
                      </>
                    ) : (
                      "Aguardando sinal..."
                    )}
                  </p>
                </div>
                <Button className="bg-white text-black font-black italic uppercase rounded-2xl h-14 px-8 shadow-xl">
                  Exportar Heatmap
                </Button>
              </div>
            </div>

            {/* 4.3.2: REAL-TIME AUDIT LOG */}
            <div className="bg-[#111] border border-white/5 rounded-[2.5rem] p-8 flex flex-col h-[650px] shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-black italic uppercase tracking-tighter text-xl">Logs de Auditoria</h3>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black uppercase text-white/40">Sync Ativo</span>
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto no-scrollbar">
                {votes.map((v) => (
                  <div
                    key={v.id}
                    className="p-5 bg-white/[0.03] rounded-3xl border border-white/5 animate-in slide-in-from-right-4 transition-all hover:bg-white/[0.06] group/item"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-orange-500 font-black italic text-xs uppercase group-hover/item:scale-105 transition-transform">
                        {v.clube_nome}
                      </span>
                      <span className="text-[9px] font-bold text-white/20 uppercase font-mono">
                        {new Date(v.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-white/90 flex items-center gap-1.5">
                      <MapPin size={12} className="text-white/30" /> {v.voto_cidade}, {v.voto_pais}
                    </p>
                    <div className="flex items-center justify-between mt-4">
                      <span
                        className={`text-[9px] font-black uppercase italic tracking-widest px-2 py-0.5 rounded-full border ${v.is_residente ? "text-cyan-400 border-cyan-400/20 bg-cyan-400/5" : "text-yellow-500 border-yellow-500/20 bg-yellow-500/5"}`}
                      >
                        {v.status_integridade || (v.is_residente ? "RESIDENTE" : "DIÁSPORA")}
                      </span>
                      <span className="text-[8px] text-white/10 font-mono">ID: {v.fingerprint?.slice(0, 10)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
    MÓDULO 5: COMPONENTES DE APOIO (UI)
   ═══════════════════════════════════════════════════════════ */
const StatCard = ({ title, value, sub, icon: Icon, color }: any) => (
  <div className="bg-[#111] border border-white/5 p-8 rounded-[2.5rem] space-y-6 shadow-2xl hover:border-white/10 transition-colors group">
    <div className={`p-4 w-fit bg-white/5 rounded-2xl ${color} group-hover:scale-110 transition-transform`}>
      <Icon size={24} />
    </div>
    <div>
      <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-2">{title}</p>
      <h4 className="text-4xl font-black italic uppercase tracking-tighter leading-none text-white">{value}</h4>
      <p className="text-[10px] font-bold text-white/20 uppercase mt-3 italic tracking-widest">{sub}</p>
    </div>
  </div>
);

export default GlobalBI;

/**
 * ═══════════════════════════════════════════════════════════════════
 * [RODAPÉ TÉCNICO]
 * - Ficheiro: src/pages/Admin/GlobalBI.tsx
 * - Versão: 2.3 (Modularizado)
 * - Decisões:
 * 1. Separação rigorosa por módulos (Imports, Auxiliares, Lógica, JSX, UI).
 * 2. Adição de cabeçalhos de bloco para facilitar manutenção.
 * 3. Lógica Realtime preservada e otimizada para logs de auditoria.
 * ═══════════════════════════════════════════════════════════════════
 */
