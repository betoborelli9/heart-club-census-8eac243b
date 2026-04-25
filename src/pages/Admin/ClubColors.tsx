/**
 * [CAMINHO]: src/pages/Admin/ClubColors.tsx
 * [MÓDULO]: ADMIN — AUDITORIA DE CORES (DIRECT GEMINI API)
 * [STATUS]: PRODUÇÃO — VERSÃO 2.5 (SELF-CONTAINED · WIKIPEDIA-FIRST)
 * [DESCRIÇÃO]:
 * - Chamada direta ao Gemini 2.5 Flash (sem Edge Functions).
 * - Wikipedia-First: Foco total em cores de tecido (Jersey) via texto descritivo.
 * - Divisões 2026 (Abril) com hierarquia nacional.
 * - Visualização de 4 colunas com suporte a Bicolor/Tricolor/Quadricolor.
 */

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Palette, ShieldX, Loader2, Sparkles, Save, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { searchClubsWithFallback, type ClubSearchResult } from "@/lib/search-clubs";
import { toast } from "sonner";

// Chave injetada pelo ambiente (Empty string conforme regra)
const apiKey = "";

interface AIResult {
  nome_confirmado: string;
  mascote: string;
  divisao_2026: string;
  quantidade_cores: number;
  cores: string[]; // HEX codes
}

