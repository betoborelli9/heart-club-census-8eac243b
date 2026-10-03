/**
 * AdminBIStats — Global BI Dashboard
 * Big-data ready: all aggregates computed server-side via admin_get_global_bi_stats.
 * Hierarchical filter: Continent → Country → State → City → Neighborhood.
 *
 * Paleta fixa categórica (validada p/ daltonismo) usada em ordem — nunca
 * sorteada — pra rankings de magnitude cada gráfico usa 1 matiz só
 * (sequencial), o que é tecnicamente o certo e ainda fica visualmente
 * variado porque cada card tem sua própria cor.
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, Globe, BarChart3, AlertTriangle, X, TrendingUp } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LabelList, Cell,
  ComposedChart, Line, Area, ResponsiveContainer,
} from "recharts";
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
  daily_trend: KV[] | null;
}
interface GeoOpt { name: string; votes: number }
interface GeoOptions {
  continents: GeoOpt[];
  countries: GeoOpt[];
  states: GeoOpt[];
  cities: GeoOpt[];
  neighborhoods: GeoOpt[];
}

// Paleta categórica fixa (passos "dark", validados CVD) — ordem nunca muda.
const CATEGORICAL = [
  "#3987e5", // blue
  "#d95926", // orange
  "#199e70", // aqua
  "#c98500", // yellow
  "#d55181", // magenta
  "#008300", // green
  "#9085e9", // violet
  "#e66767", // red
];

// 1 matiz sequencial por gráfico de ranking — dá a variedade visual entre
// os cards sem transformar cada barra num arco-íris sem sentido.
const SEQ = {
  pais: "#3987e5",
  estado: "#9085e9",
  cidade: "#199e70",
  clube: "#d95926",
  trend: "#3987e5",
};

const AGE_LABELS: Record<string, string> = {
  "menor-18": "< 18", "18-24": "18–24", "25-34": "25–34",
  "35-44": "35–44", "45-54": "45–54", "55-64": "55–64", "65+": "65+",
};

const ALL = "__all__";

const tooltipStyle = {
  background: "#1a1a19",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#ffffff",
  borderRadius: 8,
  fontSize: 12,
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

          {/* ============= EVOLUÇÃO NO TEMPO (novo) ============= */}
          <TrendCard data={stats.daily_trend || []} />

          {/* ============= DEMOGRAPHICS ============= */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RankCard title="Demografia por Faixa Etária" icon="🎂" data={ageData} palette="categorical" />
            <RankCard title="Demografia por Gênero" icon="⚧" data={stats.by_gender || []} palette="categorical" />
          </div>

          {/* ============= GEO RANKINGS ============= */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RankCard title="Top Países" icon="🌐" data={(stats.by_country || []).slice(0, 10)} color={SEQ.pais} />
            <RankCard title="Top Estados" icon="🗺️" data={(stats.by_state || []).slice(0, 10)} color={SEQ.estado} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RankCard title="Top Cidades" icon="🏙️" data={(stats.by_city || []).slice(0, 10)} color={SEQ.cidade} />
            <RankCard title="Top Clubes" icon="🏆" data={(stats.by_club || []).slice(0, 10)} color={SEQ.clube} />
          </div>
        </>
      )}
    </div>
  );
};

/* ============= Gráfico de evolução (linha + área) ============= */
const TrendCard = ({ data }: { data: KV[] }) => (
  <Card className="bg-card border-border">
    <CardHeader>
      <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground italic flex items-center gap-1.5">
        <TrendingUp className="w-4 h-4" /> Evolução de Votos (últimos 30 dias)
      </CardTitle>
    </CardHeader>
    <CardContent>
      {data.length === 0 ? (
        <p className="text-center text-muted-foreground py-10">Sem dados no período.</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={data} margin={{ left: 0, right: 12, top: 8 }}>
            <defs>
              <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={SEQ.trend} stopOpacity={0.18} />
                <stop offset="100%" stopColor={SEQ.trend} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="0" stroke="#2c2c2a" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#898781", fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tick={{ fill: "#898781", fontSize: 10 }} allowDecimals={false} width={28} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v.toLocaleString("pt-BR"), "Votos"]} />
            <Area type="monotone" dataKey="value" stroke="none" fill="url(#trendFill)" />
            <Line type="monotone" dataKey="value" stroke={SEQ.trend} strokeWidth={2} dot={{ r: 3, fill: SEQ.trend }} activeDot={{ r: 5 }} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </CardContent>
  </Card>
);

/* ============= Reusable ranking bar card (valor + %) ============= */
const RankCard = ({
  title, icon, data, color, palette,
}: { title: string; icon?: string; data: KV[]; color?: string; palette?: "categorical" }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  const chartData = data.map((d, i) => ({
    ...d,
    pct: total > 0 ? Math.round((d.value / total) * 100) : 0,
    fill: palette === "categorical" ? CATEGORICAL[i % CATEGORICAL.length] : color,
  }));
  // Altura de barra fixa e curta (spec: <=24px), cresce só o comprimento do gráfico.
  const height = Math.max(chartData.length * 34 + 20, 100);

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground italic">
          {icon ? `${icon} ` : <Globe className="w-4 h-4 inline mr-1" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-center text-muted-foreground py-10">Sem dados</p>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 56, top: 4, bottom: 4 }} barCategoryGap={10}>
              <CartesianGrid strokeDasharray="0" stroke="#2c2c2a" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fill: "#c3c2b7", fontSize: 11 }}
                width={110}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number, _n, p: any) => [`${v.toLocaleString("pt-BR")} (${p.payload.pct}%)`, "Votos"]}
              />
              <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} maxBarSize={22}>
                {palette === "categorical" &&
                  chartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                <LabelList
                  dataKey="value"
                  position="right"
                  content={(props: any) => {
                    const { x, y, width, height, index } = props;
                    const d = chartData[index];
                    if (!d) return null;
                    return (
                      <text
                        x={x + width + 8}
                        y={y + height / 2}
                        dy={4}
                        fontSize={11}
                        fontWeight={700}
                        fill="#c3c2b7"
                      >
                        {d.value.toLocaleString("pt-BR")} <tspan fill="#898781" fontWeight={400}>({d.pct}%)</tspan>
                      </text>
                    );
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminBIStats;
