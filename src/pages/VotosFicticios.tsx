/**
 * [CAMINHO/ARQUIVO]: src/pages/VotosFicticios.tsx
 * [MÓDULO]: ADMIN — GERAÇÃO DE VOTOS FICTÍCIOS PARA TESTE
 * [STATUS]: TESTE (Mapa de Calor / Estatísticas / Ranking / Embaixadores)
 * Restrito ao master admin: betoborelli9@gmail.com
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Beaker, Trash2, BarChart3, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const MASTER_EMAIL = "betoborelli9@gmail.com";

interface Summary {
  total: number;
  clubes: number;
  paises: number;
  cidades: number;
}

const VotosFicticios = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useUser();
  const [quantidade, setQuantidade] = useState(5000);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [working, setWorking] = useState(false);

  /* [BLOCO: GUARDA DE ACESSO] */
  useEffect(() => {
    if (isLoading) return;
    if (!user || user.email !== MASTER_EMAIL) {
      navigate("/dashboard");
    }
  }, [user, isLoading, navigate]);

  const fetchSummary = async () => {
    const { data, error } = await supabase.rpc("fake_votes_summary");
    if (error) {
      toast.error("Erro ao carregar resumo: " + error.message);
      return;
    }
    setSummary(data as unknown as Summary);
  };

  useEffect(() => {
    if (user?.email === MASTER_EMAIL) fetchSummary();
  }, [user]);

  const handleSeed = async () => {
    if (quantidade < 1 || quantidade > 50000) {
      toast.error("Quantidade entre 1 e 50.000.");
      return;
    }
    setWorking(true);
    const { data, error } = await supabase.rpc("seed_fake_votes", { p_quantidade: quantidade });
    setWorking(false);
    if (error) {
      toast.error("Falha ao gerar votos: " + error.message);
      return;
    }
    const inseridos = (data as any)?.inseridos ?? quantidade;
    toast.success(`✅ ${inseridos.toLocaleString("pt-BR")} votos fictícios gerados!`);
    fetchSummary();
  };

  const handlePurge = async () => {
    if (!confirm("Remover TODOS os votos fictícios? (votos reais não serão afetados)")) return;
    setWorking(true);
    const { data, error } = await supabase.rpc("purge_fake_votes");
    setWorking(false);
    if (error) {
      toast.error("Erro ao limpar: " + error.message);
      return;
    }
    const removidos = (data as any)?.removidos ?? 0;
    toast.success(`🧹 ${removidos.toLocaleString("pt-BR")} votos removidos.`);
    fetchSummary();
  };

  const handlePurgeInvalid = async () => {
    if (!confirm("Remover votos fictícios sem bairro ou com bairros que não existem no cache oficial?")) return;
    setWorking(true);
    const { data, error } = await supabase.rpc("purge_invalid_fake_votes");
    setWorking(false);
    if (error) {
      toast.error("Erro ao limpar inválidos: " + error.message);
      return;
    }
    const removidos = (data as any)?.removidos ?? 0;
    toast.success(`🧹 ${removidos.toLocaleString("pt-BR")} votos inválidos removidos.`);
    fetchSummary();
  };

  if (isLoading || !user) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <Loader2 className="animate-spin text-[#ff6200] w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="h-16 border-b border-white/10 sticky top-0 bg-black/90 backdrop-blur-xl z-50">
        <div className="max-w-4xl mx-auto px-4 h-full flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="text-white/70 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" /> Dashboard
          </Button>
          <h1 className="font-black italic uppercase tracking-tight text-lg text-[#ff6200]">
            🧪 Votos Fictícios
          </h1>
          <div className="w-24" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10 space-y-8">
        {/* [BLOCO: AVISO] */}
        <div className="rounded-2xl border border-[#ff6200]/40 bg-[#ff6200]/5 p-5">
          <p className="text-sm text-white/80 leading-relaxed">
            <span className="font-black italic uppercase text-[#ff6200]">Modo de Teste:</span> esta
            ferramenta gera votos sintéticos para validar Mapa de Calor, Estatísticas, Ranking e
            Embaixadores. Os votos fictícios são marcados como <code className="bg-black/40 px-1.5 py-0.5 rounded">status_integridade='ficticio'</code> e
            <strong> não interferem</strong> nos votos reais (Voto Sagrado).
          </p>
        </div>

        {/* [BLOCO: RESUMO] */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Votos Fictícios", value: summary?.total ?? 0 },
            { label: "Clubes", value: summary?.clubes ?? 0 },
            { label: "Países", value: summary?.paises ?? 0 },
            { label: "Cidades", value: summary?.cidades ?? 0 },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wider text-white/50 font-bold">{s.label}</p>
              <p className="text-3xl font-black italic mt-1">{s.value.toLocaleString("pt-BR")}</p>
            </div>
          ))}
        </section>

        {/* [BLOCO: GERADOR] */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
          <h2 className="font-black italic uppercase tracking-tight text-xl flex items-center gap-2">
            <Beaker className="w-5 h-5 text-[#ff6200]" /> Gerar Votos
          </h2>
          <p className="text-sm text-white/60">
            Distribui aleatoriamente entre todos os clubes do <code>clubes_cache</code>, com 70% no
            Brasil (15 cidades) e 30% no exterior (16 cidades em 11 países / 6 continentes).
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              type="number"
              min={1}
              max={50000}
              value={quantidade}
              onChange={(e) => setQuantidade(parseInt(e.target.value) || 0)}
              className="bg-black/50 border-white/20 text-white"
              placeholder="Quantidade (ex: 5000)"
            />
            <Button
              onClick={handleSeed}
              disabled={working}
              className="bg-[#ff6200] hover:bg-[#ff6200]/90 text-black font-black italic uppercase"
            >
              {working ? <Loader2 className="w-4 h-4 animate-spin" /> : "Gerar"}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {[1000, 5000, 10000, 25000].map((n) => (
              <Button
                key={n}
                size="sm"
                variant="outline"
                className="border-white/20 text-white/80"
                onClick={() => setQuantidade(n)}
              >
                {n.toLocaleString("pt-BR")}
              </Button>
            ))}
          </div>
        </section>

        {/* [BLOCO: AÇÕES SECUNDÁRIAS] */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button
            onClick={() => navigate("/mapa-calor")}
            variant="outline"
            className="border-white/20 text-white h-14 font-black italic uppercase"
          >
            <BarChart3 className="w-4 h-4 mr-2" /> Ver Mapa de Calor
          </Button>
          <Button
            onClick={handlePurge}
            disabled={working}
            variant="outline"
            className="border-red-500/40 text-red-400 hover:bg-red-500/10 h-14 font-black italic uppercase"
          >
            <Trash2 className="w-4 h-4 mr-2" /> Limpar Fictícios
          </Button>
        </section>
      </main>
    </div>
  );
};

export default VotosFicticios;
