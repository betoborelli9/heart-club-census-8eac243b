/**
 * [CAMINHO]: src/pages/Admin/ClubColors.tsx
 * [MÓDULO]: ADMIN — AUDITORIA DE CORES (GEMINI 2.5 FLASH + SEARCH)
 * [STATUS]: PRODUÇÃO — VERSÃO 5.0 (VISUAL V4 + INTELIGÊNCIA V3.5)
 * [DESCRIÇÃO]:
 * - Chamada direta ao Gemini 2.5 Flash com Google Search Grounding.
 * - Wikipedia-First: Foco total em cores de tecido (Jersey).
 * - Visualização de 4 colunas (Bicolor, Tricolor, Quadricolor).
 * - Persistência direta na tabela clubes_cache.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Palette, Loader2, Sparkles, Save, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { searchClubsWithFallback, type ClubSearchResult } from "@/lib/search-clubs";
import { toast } from "sonner";

// Chave injetada pelo ambiente ou sua chave manual
const apiKey = "";

interface AIResult {
  nome_confirmado: string;
  mascote: string;
  divisao_2026: string;
  quantidade_cores: number;
  cores: string[];
}

const ClubColors = () => {
  const navigate = useNavigate();
  const { user, isLoading: userLoading } = useUser();

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<ClubSearchResult[]>([]);
  const [loadingSuggest, setLoadingSuggest] = useState(false);

  const [selectedClub, setSelectedClub] = useState<ClubSearchResult | null>(null);
  const [investigating, setInvestigating] = useState(false);
  const [result, setResult] = useState<AIResult | null>(null);
  const [saving, setSaving] = useState(false);

  // 🔒 Proteção de Acesso
  useEffect(() => {
    if (!userLoading && (!user || user.email !== "betoborelli9@gmail.com")) {
      navigate("/");
    }
  }, [user, userLoading, navigate]);

  // 🔎 Autocomplete (API Football)
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
        console.error(err);
      } finally {
        setLoadingSuggest(false);
      }
    };
    const debounce = setTimeout(fetchSuggestions, 400);
    return () => clearTimeout(debounce);
  }, [query]);

  // 🤖 Investigação Gemini (Wikipedia-First + Grounding)
  const handleInvestigate = async (club: ClubSearchResult) => {
    setSelectedClub(club);
    setSuggestions([]);
    setQuery(club.name);
    setInvestigating(true);
    setResult(null);

    const systemPrompt =
      "Você é um auditor sênior de futebol. Sua única fonte de verdade é a Wikipedia. Responda estritamente em JSON puro.";
    const userPrompt = `
      Investigue o clube: "${club.name}".
      Data de Referência: Abril de 2026.
      
      TAREFAS:
      1. Use Google Search para ler a Wikipedia sobre as cores oficiais do uniforme/tecido titular (Jersey).
      2. VETO DE CONTORNO: Ignore cores de bordas de escudo ou estrelas. 
         Ex: Vila Nova-GO é Vermelho e Branco (Bicolor). Ignore o preto.
         Ex: Brusque-SC é Amarelo, Verde, Vermelho e Branco (Quadricolor).
      3. Identifique a Divisão em Abril de 2026 (Série A, B, C, D ou Estadual).
      4. Identifique o Mascote Oficial.

      RETORNE JSON:
      {
        "nome_confirmado": "Nome oficial",
        "mascote": "Mascote",
        "divisao_2026": "Série X",
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
            tools: [{ google_search: {} }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.1,
            },
          }),
        },
      );

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) throw new Error("IA não retornou dados.");
      const parsed: AIResult = JSON.parse(rawText);

      setResult(parsed);
      toast.success("Cores investigadas via Wikipedia");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro na investigação IA", { description: "Verifique a chave da API ou o nome do clube." });
    } finally {
      setInvestigating(false);
    }
  };

  // 💾 Salvar no Supabase
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
      toast.success("Cache atualizado com sucesso!");
    } catch (err) {
      toast.error("Erro ao salvar no banco.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white p-6 md:p-12 font-sans">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* HEADER */}
        <header className="flex flex-col md:flex-row items-center justify-between border-b border-white/5 pb-8 gap-6">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-orange-500/10 rounded-2xl border border-orange-500/20 shadow-[0_0_20px_rgba(255,98,0,0.1)]">
              <Palette className="text-orange-500" size={32} />
            </div>
            <div>
              <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-none">
                Bancada de <span className="text-orange-500">Cores</span>
              </h1>
              <p className="text-[10px] font-bold uppercase italic text-white/40 tracking-[0.3em] mt-1">
                Wikipedia-First Grounding · Versão 5.0
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="font-black italic text-xs border border-white/10 h-12 px-6"
          >
            <ArrowLeft className="mr-2" size={16} /> VOLTAR
          </Button>
        </header>

        {/* BUSCA */}
        <section className="relative w-full max-w-2xl mx-auto z-50">
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-orange-500" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Digite 3 letras do clube..."
              className="h-16 pl-16 bg-white/5 border-white/10 rounded-2xl text-xl font-bold italic tracking-tighter focus:ring-2 ring-orange-500/50"
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
                className="absolute top-full left-0 right-0 mt-4 bg-[#1A1A1A] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
              >
                {suggestions.map((club, i) => (
                  <button
                    key={i}
                    onClick={() => handleInvestigate(club)}
                    className="w-full flex items-center gap-5 p-5 hover:bg-white/5 border-b border-white/5 last:border-0 text-left transition-colors"
                  >
                    <img src={club.logo || ""} alt="" className="w-12 h-12 object-contain" />
                    <div className="flex-1">
                      <p className="font-black italic text-lg uppercase tracking-tighter leading-none">{club.name}</p>
                      <p className="text-[10px] font-bold text-white/30 uppercase mt-1">{club.location}</p>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* RESULTADOS */}
        <section className="flex flex-col items-center gap-12 py-10 min-h-[400px]">
          {investigating ? (
            <div className="flex flex-col items-center gap-6 mt-20">
              <Sparkles className="text-orange-500 w-16 h-16 animate-pulse" />
              <p className="font-black italic text-sm tracking-[0.4em] uppercase text-white/60">
                Pesquisando Wikipedia em tempo real...
              </p>
            </div>
          ) : result ? (
            <div className="w-full flex flex-col items-center gap-16">
              <div className="w-full flex flex-col md:flex-row items-center gap-10 bg-white/[0.03] p-10 rounded-[4rem] border border-white/10 shadow-2xl">
                <img src={selectedClub?.logo || ""} className="w-40 h-40 object-contain drop-shadow-2xl" alt="" />
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-white leading-[0.9]">
                    {result.nome_confirmado}
                  </h2>
                  <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4">
                    <span className="bg-orange-500/20 text-orange-500 text-[10px] font-black px-3 py-1 rounded-full uppercase italic">
                      Mascote: {result.mascote}
                    </span>
                    <span className="bg-white/5 text-white/60 text-[10px] font-black px-3 py-1 rounded-full uppercase italic border border-white/10">
                      {result.divisao_2026}
                    </span>
                  </div>
                </div>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="h-24 px-14 rounded-[2.5rem] bg-orange-600 hover:bg-orange-500 font-black italic uppercase text-lg shadow-xl shadow-orange-500/20"
                >
                  {saving ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <>
                      <Save className="mr-3" /> SALVAR CACHE
                    </>
                  )}
                </Button>
              </div>

              {/* Grid de 4 Colunas Dinâmico */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 w-full max-w-4xl">
                {[0, 1, 2, 3].map((i) => {
                  const active = i < result.quantidade_cores;
                  const hex = result.cores[i];
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex flex-col gap-5"
                    >
                      <div
                        className={`w-full aspect-square rounded-[2.5rem] border-4 flex items-center justify-center transition-all duration-700 shadow-2xl ${
                          active ? "border-white/20" : "border-dashed border-white/5 bg-white/2 opacity-20"
                        }`}
                        style={{ backgroundColor: active ? hex : "transparent" }}
                      >
                        {!active && <XCircle className="text-white/20" size={48} />}
                        {active && <CheckCircle2 className="w-8 h-8 text-white/20 mix-blend-overlay" />}
                      </div>
                      <div
                        className={`p-4 rounded-2xl text-center font-mono font-black italic text-[11px] border ${
                          active
                            ? "bg-white/5 border-white/10 text-white"
                            : "bg-transparent border-white/2 text-white/5"
                        }`}
                      >
                        {active ? hex.toUpperCase() : "NULL"}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
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
 * - Versão: 5.0
 * - Grounding: Google Search ativo para resolver Real Madrid e 2026.
 * - Visual: Preservado o layout V4 com botões de persistência V3.
 */
