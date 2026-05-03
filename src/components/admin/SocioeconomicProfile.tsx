/**
 * SocioeconomicProfile.tsx
 * Aba "Perfil Socioeconômico do Torcedor"
 * - Filtros: Clube + Estado
 * - KPIs: Votos auditados (reais) x suspeitos
 * - Distribuição de Renda Estimada por Classe (A/B/C/D/E) — gráfico de barras empilhadas
 * - Top profissões
 * - Mix de dispositivos (iOS vs Android) → validador socioeconômico
 * - Botão: Gerar Relatório PDF + botão de re-auditoria por dispositivo
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShieldCheck, FileDown, Smartphone, Briefcase, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, PieChart, Pie, Cell,
} from "recharts";
import { toast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logo from "@/assets/logo.png";
import {
  estimateIncomeFromProfession, classFromIncome,
} from "@/lib/socioeconomic";

const ALL = "__ALL__";
const CLASS_COLORS: Record<string, string> = {
  A: "#ff6200", B: "#ff8a3d", C: "#ffb27a", D: "#7a7a7a", E: "#3a3a3a",
};

interface ProfileData {
  total_votes: number;
  audited_real: number;
  suspicious: number;
  by_profession: Array<{ label: string; value: number }>;
  by_class: Array<{ label: string; value: number }>;
  by_device: Array<{ label: string; value: number }>;
  device_brand: Array<{ label: string; value: number }>;
  top_clubs_by_class: Array<{ club: string; class: string; value: number }>;
}

const SocioeconomicProfile = () => {
  const [club, setClub] = useState("");
  const [state, setState] = useState<string>(ALL);
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const [states, setStates] = useState<string[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const { data: res, error } = await supabase.rpc("admin_get_socioeconomic_profile", {
        p_club: club.trim() || null,
        p_state: state === ALL ? null : state,
      });
      if (error) throw error;
      setData(res as unknown as ProfileData);
    } catch (e: any) {
      toast({ title: "Falha ao carregar", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("votos")
        .select("estado")
        .eq("is_original_vote", true)
        .not("estado", "is", null)
        .limit(5000);
      const uniq = Array.from(new Set((data || []).map((r: any) => r.estado).filter(Boolean))).sort();
      setStates(uniq);
    })();
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recalcula classes a partir das profissões + dispositivos quando classe_social está ausente
  const classDist = useMemo(() => {
    if (!data) return [] as Array<{ label: string; value: number }>;
    const dbHas = (data.by_class || []).some((c) => c.label !== "N/A");
    if (dbHas) return data.by_class;

    // Reconstrói via profissões: cada profissão → renda estimada → classe
    const acc: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    for (const row of data.by_profession || []) {
      const cls = classFromIncome(estimateIncomeFromProfession(row.label));
      acc[cls] = (acc[cls] || 0) + row.value;
    }
    return Object.entries(acc).map(([label, value]) => ({ label, value }));
  }, [data]);

  const auditDevices = async () => {
    setAuditing(true);
    try {
      const { data: flagged, error } = await supabase.rpc("admin_flag_suspicious_devices");
      if (error) throw error;
      toast({ title: "Auditoria concluída", description: `${flagged || 0} votos marcados como suspeitos.` });
      await load();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setAuditing(false);
    }
  };

  const generatePDF = () => {
    if (!data) return;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const orange: [number, number, number] = [255, 98, 0];
    const today = new Date().toLocaleDateString("pt-BR");

    doc.setFillColor(0, 0, 0);
    doc.rect(0, 0, W, 110, "F");
    doc.setTextColor(...orange);
    doc.setFont("helvetica", "bolditalic");
    doc.setFontSize(26);
    doc.text("HEART CLUB", 40, 50);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.text("Perfil Socioeconômico do Torcedor", 40, 73);
    doc.setFontSize(9);
    doc.text(
      `Clube: ${club || "Todos"}  •  Estado: ${state === ALL ? "Nacional" : state}  •  ${today}`,
      40, 92,
    );

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Métricas de Auditoria", 40, 145);
    autoTable(doc, {
      startY: 155,
      theme: "grid",
      headStyles: { fillColor: orange, textColor: 255 },
      head: [["Indicador", "Quantidade"]],
      body: [
        ["Votos no recorte", String(data.total_votes)],
        ["Votos Auditados e Reais", String(data.audited_real)],
        ["Votos Suspeitos / Fraude", String(data.suspicious)],
      ],
    });

    let y = (doc as any).lastAutoTable.finalY + 20;
    doc.setFont("helvetica", "bold");
    doc.text("Distribuição por Classe Social (estimada)", 40, y);
    autoTable(doc, {
      startY: y + 8,
      headStyles: { fillColor: orange, textColor: 255 },
      head: [["Classe", "Torcedores", "% do total"]],
      body: classDist.map((c) => {
        const total = classDist.reduce((s, x) => s + x.value, 0) || 1;
        return [c.label, String(c.value), `${((c.value / total) * 100).toFixed(1)}%`];
      }),
    });

    y = (doc as any).lastAutoTable.finalY + 20;
    doc.setFont("helvetica", "bold");
    doc.text("Top Profissões", 40, y);
    autoTable(doc, {
      startY: y + 8,
      headStyles: { fillColor: orange, textColor: 255 },
      head: [["Profissão", "Torcedores", "Renda Estimada (R$)"]],
      body: (data.by_profession || []).slice(0, 20).map((p) => [
        p.label, String(p.value),
        estimateIncomeFromProfession(p.label).toLocaleString("pt-BR"),
      ]),
    });

    y = (doc as any).lastAutoTable.finalY + 20;
    if (y > 720) { doc.addPage(); y = 60; }
    doc.setFont("helvetica", "bold");
    doc.text("Validação por Dispositivo", 40, y);
    autoTable(doc, {
      startY: y + 8,
      headStyles: { fillColor: orange, textColor: 255 },
      head: [["Marca / Modelo", "Votos"]],
      body: (data.by_device || []).slice(0, 15).map((d) => [d.label, String(d.value)]),
    });

    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(
        `Heart Club • Confidencial • Para investidores e bancos • Página ${i}/${pages}`,
        40, doc.internal.pageSize.getHeight() - 20,
      );
    }
    doc.save(`HeartClub_PerfilSocioeconomico_${today.replace(/\//g, "-")}.pdf`);
    toast({ title: "PDF gerado", description: "Relatório baixado com sucesso." });
  };

  // Stack 100% para classes (uma única barra empilhada)
  const stackData = useMemo(() => {
    const total = classDist.reduce((s, x) => s + x.value, 0) || 1;
    const obj: any = { name: "Torcida" };
    classDist.forEach((c) => (obj[c.label] = +((c.value / total) * 100).toFixed(2)));
    return [obj];
  }, [classDist]);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div
        className="rounded-2xl p-6 flex items-center gap-4 bg-black"
        style={{
          border: "1px solid hsl(var(--primary) / 0.5)",
          boxShadow: "0 0 36px hsl(var(--primary) / 0.25)",
        }}
      >
        <img src={logo} alt="Heart Club" className="h-12 w-12 object-contain" />
        <div className="flex-1">
          <h2
            className="text-2xl md:text-3xl font-black italic text-primary"
            style={{ fontFamily: "Verdana, sans-serif" }}
          >
            Perfil Socioeconômico do Torcedor
          </h2>
          <p className="text-xs text-muted-foreground italic">
            Renda estimada • Classe social (A–E) • Dispositivo • Auditoria de fraude
          </p>
        </div>
        <Button onClick={generatePDF} disabled={!data} className="btn-orange-gradient font-bold italic">
          <FileDown className="w-4 h-4 mr-2" /> Exportar PDF
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase text-muted-foreground tracking-wider">Clube</label>
          <Input
            value={club}
            onChange={(e) => setClub(e.target.value)}
            placeholder="Nome exato (vazio = todos)"
            className="w-64 bg-card border-border"
            onKeyDown={(e) => e.key === "Enter" && load()}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase text-muted-foreground tracking-wider">Estado (UF)</label>
          <Select value={state} onValueChange={setState}>
            <SelectTrigger className="w-40 bg-card border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Nacional</SelectItem>
              {states.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={load} disabled={loading} className="btn-orange-gradient">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Atualizar"}
        </Button>
        <Button variant="outline" onClick={auditDevices} disabled={auditing} className="border-primary/40">
          {auditing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
          Auditar Dispositivos
        </Button>
      </div>

      {!data ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KPI label="Total no Recorte" value={data.total_votes} />
            <KPI label="Votos Auditados e Reais" value={data.audited_real} accent />
            <KPI label="Suspeitos / Fraude" value={data.suspicious} warn />
          </div>

          {/* Stacked bar — Classes Sociais */}
          <Card title="Distribuição por Classe Social (estimada)" icon={<Briefcase className="w-4 h-4" />}>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={stackData} layout="vertical" stackOffset="expand">
                <XAxis type="number" tickFormatter={(v) => `${Math.round(v * 100)}%`} stroke="#888" fontSize={11} />
                <YAxis type="category" dataKey="name" stroke="#888" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: "#000", border: "1px solid #ff6200" }} formatter={(v: any) => `${v}%`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {["A", "B", "C", "D", "E"].map((cls) => (
                  <Bar key={cls} dataKey={cls} stackId="x" fill={CLASS_COLORS[cls]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 grid grid-cols-5 gap-2 text-center text-xs">
              {classDist.map((c) => (
                <div key={c.label} className="rounded p-2 border border-border bg-card">
                  <div className="font-black text-primary text-lg">{c.label}</div>
                  <div className="text-muted-foreground">{c.value}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Profissões */}
          <Card title="Top Profissões" icon={<Briefcase className="w-4 h-4" />}>
            <ResponsiveContainer width="100%" height={Math.max(220, (data.by_profession?.length || 0) * 22)}>
              <BarChart data={(data.by_profession || []).slice(0, 15)} layout="vertical">
                <CartesianGrid stroke="#222" />
                <XAxis type="number" stroke="#888" fontSize={11} />
                <YAxis type="category" dataKey="label" stroke="#888" fontSize={11} width={140} />
                <Tooltip contentStyle={{ backgroundColor: "#000", border: "1px solid #ff6200" }} />
                <Bar dataKey="value" fill="#ff6200" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Dispositivos */}
          <Card title="Validação por Dispositivo (iOS x Android)" icon={<Smartphone className="w-4 h-4" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={data.device_brand} dataKey="value" nameKey="label" outerRadius={80} label>
                    {data.device_brand.map((_, i) => (
                      <Cell key={i} fill={["#ff6200", "#ffb27a", "#555"][i % 3]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#000", border: "1px solid #ff6200" }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="overflow-auto max-h-56">
                <table className="w-full text-xs">
                  <thead className="text-primary">
                    <tr><th className="text-left p-1">Modelo</th><th className="text-right p-1">Votos</th></tr>
                  </thead>
                  <tbody>
                    {(data.by_device || []).slice(0, 15).map((d, i) => (
                      <tr key={i} className="border-t border-border/40">
                        <td className="p-1">{d.label}</td>
                        <td className="p-1 text-right">{d.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

const KPI = ({ label, value, accent, warn }: { label: string; value: number; accent?: boolean; warn?: boolean }) => (
  <div
    className="rounded-xl p-4 bg-card border"
    style={{
      borderColor: warn ? "#ef4444aa" : accent ? "hsl(var(--primary))" : "hsl(var(--border))",
      boxShadow: accent ? "0 0 24px hsl(var(--primary) / 0.3)" : undefined,
    }}
  >
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
      {warn && <AlertTriangle className="w-3 h-3 text-destructive" />}
      {label}
    </div>
    <div className="text-3xl font-black italic mt-1" style={{ color: warn ? "#ef4444" : accent ? "#ff6200" : "#fff" }}>
      {value.toLocaleString("pt-BR")}
    </div>
  </div>
);

const Card = ({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) => (
  <div
    className="rounded-xl border bg-card p-4"
    style={{ borderColor: "hsl(var(--primary) / 0.3)", boxShadow: "0 0 24px hsl(var(--primary) / 0.1)" }}
  >
    <div className="flex items-center gap-2 mb-3 text-primary">
      {icon}
      <h3 className="text-sm font-black italic">{title}</h3>
    </div>
    {children}
  </div>
);

export default SocioeconomicProfile;
