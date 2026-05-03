/**
 * [CAMINHO]: src/components/admin/PressReleaseGenerator.tsx
 * [STATUS]: PRODUÇÃO - v1.0
 * [CONTEXTO]: Gerador automático de releases para imprensa — extrai insights
 * (clube com mais ricos, líder de simpatia, bairro engajado da semana).
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Newspaper, Loader2, Copy, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PressReleaseGenerator() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [release, setRelease] = useState<string>("");

  const generate = async () => {
    setLoading(true);
    try {
      // Pull insights in parallel
      const [bi, exec] = await Promise.all([
        supabase.rpc("admin_get_global_bi_stats"),
        supabase.rpc("admin_get_executive_summary", { p_days: 7 }),
      ]);
      const biData: any = bi.data || {};
      const execData: any = exec.data || {};

      // Top club by social class A/B (richest)
      const { data: socio } = await supabase.rpc("admin_get_socioeconomic_profile");
      const sd: any = socio || {};
      const richestClubRow = (sd.top_clubs_by_class || [])
        .filter((r: any) => ["A", "B"].includes((r.class || "").trim()))
        .sort((a: any, b: any) => b.value - a.value)[0];

      const topState = (biData.by_state || [])[0];
      const topCity = (biData.by_city || [])[0];
      const topClub = (biData.by_club || [])[0];
      const topNeigh = (execData.top_neighborhoods || [])[0];
      const today = new Date().toLocaleDateString("pt-BR");

      const text = `RELEASE PARA IMPRENSA — HEART CLUB
${today}

═══════════════════════════════════════════════════════
FURO DE REPORTAGEM: O CENSO DAS PAIXÕES BRASILEIRAS
═══════════════════════════════════════════════════════

A plataforma Heart Club, maior censo digital de torcedores do mundo, divulga
os destaques desta semana com base em ${execData.votes_total ?? 0} votos validados:

🏆 LIDERANÇA NACIONAL
${topClub ? `O ${topClub.label} segue como o clube com mais torcedores cadastrados na plataforma, somando ${topClub.value} votos validados.` : "Análise em coleta — dados insuficientes esta semana."}

💰 O CLUBE COM MAIS RICOS
${richestClubRow ? `Destaque para ${richestClubRow.club}, que lidera como o time com a maior concentração de torcedores nas classes A e B (${richestClubRow.value} torcedores de alto poder aquisitivo identificados).` : "Aguardando massa crítica de dados socioeconômicos para este recorte."}

🌎 LÍDER DE SIMPATIA REGIONAL
${topState && topCity ? `No estado de ${topState.label}, a cidade de ${topCity.label} concentra o maior volume de paixão clubística da semana.` : "Recorte regional indisponível."}

📍 BAIRRO MAIS ENGAJADO DA SEMANA
${topNeigh ? `O bairro ${topNeigh.bairro} (${topNeigh.cidade}) foi o mais engajado dos últimos 7 dias, registrando ${topNeigh.votes} novos votos.` : "Sem destaque de bairro nesta semana."}

📈 CRESCIMENTO
A plataforma cresceu ${execData.votes_growth_pct ?? 0}% em votos e ${execData.users_growth_pct ?? 0}% em usuários nos últimos ${execData.period_days ?? 7} dias.

═══════════════════════════════════════════════════════
SOBRE O HEART CLUB
═══════════════════════════════════════════════════════
O Heart Club é a primeira plataforma de "Voto Sagrado" — onde cada torcedor
declara, de forma única e permanente, lealdade ao seu clube e até quatro
simpatias. A iniciativa mapeia o DNA emocional do esporte brasileiro e mundial.

Contato para imprensa: imprensa@heartclubapp.com
`;
      setRelease(text);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro ao gerar release", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(release);
    toast({ title: "Release copiado para a área de transferência" });
  };

  const download = () => {
    const blob = new Blob([release], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `release_heartclub_${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-black via-zinc-950 to-black p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Newspaper className="text-primary w-5 h-5" />
          <h2 className="text-lg font-black italic uppercase tracking-tight">Central de Imprensa</h2>
        </div>
        <Button onClick={generate} disabled={loading} className="btn-orange-gradient font-black italic">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "🔥 Gerar Furo de Reportagem"}
        </Button>
      </div>
      <p className="text-xs italic opacity-60 mb-4">
        Gera automaticamente um release com os principais destaques da semana —
        clube com mais ricos, líderes de simpatia e bairro mais engajado.
      </p>
      {release && (
        <>
          <div className="flex gap-2 mb-2">
            <Button onClick={copy} variant="outline" size="sm" className="border-primary/40">
              <Copy className="w-3 h-3 mr-1" /> Copiar
            </Button>
            <Button onClick={download} variant="outline" size="sm" className="border-primary/40">
              <Download className="w-3 h-3 mr-1" /> Baixar .txt
            </Button>
          </div>
          <pre className="text-[11px] font-mono whitespace-pre-wrap bg-black border border-green-500/20 rounded-xl p-4 text-green-400 max-h-[500px] overflow-auto">
            {release}
          </pre>
        </>
      )}
    </div>
  );
}
