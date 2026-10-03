/**
 * AdminBIStats — Global BI Dashboard
 * Big-data ready: all aggregates computed server-side via admin_get_global_bi_stats.
 * Hierarchical filter: Continent → Country → State → City → Neighborhood.
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, Globe, BarChart3, AlertTriangle, X } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface KV { label: string; value: number }
interface BIStats {
  total_votes: number;
  total_users: number;
  fraud_attempts: number;
  by_age: KV[] | null;
  by_gender: KV[] | null;
  by_continent: KV[] | null;
  by_country: KV[] | null;
  by_state: KV[] | null;
  by_city: KV[] | null;
  by_club: KV[] | null;
}
interface GeoOpt { name: string; votes: number }
interface GeoOptions {
  continents: GeoOpt[];
  countries: GeoOpt[];
  states: GeoOpt[];
  cities: GeoOpt[];
  neighborhoods: GeoOpt[];
}

const COLORS = [
  "hsl(24 100% 50%)", "hsl(30 90% 55%)", "hsl(200 70% 50%)",
  "hsl(150 60% 45%)", "hsl(270 60% 55%)", "hsl(50 80% 50%)",
  "hsl(180 50% 45%)", "hsl(320 60% 55%)",
];

const AGE_LABELS: Record<string, string> = {
  "menor-18": "< 18", "18-24": "18–24", "25-34": "25–34",
  "35-44": "35–44", "45-54": "45–54", "55-64": "55–64", "65+": "65+",
};

const ALL = "__all__";

const tooltipStyle = {
  background: "hsl(0 0% 6%)",
  border: "1px solid hsl(24 100% 50% / 0.4)",
  color: "white",
  borderRadius: 8,
  fontFamily: "Verdana, sans-serif",
} as const;

const AdminBIStats = () => {
  const [stats, setStats] = useState<BIStats | null>(null);
  const [opts, setOpts] = useState<GeoOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    continent: "" as string,
    country: "" as string,
    state: "" as string,
    city: "" as string,
    neighborhood: "" as string,
  });
  const { toast } = useToast();

  // Load cascading geo options whenever a parent changes
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("admin_get_geo_options", {
        p_continent: filters.continent || null,
        p_country: filters.country || null,
        p_state: filters.state || null,
        p_city: filters.city || null,
      });
      if (error) {
        toast({ title: "Erro filtros", description: error.message, variant: "destructive" });
        return;
      }
      setOpts(data as unknown as GeoOptions);
    })();
  }, [filters.continent, filters.country, filters.state, filters.city]);

  // Load aggregates whenever filters change
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("admin_get_global_bi_stats", {
        p_continent: filters.continent || null,
        p_country: filters.country || null,
        p_state: filters.state || null,
        p_city: filters.city || null,
        p_neighborhood: filters.neighborhood || null,
      });
      if (error) {
        toast({ title: "Erro BI", description: error.message, variant: "destructive" });
      } else {
        setStats(data as unknown as BIStats);
      }
      setLoading(false);
    })();
  }, [filters]);

  const ageData = useMemo(
    () => (stats?.by_age || []).map((d) => ({ ...d, label: AGE_LABELS[d.label] || d.label })),
    [stats]
  );

  const setFilter = (key: keyof typeof filters, value: string) => {
    const v = value === ALL ? "" : value;
    setFilters((prev) => {
      const next = { ...prev, [key]: v };
      // reset descendants when an ancestor changes
      if (key === "continent") { next.country = ""; next.state = ""; next.city = ""; next.neighborhood = ""; }
      if (key === "country") { next.state = ""; next.city = ""; next.neighborhood = ""; }
      if (key === "state") { next.city = ""; next.neighborhood = ""; }
      if (key === "city") { next.neighborhood = ""; }
      return next;
    });
  };

  const clearFilters = () =>
    setFilters({ continent: "", country: "", state: "", city: "", neighborhood: "" });

  const hasFilter = Object.values(filters).some(Boolean);

  return (
    <div className="space-y-8">
      {/* ============= GLOBAL HIERARCHICAL FILTER ============= */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-primary italic">
            🌍 Filtro Hierárquico Global
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {([
              ["continent", "Continente", opts?.continents],
              ["country", "País", opts?.countries],
              ["state", "Estado", opts?.states],
              ["city", "Cidade", opts?.cities],
              ["neighborhood", "Bairro", opts?.neighborhoods],
            ] as const).map(([key, label, list]) => (
              <Select key={key} value={filters[key] || ALL} onValueChange={(v) => setFilter(key, v)}>
                <SelectTrigger className="bg-background border-border text-xs h-9">
                  <SelectValue placeholder={label} />
                </SelectTrigger>
                <SelectContent className="bg-background border-border max-h-72">
                  <SelectItem value={ALL}>Todos · {label}</SelectItem>
                  {(list || []).map((o) => (
                    <SelectItem key={o.name} value={o.name}>
                      {o.name} <span className="text-muted-foreground">({o.votes})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ))}
          </div>
          {hasFilter && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-3 h-7 text-xs text-primary">
              <X className="w-3 h-3 mr-1" /> Limpar filtros
            </Button>
          )}
        </CardContent>
      </Card>

      {loading || !stats ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* ============= KPI CARDS ============= */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Users, value: stats.total_users, label: "Usuários (filtro)", danger: false },
              { icon: BarChart3, value: stats.total_votes, label: "Votos (filtro)", danger: false },
              { icon: AlertTriangle, value: stats.fraud_attempts, label: "Tentativas Fraude (global)", danger: true },
            ].map((k, i) => (
              <Card key={i} className="bg-card border-border">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${k.danger ? "bg-destructive/10" : "bg-primary/10"}`}>
                    <k.icon className={`w-6 h-6 ${k.danger ? "text-destructive" : "text-primary"}`} />
                  </div>
                  <div>
                    <p className={`text-3xl font-black ${k.danger ? "text-destructive" : "text-foreground"}`}>
                      {k.value.toLocaleString("pt-BR")}
                    </p>
                    <p className="text-xs text-muted-foreground font-bold uppercase">{k.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ============= DEMOGRAPHICS ============= */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Demografia por Faixa Etária" data={ageData} type="pie" />
            <ChartCard title="Demografia por Gênero" data={stats.by_gender || []} type="pie" />
          </div>

          {/* ============= GEO RANKINGS ============= */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Top Países" data={(stats.by_country || []).slice(0, 10)} type="bar" icon="🌐" />
            <ChartCard title="Top Estados" data={(stats.by_state || []).slice(0, 10)} type="bar" icon="🗺️" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Top Cidades" data={(stats.by_city || []).slice(0, 10)} type="bar" icon="🏙️" />
            <ChartCard title="Top Clubes" data={(stats.by_club || []).slice(0, 10)} type="bar" icon="🏆" />
          </div>
        </>
      )}
    </div>
  );
};

/* ============= Reusable Chart Card ============= */
const ChartCard = ({
  title, data, type, icon,
}: { title: string; data: KV[]; type: "pie" | "bar"; icon?: string }) => (
  <Card className="bg-card border-border">
    <CardHeader>
      <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground italic">
        {icon ? `${icon} ` : <Globe className="w-4 h-4 inline mr-1" />}
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      {data.length === 0 ? (
        <p className="text-center text-muted-foreground py-10">Sem dados</p>
      ) : type === "pie" ? (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={100}
              label={({ label, percent }) => `${label} (${((percent || 0) * 100).toFixed(0)}%)`}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [v.toLocaleString("pt-BR"), n]} />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 14%)" />
            <XAxis type="number" tick={{ fill: "hsl(0 0% 55%)", fontSize: 11 }} />
            <YAxis type="category" dataKey="label" tick={{ fill: "hsl(0 0% 55%)", fontSize: 11 }} width={75} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => v.toLocaleString("pt-BR")} />
            <Bar dataKey="value" fill="hsl(24 100% 50%)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </CardContent>
  </Card>
);

export default AdminBIStats;
