/**
 * [CAMINHO]: src/components/admin/AccessStats.tsx
 * [MÓDULO]: Painel de acessos ao Heart Club — hoje, 7d, 30d, sempre,
 * visitantes únicos, split web/app e ranking de acessos por clube.
 * Fonte: tabela access_log (ver AccessTracker.tsx) via RPC admin_get_access_stats.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Eye, Smartphone, Globe2, FileDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportBrandedPdf } from "@/lib/pdf-export";

type ClubRow = { club_viewed: string; total: number; unicos: number };
type PlatformRow = { platform: string; total: number };

type Stats = {
  total_today: number;
  total_7d: number;
  total_30d: number;
  total_all: number;
  unique_today: number;
  unique_7d: number;
  unique_30d: number;
  unique_all: number;
  by_platform_30d: PlatformRow[];
  by_club_30d: ClubRow[];
};

export default function AccessStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("admin_get_access_stats");
      if (!error && data) setStats(data as unknown as Stats);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Carregando acessos...</p>;
  }
  if (!stats) {
    return <p className="text-sm text-destructive">Não foi possível carregar os dados de acesso.</p>;
  }

  const twa = stats.by_platform_30d.find((p) => p.platform === "android_twa")?.total || 0;
  const web = stats.by_platform_30d.find((p) => p.platform === "web")?.total || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-black italic uppercase tracking-tight">📈 Acessos ao Heart Club</h2>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            exportBrandedPdf({
              filename: `heartclub-acessos-${Date.now()}.pdf`,
              title: "Acessos ao Heart Club",
              subtitle: `Gerado em ${new Date().toLocaleDateString("pt-BR")}`,
              sections: [
                {
                  title: "Resumo Geral",
                  head: ["Período", "Acessos", "Visitantes Únicos"],
                  body: [
                    ["Hoje", stats.total_today, stats.unique_today],
                    ["Últimos 7 dias", stats.total_7d, stats.unique_7d],
                    ["Últimos 30 dias", stats.total_30d, stats.unique_30d],
                    ["Desde o início", stats.total_all, stats.unique_all],
                  ],
                },
                {
                  title: "Ranking por Clube (últimos 30 dias)",
                  head: ["Clube", "Acessos", "Visitantes Únicos"],
                  body: stats.by_club_30d.map((c) => [c.club_viewed, c.total, c.unicos]),
                },
              ],
            })
          }
        >
          <FileDown className="w-4 h-4 mr-1" /> Exportar PDF p/ parceiros
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Eye} label="Hoje" value={stats.total_today} sub={`${stats.unique_today} únicos`} />
        <StatCard icon={TrendingUp} label="Últimos 7 dias" value={stats.total_7d} sub={`${stats.unique_7d} únicos`} />
        <StatCard icon={TrendingUp} label="Últimos 30 dias" value={stats.total_30d} sub={`${stats.unique_30d} únicos`} />
        <StatCard icon={Users} label="Desde o início" value={stats.total_all} sub={`${stats.unique_all} únicos`} />
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-md">
        <StatCard icon={Globe2} label="Site (web) — 30d" value={web} />
        <StatCard icon={Smartphone} label="App Android — 30d" value={twa} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-black uppercase tracking-wide mb-3 text-muted-foreground">
          Ranking de acessos por clube (30 dias)
        </h3>
        {stats.by_club_30d.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ainda sem dados suficientes.</p>
        ) : (
          <div className="space-y-1">
            {stats.by_club_30d.map((c, i) => (
              <div
                key={c.club_viewed}
                className="flex items-center justify-between text-sm border-b border-border/50 py-2"
              >
                <span className="font-bold flex items-center gap-2">
                  <span className="text-muted-foreground w-5">{i + 1}º</span> {c.club_viewed}
                </span>
                <span className="text-muted-foreground">
                  <b className="text-foreground">{c.total}</b> acessos · {c.unicos} únicos
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <p className="text-2xl font-black italic">{value.toLocaleString("pt-BR")}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}