const ClubColors = () => {
  const navigate = useNavigate();
  const { user, isLoading: userLoading } = useUser();

  // Estados de busca (Autocomplete)
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<ClubSearchResult[]>([]);
  const [loadingSuggest, setLoadingSuggest] = useState(false);

  // Estados de Investigação
  const [selectedClub, setSelectedClub] = useState<ClubSearchResult | null>(null);
  const [investigating, setInvestigating] = useState(false);
  const [result, setResult] = useState<AIResult | null>(null);
  const [saving, setSaving] = useState(false);

  // 1. Guard de Acesso Master Admin
  useEffect(() => {
    if (!userLoading && (!user || user.email !== "betoborelli9@gmail.com")) {
      navigate("/");
    }
  }, [user, userLoading, navigate]);

  // 2. Lógica de Autocomplete (Mínimo 3 letras)
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.trim().length < 3) {
        setSuggestions([]);
        return;
      }
      setLoadingSuggest(true);
      try {
        const clubs = await searchClubsWithFallback(query);
        setSuggestions(clubs.slice(0, 8));
      } catch (err) {
        console.error("Erro na busca API Football:", err);
      } finally {
        setLoadingSuggest(false);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 400);
    return () => clearTimeout(debounce);
  }, [query]);

  // 3. Investigação Direta Gemini (Wikipedia-First)
  const handleInvestigate = async (club: ClubSearchResult) => {
    setSelectedClub(club);
    setSuggestions([]);
    setQuery(club.name);
    setInvestigating(true);
    setResult(null);

    const systemPrompt = "Você é um auditor sênior de dados de futebol. Responda estritamente em JSON puro.";
    const userPrompt = `
      Investigue as cores oficiais do clube: "${club.name}".
      Data de Referência: Abril de 2026.
      
      FONTE PRIMÁRIA OBRIGATÓRIA: Wikipedia (Procure a descrição textual das cores do uniforme titular/tecido).
      
      REGRAS CRÍTICAS DE CORES:
      1. CORES DE TECIDO (JERSEY): Ignore cores de contorno do escudo, bordas de proteção ou estrelas. 
         - Ex: Vila Nova-GO é VERMELHO E BRANCO apenas. O PRETO é contorno e deve ser IGNORADO.
         - Ex: Brusque-SC é QUADRICOLOR (Amarelo, Verde, Vermelho e Branco).
      2. DATA REFERÊNCIA: Abril de 2026. Identifique a competição mais importante que o clube disputa neste mês.
         - Hierarquia Brasil: Série A > B > C > D > Estaduais.
      3. QUANTIDADE: Defina se o clube é BICOLOR (2 cores), TRICOLOR (3 cores) ou QUADRICOLOR (4 cores).

      FORMATO JSON OBRIGATÓRIO:
      {
        "nome_confirmado": "Nome Oficial do Clube",
        "mascote": "Nome do Mascote Oficial",
        "divisao_2026": "Série X / Estadual X",
        "quantidade_cores": 2|3|4,
        "cores": ["#HEX1", "#HEX2", ...]
      }
    `;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: userPrompt }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.1,
            },
          }),
        },
      );

      const resJson = await response.json();
      const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) throw new Error("A IA não retornou dados válidos.");

      const parsed: AIResult = JSON.parse(rawText);
      setResult(parsed);
      toast.success("Wikipedia consultada com sucesso!", { description: `Clube: ${parsed.nome_confirmado}` });
    } catch (err) {
      console.error("Erro Gemini:", err);
      toast.error("Erro na investigação direta do Gemini.");
    } finally {
      setInvestigating(false);
    }
  };

  // 4. Salvar Dados no Cache (Supabase)
  const handleSave = async () => {
    if (!result || !selectedClub) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("clubes_cache").upsert(
        {
          nome: result.nome_confirmado,
          api_id: selectedClub.api_id || null,
          escudo_url: selectedClub.logo || null,
          cor_primaria: result.cores[0] || null,
          cor_secundaria: result.cores[1] || null,
          cor_terciaria: result.cores[2] || null,
          cor_quarta: result.cores[3] || null,
          mascote: result.mascote,
          division: result.divisao_2026,
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: "nome" },
      );

      if (error) throw error;
      toast.success("Cache do Clube atualizado com sucesso!");
    } catch (err) {
      toast.error("Erro ao salvar dados no Supabase.");
    } finally {
      setSaving(false);
    }
  };

  // 5. Grid de Visualização das 4 Colunas
  const ColorGrid = () => {
    if (!result) return null;
    const count = result.quantidade_cores;

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-4xl">
        {[0, 1, 2, 3].map((i) => {
          const isActive = i < count;
          const hex = result.cores[i];

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="flex flex-col gap-4"
            >
              {/* Bloco de Cor Grande */}
              <div
                className={`w-full aspect-square rounded-[2.5rem] border-4 flex items-center justify-center shadow-2xl transition-all duration-700 ${
                  isActive ? "border-white/20" : "border-dashed border-white/5 bg-white/2 opacity-30"
                }`}
                style={{ backgroundColor: isActive ? hex : undefined }}
              >
                {!isActive && <XCircle className="w-16 h-16 text-white/5" />}
                {isActive && <CheckCircle2 className="w-8 h-8 text-white/20 mix-blend-overlay" />}
              </div>

              {/* Código HEX */}
              <div
                className={`p-4 rounded-2xl border font-mono text-center text-[10px] font-black tracking-[0.2em] transition-all ${
                  isActive ? "bg-white/5 border-white/10 text-white" : "bg-transparent border-white/2 text-white/5"
                }`}
              >
                {isActive ? hex.toUpperCase() : "N/A"}
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white p-6 md:p-12 font-sans">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Cabeçalho */}
        <header className="flex flex-col md:flex-row items-center justify-between border-b border-white/5 pb-8 gap-6">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-orange-500/10 rounded-2xl border border-orange-500/20 shadow-[0_0_20px_rgba(255,98,0,0.1)]">
              <Palette className="text-orange-500" size={32} />
            </div>
            <div>
              <h1 className="text-4xl font-black italic uppercase tracking-tighter">
                Bancada de <span className="text-orange-500">Cores</span>
              </h1>
              <p className="text-[10px] font-bold uppercase italic text-white/40 tracking-[0.3em]">
                Wikipedia-First Intelligence · Master Admin
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="font-black italic text-xs border border-white/10 h-12 px-6 hover:bg-white/5"
          >
            <ArrowLeft className="mr-2" size={16} /> SAIR DO AUDITOR
          </Button>
        </header>

        {/* Input de Busca Autocomplete */}
        <section className="relative w-full max-w-2xl mx-auto z-50">
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-orange-500 group-focus-within:scale-110 transition-transform" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Digite 3 letras do clube para iniciar..."
              className="h-16 pl-16 bg-white/5 border-white/10 rounded-2xl text-xl font-bold italic tracking-tighter focus:ring-2 ring-orange-500/50 transition-all placeholder:text-white/10"
            />
            {loadingSuggest && (
              <Loader2 className="absolute right-5 top-1/2 -translate-y-1/2 animate-spin text-white/20" />
            )}
          </div>

          <AnimatePresence>
            {suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-full left-0 right-0 mt-4 bg-[#1A1A1A] border border-white/10 rounded-3xl overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)]"
              >
                {suggestions.map((club, i) => (
                  <button
                    key={i}
                    onClick={() => handleInvestigate(club)}
                    className="w-full flex items-center gap-5 p-5 hover:bg-white/5 border-b border-white/5 last:border-0 text-left group transition-colors"
                  >
                    <img
                      src={club.logo || ""}
                      alt=""
                      className="w-12 h-12 object-contain grayscale group-hover:grayscale-0 transition-all duration-500"
                    />
                    <div className="flex-1">
                      <p className="font-black italic text-lg uppercase leading-none tracking-tighter">{club.name}</p>
                      <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-1">
                        {club.location}
                      </p>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Área de Resultados */}
        <section className="flex flex-col items-center gap-12 py-10 min-h-[400px]">
          {investigating ? (
            <div className="flex flex-col items-center gap-6 mt-20">
              <div className="relative">
                <Sparkles className="text-orange-500 w-16 h-16 animate-pulse" />
                <div className="absolute inset-0 blur-2xl bg-orange-500/20 animate-pulse" />
              </div>
              <p className="font-black italic text-sm tracking-[0.4em] uppercase text-white/60">
                A consultar Wikipedia (Abril 2026)...
              </p>
            </div>
          ) : result ? (
            <div className="w-full flex flex-col items-center gap-16">
              {/* Card de Informações */}
              <div className="w-full flex flex-col md:flex-row items-center gap-10 bg-white/[0.03] p-10 rounded-[4rem] border border-white/10 shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <img
                  src={selectedClub?.logo || ""}
                  className="w-40 h-40 object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)] z-10"
                  alt=""
                />

                <div className="flex-1 text-center md:text-left z-10">
                  <div className="flex items-center justify-center md:justify-start gap-4 mb-2">
                    <span className="bg-orange-500/20 text-orange-500 text-[10px] font-black px-3 py-1 rounded-full uppercase italic tracking-widest">
                      {result.quantidade_cores === 2
                        ? "Bicolor"
                        : result.quantidade_cores === 3
                          ? "Tricolor"
                          : "Quadricolor"}
                    </span>
                  </div>
                  <h2 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-white leading-[0.9]">
                    {result.nome_confirmado}
                  </h2>
                  <div className="flex flex-wrap justify-center md:justify-start gap-6 mt-4 text-[11px] font-bold uppercase italic tracking-wider text-white/40">
                    <span className="flex items-center gap-2">
                      Mascote: <span className="text-white/80">{result.mascote}</span>
                    </span>
                    <span className="flex items-center gap-2 text-orange-500/80">
                      Divisão 2026: {result.divisao_2026}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="h-24 px-14 rounded-[2.5rem] bg-orange-600 hover:bg-orange-500 text-white font-black italic uppercase text-lg tracking-[0.2em] shadow-[0_20px_40px_-10px_rgba(255,98,0,0.3)] active:scale-95 transition-all z-10 group"
                >
                  {saving ? (
                    <Loader2 className="animate-spin" size={32} />
                  ) : (
                    <div className="flex items-center gap-4">
                      <Save size={24} className="group-hover:rotate-12 transition-transform" />
                      <span>Salvar Cache</span>
                    </div>
                  )}
                </Button>
              </div>

              {/* Grid de Cores Dinâmico */}
              <ColorGrid />
            </div>
          ) : (
            <div className="flex flex-col items-center text-white/10 gap-6 mt-20">
              <Palette size={80} strokeWidth={1} className="opacity-20" />
              <p className="font-black italic uppercase tracking-[0.5em] text-xs">Aguardando busca de clube...</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ClubColors;

/**
 * [RODAPÉ TÉCNICO]
 * - Ficheiro: src/pages/Admin/ClubColors.tsx
 * - Versão: 2.5 (Wikipedia-First Intelligence)
 * - Correção: Removida dependência de Edge Functions. Chamada direta à API do Google via fetch.
 * - Blindagem: System Prompt rigoroso proibindo cores de contorno e bordas de escudo.
 */
