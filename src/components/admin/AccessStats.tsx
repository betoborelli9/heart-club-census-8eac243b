/**
 * [CAMINHO]: src/components/admin/AccessStats.tsx
 * [MÓDULO]: Painel de acessos ao Heart Club — hoje, 7d, 30d, sempre,
 * visitantes únicos, split web/app, ranking de acessos por clube,
 * planilha detalhada (nome, data/hora, página) e ranking de torcedores
 * mais ativos com páginas já visitadas / faltando. Atualiza em tempo
 * real via Supabase Realtime assim que alguém acessa.
 */
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Eye, Smartphone, Globe2, FileDown, TrendingUp, Activity, Download, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportBrandedPdf } from "@/lib/pdf-export";
import { toast } from "sonner";
import { formatLocalDateTime } from "@/lib/country-timezone";

type ClubRow = { club_viewed: string; total: number; unicos: number };
type PlatformRow = { platform: string; total: number };
type DetailRow = {
  nome: string;
  email: string | null;
  whatsapp: string | null;
  pais: string | null;
  club_viewed: string | null;
  platform: string;
  path: string;
  created_at: string;
};
type UserRankRow = {
  user_id: string;
  nome: string;
  email: string | null;
  whatsapp: string | null;
  pais: string | null;
  total_accesses: number;
  paginas_visitadas: string[];
  primeiro_acesso: string;
  ultimo_acesso: string;
};

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
  by_page_30d: PageRow[];
};
type PageRow = { path: string; total: number; unicos: number; via_site: number; via_app: number };

// Páginas "core" do torcedor — usadas pra saber o que cada um já viu / ainda não viu,
// e pra dar nome amigável no ranking de páginas mais acessadas.
const CORE_PAGES: { label: string; match: (p: string) => boolean }[] = [
  { label: "Início", match: (p) => p === "/dashboard" },
  { label: "Ranking", match: (p) => ["/stats", "/estatisticas", "/ranking"].includes(p) },
  { label: "Mapa de Calor", match: (p) => p === "/mapa-calor" },
  { label: "Embaixadores", match: (p) => ["/embaixador", "/embaixadores", "/painel-embaixador"].includes(p) },
];

function pagesSeen(paths: string[]): string[] {
  return CORE_PAGES.filter((cp) => paths.some((p) => cp.match(p))).map((cp) => cp.label);
}

function friendlyPage(path: string): string {
  const found = CORE_PAGES.find((cp) => cp.match(path));
  return found ? `${found.label} (${path})` : path;
}

