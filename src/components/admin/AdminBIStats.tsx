import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, Globe, BarChart3, AlertTriangle } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useToast } from "@/hooks/use-toast";

interface BIStats {
  total_votes: number;
  total_users: number;
  fraud_attempts: number;
  by_age: { label: string; value: number }[] | null;
  by_country: { label: string; value: number }[] | null;
  by_state: { label: string; value: number }[] | null;
  by_city: { label: string; value: number }[] | null;
  by_club: { label: string; value: number }[] | null;
  by_gender: { label: string; value: number }[] | null;
}

const COLORS = [
  "hsl(347, 77%, 50%)", "hsl(30, 90%, 55%)", "hsl(200, 70%, 50%)",
  "hsl(150, 60%, 45%)", "hsl(270, 60%, 55%)", "hsl(50, 80%, 50%)",
  "hsl(0, 60%, 50%)", "hsl(180, 50%, 45%)",
];

const AGE_LABELS: Record<string, string> = {
  "menor-18": "< 18",
  "18-24": "18–24",
  "25-34": "25–34",
  "35-44": "35–44",
  "45-54": "45–54",
  "55-64": "55–64",
  "65+": "65+",
};

const AdminBIStats = () => {
  const [stats, setStats] = useState<BIStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase.rpc("admin_get_bi_stats");
      if (error) {
        toast({ title: "Erro BI", description: error.message, variant: "destructive" });
      } else {
        setStats(data as unknown as BIStats);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) return null;

  const ageData = (stats.by_age || []).map((d) => ({ ...d, label: AGE_LABELS[d.label] || d.label }));

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-3xl font-black text-foreground">{stats.total_users}</p>
              <p className="text-xs text-muted-foreground font-bold uppercase">Usuários</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-3xl font-black text-foreground">{stats.total_votes}</p>
              <p className="text-xs text-muted-foreground font-bold uppercase">Votos Válidos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <p className="text-3xl font-black text-destructive">{stats.fraud_attempts}</p>
              <p className="text-xs text-muted-foreground font-bold uppercase">Tentativas Fraude</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Age Pie */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Demografia por Faixa Etária
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ageData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={ageData} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={100} label={({ label, percent }) => `${label} (${(percent * 100).toFixed(0)}%)`}>
                    {ageData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(0 0% 6%)", border: "1px solid hsl(0 0% 14%)", color: "white", borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-10">Sem dados</p>
            )}
          </CardContent>
        </Card>

        {/* Gender Pie */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Demografia por Gênero
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(stats.by_gender || []).length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={stats.by_gender!} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={100} label={({ label, percent }) => `${label} (${(percent * 100).toFixed(0)}%)`}>
                    {stats.by_gender!.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(0 0% 6%)", border: "1px solid hsl(0 0% 14%)", color: "white", borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-10">Sem dados</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Geo Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By State */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              <Globe className="w-4 h-4 inline mr-1" /> Ranking por Estado
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(stats.by_state || []).length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.by_state!.slice(0, 10)} layout="vertical" margin={{ left: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 14%)" />
                  <XAxis type="number" tick={{ fill: "hsl(0 0% 55%)", fontSize: 11 }} />
                  <YAxis type="category" dataKey="label" tick={{ fill: "hsl(0 0% 55%)", fontSize: 11 }} width={55} />
                  <Tooltip contentStyle={{ background: "hsl(0 0% 6%)", border: "1px solid hsl(0 0% 14%)", color: "white", borderRadius: 8 }} />
                  <Bar dataKey="value" fill="hsl(347, 77%, 50%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-10">Sem dados</p>
            )}
          </CardContent>
        </Card>

        {/* By Club */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              🏆 Top Clubes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(stats.by_club || []).length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.by_club!.slice(0, 10)} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 14%)" />
                  <XAxis type="number" tick={{ fill: "hsl(0 0% 55%)", fontSize: 11 }} />
                  <YAxis type="category" dataKey="label" tick={{ fill: "hsl(0 0% 55%)", fontSize: 11 }} width={75} />
                  <Tooltip contentStyle={{ background: "hsl(0 0% 6%)", border: "1px solid hsl(0 0% 14%)", color: "white", borderRadius: 8 }} />
                  <Bar dataKey="value" fill="hsl(30, 90%, 55%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-10">Sem dados</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* City ranking */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            🏙️ Ranking por Cidade
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(stats.by_city || []).length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {stats.by_city!.slice(0, 12).map((c, i) => (
                <div key={i} className="glass-card rounded-lg p-3 text-center">
                  <p className="text-lg font-black text-foreground">{c.value}</p>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase truncate">{c.label}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-10">Sem dados</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminBIStats;
