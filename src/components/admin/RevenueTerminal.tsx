/**
 * [CAMINHO]: src/components/admin/RevenueTerminal.tsx
 * [STATUS]: PRODUÇÃO - v1.0
 * [CONTEXTO]: Dashboard de Faturamento "Bloomberg Terminal" — calcula
 * Valor de Tráfego Gerado = (Cliques + Page-views Stats) × CPC sugerido.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, DollarSign, MousePointerClick, Eye, Activity } from "lucide-react";
import { Input } from "@/components/ui/input";

const DEFAULT_CPC = 0.85; // BRL — média sugerida AdSense esportes BR
const STATS_VIEW_KEY = "heartclub_stats_views";

export default function RevenueTerminal({ days = 30 }: { days?: number }) {
  const [cpc, setCpc] = useState(DEFAULT_CPC);
  const [clicks, setClicks] = useState(0);
  const [statsViews, setStatsViews] = useState(0);
  const [totalVotes, setTotalVotes] = useState(0);
  const [partnerBreak, setPartnerBreak] = useState<{ name: string; clicks: number }[]>([]);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const [{ count: clickCount }, { count: voteCount }, { data: parts }] = await Promise.all([
        supabase.from("partner_clicks").select("*", { count: "exact", head: true }).gte("created_at", since),
        supabase.from("votos").select("*", { count: "exact", head: true }).gte("created_at", since),
        supabase.rpc("admin_get_executive_summary", { p_days: days }),
      ]);
      setClicks(clickCount || 0);
      setTotalVotes(voteCount || 0);
      setPartnerBreak(((parts as any)?.partner_performance || []).map((p: any) => ({ name: p.partner_name || "—", clicks: p.clicks })));
      // Stats page views — local proxy (each /stats visit increments LS)
      const sv = parseInt(localStorage.getItem(STATS_VIEW_KEY) || "0", 10);
      setStatsViews(sv);
    })();
  }, [days]);

  const totalImpressions = clicks + statsViews;
  const revenue = totalImpressions * cpc;
  const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="rounded-2xl border border-green-500/30 bg-black p-5 font-mono shadow-[0_0_40px_rgba(34,197,94,0.1)]">
      <header className="flex items-center justify-between border-b border-green-500/20 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Activity className="text-green-400 w-5 h-5 animate-pulse" />
          <h2 className="text-sm font-black italic uppercase tracking-widest text-green-400">
            HC TERMINAL — REVENUE FEED
          </h2>
        </div>
        <span className="text-[10px] text-green-400/60 italic">LIVE • últimos {days}d</span>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Cell label="Cliques Afiliados" value={clicks.toString()} icon={<MousePointerClick className="w-3 h-3" />} />
        <Cell label="Views /Stats" value={statsViews.toString()} icon={<Eye className="w-3 h-3" />} />
        <Cell label="Impressões Totais" value={totalImpressions.toString()} icon={<TrendingUp className="w-3 h-3" />} />
        <Cell label="Votos Período" value={totalVotes.toString()} icon={<Activity className="w-3 h-3" />} />
      </div>

      <div className="rounded-xl border border-primary/40 bg-gradient-to-br from-orange-950/30 to-black p-4 mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-primary uppercase italic tracking-widest font-bold">
            Receita de Mídia Estimada
          </span>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-green-400/60">CPC R$</span>
            <Input
              type="number"
              step="0.05"
              value={cpc}
              onChange={(e) => setCpc(parseFloat(e.target.value) || 0)}
              className="w-20 h-6 bg-black border-green-500/30 text-green-400 text-[10px] font-mono"
            />
          </div>
        </div>
        <p className="text-3xl md:text-4xl font-black italic text-green-400 tracking-tighter flex items-center gap-2">
          <DollarSign className="w-7 h-7" />
          {fmt(revenue)}
        </p>
        <p className="text-[10px] text-green-400/60 italic mt-1">
          ({totalImpressions.toLocaleString("pt-BR")} impressões × {fmt(cpc)} CPC)
        </p>
      </div>

      {partnerBreak.length > 0 && (
        <div>
          <h3 className="text-[10px] text-green-400/80 uppercase italic tracking-widest mb-2">
            ▌ Breakdown por Parceiro
          </h3>
          <div className="space-y-1">
            {partnerBreak.map((p) => (
              <div key={p.name} className="flex items-center justify-between text-[11px] text-green-400 border-b border-green-500/10 py-1">
                <span className="italic">{p.name}</span>
                <span className="font-bold">{p.clicks} clk → {fmt(p.clicks * cpc)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Cell({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
      <div className="flex items-center gap-1 text-[9px] text-green-400/70 uppercase italic tracking-wider">
        {icon} {label}
      </div>
      <div className="text-xl font-black italic text-green-400 mt-1">{value}</div>
    </div>
  );
}
