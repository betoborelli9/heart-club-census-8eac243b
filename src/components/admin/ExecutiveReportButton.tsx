/**
 * ExecutiveReportButton.tsx
 * Gera o Relatório Executivo Mensal (PDF) com:
 * - Resumo geral (votos, usuários, crescimento %)
 * - Ranking de bairros mais ativos
 * - Demografia (idade/gênero)
 * - Performance de cliques de parceiros
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const ExecutiveReportButton = ({ days = 30 }: { days?: number }) => {
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_get_executive_summary", { p_days: days });
      if (error) throw error;
      const s: any = data;

      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const W = doc.internal.pageSize.getWidth();
      const orange = [255, 98, 0] as [number, number, number];
      const today = new Date().toLocaleDateString("pt-BR");

      // Cover
      doc.setFillColor(0, 0, 0);
      doc.rect(0, 0, W, 110, "F");
      doc.setTextColor(...orange);
      doc.setFont("helvetica", "bolditalic");
      doc.setFontSize(28);
      doc.text("HEART CLUB", 40, 50);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.text("Relatório Executivo Mensal", 40, 75);
      doc.setFontSize(10);
      doc.text(`Período: últimos ${s.period_days} dias  •  Gerado em ${today}`, 40, 95);

      // Resumo
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Resumo Geral", 40, 145);

      autoTable(doc, {
        startY: 155,
        theme: "grid",
        headStyles: { fillColor: orange, textColor: 255, fontStyle: "bold" },
        head: [["Métrica", "Valor", "Crescimento"]],
        body: [
          ["Votos totais", String(s.votes_total ?? 0), "—"],
          ["Votos no período", String(s.votes_period ?? 0), s.votes_growth_pct != null ? `${s.votes_growth_pct}%` : "—"],
          ["Usuários totais", String(s.users_total ?? 0), "—"],
          ["Usuários no período", String(s.users_period ?? 0), s.users_growth_pct != null ? `${s.users_growth_pct}%` : "—"],
          ["Tentativas de fraude", String(s.fraud_attempts ?? 0), "—"],
          ["Cliques em parceiros", String(s.partner_clicks_period ?? 0), "—"],
        ],
      });

      // Bairros
      let y = (doc as any).lastAutoTable.finalY + 25;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Top 20 Bairros Mais Ativos", 40, y);
      autoTable(doc, {
        startY: y + 10,
        theme: "striped",
        headStyles: { fillColor: orange, textColor: 255 },
        head: [["#", "Cidade", "Bairro", "Votos"]],
        body: (s.top_neighborhoods || []).map((n: any, i: number) => [
          String(i + 1),
          n.cidade,
          n.bairro,
          String(n.votes),
        ]),
      });

      // Demografia
      y = (doc as any).lastAutoTable.finalY + 25;
      if (y > 700) {
        doc.addPage();
        y = 60;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Demografia — Faixa Etária", 40, y);
      autoTable(doc, {
        startY: y + 10,
        head: [["Faixa", "Usuários"]],
        headStyles: { fillColor: orange, textColor: 255 },
        body: (s.by_age || []).map((r: any) => [r.label, String(r.value)]),
      });

      y = (doc as any).lastAutoTable.finalY + 20;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Demografia — Gênero", 40, y);
      autoTable(doc, {
        startY: y + 10,
        head: [["Gênero", "Usuários"]],
        headStyles: { fillColor: orange, textColor: 255 },
        body: (s.by_gender || []).map((r: any) => [r.label, String(r.value)]),
      });

      // Parceiros
      y = (doc as any).lastAutoTable.finalY + 25;
      if (y > 700) {
        doc.addPage();
        y = 60;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Performance de Parceiros (Cliques)", 40, y);
      autoTable(doc, {
        startY: y + 10,
        head: [["Parceiro", "Cliques"]],
        headStyles: { fillColor: orange, textColor: 255 },
        body: (s.partner_performance || []).length
          ? s.partner_performance.map((p: any) => [p.partner_name || "—", String(p.clicks)])
          : [["Nenhum clique registrado no período", "0"]],
      });

      // Receita de Mídia Estimada (ROI)
      const CPC = 0.85;
      const partnerClicks = (s.partner_clicks_period as number) ?? 0;
      let statsViews = 0;
      try { statsViews = parseInt(localStorage.getItem("heartclub_stats_views") || "0", 10); } catch {}
      const impressions = partnerClicks + statsViews;
      const revenue = impressions * CPC;

      y = (doc as any).lastAutoTable.finalY + 25;
      if (y > 700) { doc.addPage(); y = 60; }
      doc.setFont("helvetica", "bolditalic");
      doc.setFontSize(14);
      doc.setTextColor(...orange);
      doc.text("Receita de Mídia Estimada", 40, y);
      doc.setTextColor(0, 0, 0);
      autoTable(doc, {
        startY: y + 10,
        theme: "grid",
        headStyles: { fillColor: [16, 122, 56], textColor: 255 },
        head: [["Métrica", "Valor"]],
        body: [
          ["Cliques em afiliados", String(partnerClicks)],
          ["Page-views /Stats", String(statsViews)],
          ["Impressões totais", String(impressions)],
          ["CPC sugerido (BRL)", `R$ ${CPC.toFixed(2)}`],
          ["Receita estimada", `R$ ${revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`],
        ],
      });

      // Footer
      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(`Heart Club • Confidencial • Página ${i}/${pages}`, 40, doc.internal.pageSize.getHeight() - 20);
      }

      doc.save(`HeartClub_Executivo_${today.replace(/\//g, "-")}.pdf`);
      toast({ title: "Relatório gerado", description: "PDF baixado com sucesso." });
    } catch (e: any) {
      toast({ title: "Erro ao gerar PDF", description: e.message || "Falha desconhecida", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={generate}
      disabled={loading}
      className="btn-orange-gradient font-bold italic"
      style={{ boxShadow: "0 0 20px hsl(var(--primary) / 0.4)" }}
    >
      {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
      Exportar Relatório Mensal (PDF)
    </Button>
  );
};

export default ExecutiveReportButton;
