/**
 * pdf-export.ts — Helper único para gerar PDFs com a marca Heart Club.
 * Garante header com logo + título Verdana Italic + cores Dark/Neon.
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoUrl from "@/assets/logo.png";

const ORANGE: [number, number, number] = [255, 98, 0];

async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const r = await fetch(logoUrl);
    const blob = await r.blob();
    return await new Promise((res) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result as string);
      fr.onerror = () => res(null);
      fr.readAsDataURL(blob);
    });
  } catch { return null; }
}

export type PdfSection = {
  title: string;
  head: string[];
  body: (string | number)[][];
};

export async function exportBrandedPdf(opts: {
  filename: string;
  title: string;
  subtitle?: string;
  sections: PdfSection[];
}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const today = new Date().toLocaleDateString("pt-BR");
  const logo = await loadLogoDataUrl();

  // Header
  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, W, 110, "F");
  if (logo) {
    try { doc.addImage(logo, "PNG", W - 80, 25, 55, 55); } catch { /* ignore */ }
  }
  doc.setTextColor(...ORANGE);
  doc.setFont("helvetica", "bolditalic");
  doc.setFontSize(26);
  doc.text("HEART CLUB", 40, 50);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.text(opts.title, 40, 75);
  if (opts.subtitle) {
    doc.setFontSize(9);
    doc.text(opts.subtitle, 40, 92);
  }
  doc.setFontSize(8);
  doc.text(`Gerado em ${today}`, 40, 105);

  let y = 140;
  doc.setTextColor(0, 0, 0);

  for (const sec of opts.sections) {
    doc.setFont("helvetica", "bolditalic");
    doc.setFontSize(13);
    doc.setTextColor(...ORANGE);
    doc.text(sec.title, 40, y);
    autoTable(doc, {
      startY: y + 8,
      theme: "grid",
      headStyles: { fillColor: ORANGE, textColor: 255, fontStyle: "bold" },
      head: [sec.head],
      body: sec.body.map((r) => r.map((c) => String(c ?? ""))),
      styles: { fontSize: 9 },
      margin: { left: 40, right: 40 },
    });
    y = (doc as any).lastAutoTable.finalY + 30;
    if (y > doc.internal.pageSize.getHeight() - 80) {
      doc.addPage();
      y = 60;
    }
  }

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Heart Club — Auditoria de Comportamento Ativa  •  Página ${i}/${pageCount}`,
      W / 2, doc.internal.pageSize.getHeight() - 20, { align: "center" });
  }

  doc.save(opts.filename);
}
