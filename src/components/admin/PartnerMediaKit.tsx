/**
 * [CAMINHO]: src/components/admin/PartnerMediaKit.tsx
 * [MÓDULO]: Mídia Kit por clube — PDF pronto pra mostrar a patrocinadores,
 * com número real de torcedores, alcance geográfico e acessos (site+app).
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Handshake, FileDown, Loader2 } from "lucide-react";
import { exportBrandedPdf } from "@/lib/pdf-export";
import { useToast } from "@/hooks/use-toast";

type KitData = {
  clube: string;
  total_votos: number;
  paises: number;
  top_estados: { estado: string; total: number }[];
  top_cidades: { cidade: string; total: number }[];
  acessos_30d: number;
  acessos_30d_unicos: number;
  acessos_web_30d: number;
  acessos_app_30d: number;
};

export default function PartnerMediaKit() {
  const { toast } = useToast();
  const [clubNames, setClubNames] = useState<string[]>([]);
  const [club, setClub] = useState("");

  useEffect(() => {
    (async () => {
      // Lista vem do banco (clubes com voto real registrado), não de um
      // arquivo estático — src/clubes-data.ts é mantido vazio de propósito
      // no projeto pra forçar uso do Supabase como fonte única de verdade.
      const { data } = await supabase
        .from("votos")
        .select("clube_nome")
        .eq("is_original_vote", true);
      const names = [...new Set((data || []).map((r: any) => r.clube_nome).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      );
      setClubNames(names);
      setClub((prev) => prev || names[0] || "");
    })();
  }, []);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!club) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_get_club_media_kit", { p_club: club });
      if (error) throw error;
      const kit = data as unknown as KitData;

      await exportBrandedPdf({
        filename: `heartclub-midiakit-${club.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.pdf`,
        title: `Mídia Kit — ${kit.clube}`,
        subtitle: `Heart Club · Dados reais em ${new Date().toLocaleDateString("pt-BR")}`,
        sections: [
          {
            title: "Alcance da Torcida",
            head: ["Métrica", "Valor"],
            body: [
              ["Torcedores cadastrados", kit.total_votos],
              ["Países alcançados", kit.paises],
              ["Acessos (últimos 30 dias)", kit.acessos_30d],
              ["Visitantes únicos (30 dias)", kit.acessos_30d_unicos],
              ["Acessos via site", kit.acessos_web_30d],
              ["Acessos via app Android", kit.acessos_app_30d],
            ],
          },
          {
            title: "Top 5 Estados",
            head: ["Estado", "Torcedores"],
            body: kit.top_estados.map((e) => [e.estado, e.total]),
          },
          {
            title: "Top 5 Cidades",
            head: ["Cidade", "Torcedores"],
            body: kit.top_cidades.map((c) => [c.cidade, c.total]),
          },
        ],
      });
      toast({ title: "Mídia Kit gerado!", description: `PDF de ${club} pronto pra enviar ao parceiro.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Não deu pra gerar", description: e.message || "Tenta de novo." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 max-w-lg space-y-4">
      <h2 className="text-lg font-black italic uppercase tracking-tight flex items-center gap-2">
        <Handshake className="w-5 h-5" /> Mídia Kit para Parceiros
      </h2>
      <p className="text-sm text-muted-foreground">
        Gera um PDF com os números reais de um clube — torcedores, alcance geográfico e acessos —
        pronto pra apresentar a um patrocinador daquele clube.
      </p>
      <div className="flex items-center gap-2">
        <select
          value={club}
          onChange={(e) => setClub(e.target.value)}
          className="flex-1 h-10 rounded-lg border border-border bg-background px-3 text-sm"
        >
          {clubNames.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <Button onClick={generate} disabled={loading || !club}>
          {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <FileDown className="w-4 h-4 mr-1" />}
          Gerar PDF
        </Button>
      </div>
    </div>
  );
}
