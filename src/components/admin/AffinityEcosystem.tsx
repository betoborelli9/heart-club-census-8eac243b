/**
 * [CAMINHO]: src/components/admin/AffinityEcosystem.tsx
 * [STATUS]: PRODUÇÃO - v1.0
 * [CONTEXTO]: Ecossistema de Afinidades por Clube — Análise de Propensão de Consumo
 * Network graph (hub-and-spoke) + Top afinidades + Export PDF + Motor de Afiliados.
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Network, Download, Search, ShoppingBag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ClubLogo } from "@/components/ClubLogo";
import { useClubLogos, normalizeClubName } from "@/lib/club-logo-resolver";

type Affinity = { club: string; value: number; pct: number };
type Eco = { club: string; total_fans: number; affinities: Affinity[] };

export default function AffinityEcosystem() {
  const { toast } = useToast();
  const [clubQuery, setClubQuery] = useState("");
  const [club, setClub] = useState("");
  const [data, setData] = useState<Eco | null>(null);
  const [loading, setLoading] = useState(false);
  const [topClubs, setTopClubs] = useState<string[]>([]);

  // Pre-load top clubs to suggest
  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_club_vote_ranking", { p_limit: 30 });
      const arr = (data as any[] | null) ?? [];
      setTopClubs(arr.map((r) => r.club));
    })();
  }, []);

  const load = async (target: string) => {
    if (!target.trim()) return;
    setLoading(true);
    setData(null);
    try {
      const { data, error } = await supabase.rpc("admin_get_affinity_ecosystem", {
        p_club: target.trim(),
        p_limit: 12,
      });
      if (error) throw error;
      setData(data as Eco);
      setClub(target.trim());
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro ao carregar ecossistema", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const exportPdf = () => {
    if (!data) return;
    const doc = new jsPDF();
    doc.setFillColor(0, 0, 0);
    doc.rect(0, 0, 210, 28, "F");
    doc.setTextColor(255, 98, 0);
    doc.setFont("helvetica", "bolditalic");
    doc.setFontSize(16);
    doc.text("HEART CLUB", 14, 12);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.text("Análise de Propensão de Consumo", 14, 20);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(13);
    doc.text(`Ecossistema de Afinidades — ${data.club}`, 14, 38);
    doc.setFontSize(10);
    doc.text(`Total de torcedores analisados: ${data.total_fans}`, 14, 46);

    autoTable(doc, {
      startY: 52,
      head: [["#", "Clube Afim", "Torcedores", "Propensão (%)"]],
      body: data.affinities.map((a, i) => [i + 1, a.club, a.value, `${a.pct ?? 0}%`]),
      headStyles: { fillColor: [255, 98, 0], textColor: 255, fontStyle: "bold" },
      styles: { font: "helvetica", fontSize: 10 },
    });
    doc.save(`afinidades_${data.club.replace(/\s+/g, "_")}.pdf`);
  };

  // Network graph (hub-and-spoke SVG)
  const graph = useMemo(() => {
    if (!data || !data.affinities.length) return null;
    const cx = 300, cy = 220, r = 170;
    const items = data.affinities.slice(0, 10);
    return items.map((a, i) => {
      const angle = (i / items.length) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      const strength = Math.max(1, (a.pct ?? 0) / 8);
      return { ...a, x, y, strength, cx, cy };
    });
  }, [data]);

  const logoNames = data ? [data.club, ...data.affinities.map((a: any) => a.club)] : [];
  const clubLogoMap = useClubLogos(logoNames);
  const logoFor = (name: string) => clubLogoMap[normalizeClubName(name)];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-6 border border-primary/30 bg-gradient-to-br from-black to-zinc-900 shadow-[0_0_40px_rgba(255,98,0,0.15)]">
        <div className="flex items-center gap-3 mb-2">
          <Network className="text-primary" />
          <h2 className="text-2xl font-black italic uppercase tracking-tight">
            Ecossistema de Afinidades
          </h2>
        </div>
        <p className="text-xs italic opacity-60 max-w-2xl">
          Mapa de propensão de consumo: descubra com quais clubes os torcedores de um time específico
          também simpatizam — base para campanhas, afiliados e licenciamentos.
        </p>

        <div className="flex flex-wrap gap-2 mt-5">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary opacity-60" />
            <Input
              placeholder="Buscar clube principal (ex: Flamengo, Remo, Real Madrid)"
              className="pl-10 bg-black/50 border-white/10"
              value={clubQuery}
              onChange={(e) => setClubQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load(clubQuery)}
              list="top-clubs-list"
            />
            <datalist id="top-clubs-list">
              {topClubs.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <Button onClick={() => load(clubQuery)} disabled={loading} className="btn-orange-gradient font-black italic">
            {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Analisar"}
          </Button>
          {data && (
            <Button onClick={exportPdf} variant="outline" className="border-primary/40 font-black italic">
              <Download className="w-4 h-4 mr-1" /> PDF ROI
            </Button>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>
      )}

      {data && !loading && (
        <>
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Network graph */}
            <div className="rounded-2xl border border-white/10 bg-black/60 p-4">
              <h3 className="text-sm font-black italic uppercase mb-3 text-primary">
                Rede de Conexões
              </h3>
              <svg viewBox="0 0 600 440" className="w-full h-auto">
                {/* edges */}
                {graph?.map((n, i) => (
                  <line
                    key={`e-${i}`}
                    x1={n.cx} y1={n.cy} x2={n.x} y2={n.y}
                    stroke="hsl(20 100% 50% / 0.5)" strokeWidth={n.strength}
                  />
                ))}
                {/* hub */}
                <circle cx={300} cy={220} r={48} fill="hsl(20 100% 50%)" />
                <text x={300} y={218} textAnchor="middle" fill="#000" fontSize="11" fontWeight="900" fontStyle="italic">
                  {data.club.length > 14 ? data.club.slice(0, 12) + "…" : data.club}
                </text>
                <text x={300} y={232} textAnchor="middle" fill="#000" fontSize="9" fontWeight="700">
                  {data.total_fans} fãs
                </text>
                {/* nodes */}
                {graph?.map((n, i) => (
                  <g key={`n-${i}`}>
                    <circle cx={n.x} cy={n.y} r={20 + n.strength * 1.5} fill="#1a1a1a" stroke="hsl(20 100% 50%)" strokeWidth={1.5} />
                    <text x={n.x} y={n.y - 1} textAnchor="middle" fill="#fff" fontSize="9" fontWeight="800" fontStyle="italic">
                      {n.club.length > 10 ? n.club.slice(0, 9) + "…" : n.club}
                    </text>
                    <text x={n.x} y={n.y + 11} textAnchor="middle" fill="hsl(20 100% 60%)" fontSize="9" fontWeight="900">
                      {n.pct}%
                    </text>
                  </g>
                ))}
              </svg>
            </div>

            {/* Ranking */}
            <div className="rounded-2xl border border-white/10 bg-black/60 p-4">
              <h3 className="text-sm font-black italic uppercase mb-3 text-primary">
                Top Afinidades — Propensão de Consumo
              </h3>
              <div className="space-y-2">
                {data.affinities.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                    <div className="text-primary font-black italic w-6">{i + 1}.</div>
                    <ClubLogo src={logoFor(a.club)} alt={a.club} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold italic truncate">{a.club}</p>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mt-1">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-orange-300"
                          style={{ width: `${Math.min(100, (a.pct ?? 0))}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-primary font-black italic">{a.pct}%</div>
                      <div className="text-[10px] opacity-60">{a.value} fãs</div>
                    </div>
                  </div>
                ))}
                {!data.affinities.length && (
                  <p className="text-xs italic opacity-60 py-6 text-center">
                    Nenhuma afinidade registrada ainda para este clube.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Affiliate engine preview */}
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-orange-950/40 to-black p-5">
            <div className="flex items-center gap-2 mb-3">
              <ShoppingBag className="text-primary w-5 h-5" />
              <h3 className="text-sm font-black italic uppercase">Motor de Afiliados — Top 5 Recomendados</h3>
            </div>
            <p className="text-xs italic opacity-60 mb-4">
              Banners priorizados por simpatia + força regional. Cada torcedor de <b>{data.club}</b> verá
              produtos dos clubes abaixo, ordenados por propensão.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[{ club: data.club, pct: 100, main: true }, ...data.affinities.slice(0, 4)].map((a: any, i) => (
                <div key={i} className={`rounded-xl p-3 text-center border ${a.main ? "border-primary bg-primary/10" : "border-white/10 bg-white/5"}`}>
                  <div className="text-[9px] uppercase opacity-60 italic font-black">
                    {a.main ? "Principal" : `Afinidade ${i}`}
                  </div>
                  <ClubLogo src={logoFor(a.club)} alt={a.club} size="md" />
                  <p className="text-xs font-black italic mt-1 truncate">{a.club}</p>
                  <p className="text-primary font-black italic text-sm">{a.pct ?? 0}%</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {!data && !loading && (
        <div className="rounded-2xl border border-white/10 bg-black/40 p-12 text-center">
          <Network className="w-12 h-12 text-primary/40 mx-auto mb-3" />
          <p className="italic opacity-60">Selecione um clube para gerar o ecossistema de afinidades.</p>
        </div>
      )}
    </div>
  );
}