function exportCsv(rows: DetailRow[]) {
  const header = ["nome", "email", "whatsapp", "pais", "clube", "pagina", "plataforma", "data_hora_local_do_torcedor"];
  const body = rows.map((r) => [
    r.nome,
    r.email ?? "",
    r.whatsapp ?? "",
    r.pais ?? "",
    r.club_viewed ?? "",
    r.path,
    r.platform,
    formatLocalDateTime(r.created_at, r.pais),
  ]);
  const csv = [header, ...body].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `heart-club-acessos-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AccessStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [detail, setDetail] = useState<DetailRow[]>([]);
  const [byUser, setByUser] = useState<UserRankRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const fetchingRef = useRef(false);
  const lastSeenRef = useRef<string | null>(null);
  const firstLoadRef = useRef(true);

  const fetchAll = async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    const [{ data: s }, { data: d }, { data: u }] = await Promise.all([
      supabase.rpc("admin_get_access_stats"),
      supabase.rpc("admin_get_access_detail", { p_limit: 300 }),
      supabase.rpc("admin_get_access_by_user"),
    ]);
    if (s) setStats(s as unknown as Stats);
    if (d) {
      const rows = d as unknown as DetailRow[];
      setDetail(rows);
      // Avisa na hora quem acabou de acessar — pula o carregamento inicial
      // (senão avisaria o histórico inteiro de uma vez ao abrir o painel).
      if (rows[0] && rows[0].created_at !== lastSeenRef.current) {
        if (!firstLoadRef.current) {
          const who = rows[0].email || rows[0].nome;
          const via = rows[0].platform === "android_twa" ? "pelo app" : "pelo site";
          toast.info(`🟢 ${who} acabou de acessar ${via}`, {
            description: `${rows[0].club_viewed ? rows[0].club_viewed + " · " : ""}${new Date(rows[0].created_at).toLocaleString("pt-BR")}`,
          });
        }
        lastSeenRef.current = rows[0].created_at;
      }
      firstLoadRef.current = false;
    }
    if (u) setByUser(u as unknown as UserRankRow[]);
    setLoading(false);
    fetchingRef.current = false;
  };

  useEffect(() => {
    fetchAll();

    const channel = supabase
      .channel("access-log-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "access_log" }, () => {
        fetchAll();
      })
      .subscribe((status) => setIsLive(status === "SUBSCRIBED"));

    return () => {
      supabase.removeChannel(channel);
    };
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
        <h2 className="text-lg font-black italic uppercase tracking-tight flex items-center gap-2">
          📈 Acessos ao Heart Club
          <span className="flex items-center gap-1 text-[10px] font-bold text-green-500 uppercase">
            <span className={`w-2 h-2 rounded-full bg-green-500 ${isLive ? "animate-pulse" : "opacity-30"}`} />
            {isLive ? "ao vivo" : "conectando..."}
          </span>
        </h2>
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
                {
                  title: "Ranking por Página (últimos 30 dias)",
                  head: ["Página", "Acessos", "Únicos", "Via Site", "Via App"],
                  body: stats.by_page_30d.map((p) => [friendlyPage(p.path), p.total, p.unicos, p.via_site, p.via_app]),
                },
              ],
            })
          }
        >
          <FileDown className="w-4 h-4 mr-1" /> Exportar PDF p/ parceiros
        </Button>
      </div>

      <div className="rounded-2xl border border-green-500/30 bg-black p-4">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-green-400 mb-2 flex items-center gap-1.5">
          <Radio className="w-3.5 h-3.5 animate-pulse" /> Feed ao vivo
        </h3>
        {detail.length === 0 ? (
          <p className="text-sm text-white/40">Aguardando o primeiro acesso...</p>
        ) : (
          <div className="space-y-1.5 max-h-[220px] overflow-y-auto font-mono">
            {detail.slice(0, 15).map((r, i) => (
              <p key={i} className="text-xs text-green-400/90">
                <span className="text-white/30">{formatLocalDateTime(r.created_at, r.pais)}</span>
                {" — "}
                <b>{r.email || r.nome}</b> acessou {r.platform === "android_twa" ? "pelo app" : "pelo site"}
                {r.club_viewed ? ` (${r.club_viewed})` : ""}
              </p>
            ))}
          </div>
        )}
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
        <h3 className="text-sm font-black uppercase tracking-wide mb-1 text-muted-foreground">
          Ranking de páginas mais acessadas (30 dias)
        </h3>
        <p className="text-[11px] text-muted-foreground mb-3">
          Use isso pra precificar o espaço publicitário — página com mais tráfego vale mais.
        </p>
        {stats.by_page_30d.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ainda sem dados suficientes.</p>
        ) : (
          <div className="space-y-1">
            {stats.by_page_30d.map((p, i) => (
              <div key={p.path} className="flex items-center justify-between text-sm border-b border-border/50 py-2 gap-2">
                <span className="font-bold flex items-center gap-2">
                  <span className="text-muted-foreground w-5">{i + 1}º</span> {friendlyPage(p.path)}
                </span>
                <span className="text-muted-foreground text-right whitespace-nowrap">
                  <b className="text-foreground">{p.total}</b> acessos · {p.unicos} únicos
                  <br />
                  <span className="text-[10px]">🌐 {p.via_site} site · 📱 {p.via_app} app</span>
                </span>
              </div>
            ))}
          </div>
        )}
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
              <div key={c.club_viewed} className="flex items-center justify-between text-sm border-b border-border/50 py-2">
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

      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-black uppercase tracking-wide mb-3 text-muted-foreground flex items-center gap-2">
          <Activity className="w-4 h-4" /> Torcedores mais ativos
        </h3>
        {byUser.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ainda sem torcedores logados com acesso registrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase text-muted-foreground border-b border-border">
                  <th className="py-2 pr-2">#</th>
                  <th className="py-2 pr-2">Torcedor</th>
                  <th className="py-2 pr-2">E-mail</th>
                  <th className="py-2 pr-2">WhatsApp</th>
                  <th className="py-2 pr-2">Acessos</th>
                  <th className="py-2 pr-2">Páginas vistas</th>
                  <th className="py-2 pr-2">Ainda não viu</th>
                  <th className="py-2 pr-2">Último acesso</th>
                </tr>
              </thead>
              <tbody>
                {byUser.map((u, i) => {
                  const seen = pagesSeen(u.paginas_visitadas);
                  const missing = CORE_PAGES.map((cp) => cp.label).filter((l) => !seen.includes(l));
                  return (
                    <tr key={u.user_id} className="border-b border-border/50">
                      <td className="py-2 pr-2 text-muted-foreground">{i + 1}º</td>
                      <td className="py-2 pr-2 font-bold">{u.nome}</td>
                      <td className="py-2 pr-2 text-muted-foreground">{u.email ?? "—"}</td>
                      <td className="py-2 pr-2 text-muted-foreground whitespace-nowrap">{u.whatsapp ?? "—"}</td>
                      <td className="py-2 pr-2">{u.total_accesses}</td>
                      <td className="py-2 pr-2 text-green-600">{seen.join(", ") || "—"}</td>
                      <td className="py-2 pr-2 text-orange-500">{missing.join(", ") || "viu tudo ✓"}</td>
                      <td className="py-2 pr-2 text-muted-foreground whitespace-nowrap">
                        {formatLocalDateTime(u.ultimo_acesso, u.pais)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black uppercase tracking-wide text-muted-foreground">
            Planilha de acessos (últimos {detail.length})
          </h3>
          <Button size="sm" variant="outline" onClick={() => exportCsv(detail)} disabled={detail.length === 0}>
            <Download className="w-4 h-4 mr-1" /> Exportar CSV
          </Button>
        </div>
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="text-left text-[10px] uppercase text-muted-foreground border-b border-border">
                <th className="py-2 pr-2">Nome</th>
                <th className="py-2 pr-2">E-mail</th>
                <th className="py-2 pr-2">WhatsApp</th>
                <th className="py-2 pr-2">Clube</th>
                <th className="py-2 pr-2">Página</th>
                <th className="py-2 pr-2">Plataforma</th>
                <th className="py-2 pr-2">Data/Hora (fuso do torcedor)</th>
              </tr>
            </thead>
            <tbody>
              {detail.map((r, i) => (
                <tr key={i} className="border-b border-border/30">
                  <td className="py-1.5 pr-2 font-bold">{r.nome}</td>
                  <td className="py-1.5 pr-2 text-muted-foreground">{r.email ?? "—"}</td>
                  <td className="py-1.5 pr-2 text-muted-foreground whitespace-nowrap">{r.whatsapp ?? "—"}</td>
                  <td className="py-1.5 pr-2 text-muted-foreground">{r.club_viewed ?? "—"}</td>
                  <td className="py-1.5 pr-2 text-muted-foreground">{r.path}</td>
                  <td className="py-1.5 pr-2 text-muted-foreground">{r.platform === "android_twa" ? "App" : "Web"}</td>
                  <td className="py-1.5 pr-2 text-muted-foreground whitespace-nowrap">
                    {formatLocalDateTime(r.created_at, r.pais)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
