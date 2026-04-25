/**
 * [CAMINHO]&#58; src/pages/Admin/ClubColors.tsx
 * [MÓDULO]&#58; ADMIN — AUDITORIA DE CORES (GEMINI FIXED + SEARCH OK)
 * [STATUS]&#58; PRODUÇÃO — VERSÃO 3.7
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

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

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

  // Segurança
  useEffect(() => {
    if (!userLoading && (!user || user.email !== "betoborelli9@gmail.com")) {
      navigate("/");
    }
  }, [user, userLoading, navigate]);

  // 🔍 AUTOCOMPLETE (API FOOTBALL OK)
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

  // 🤖 GEMINI FIXED
  const fetchGemini = async (clubName: string): Promise<AIResult> => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `
Retorne apenas JSON com as cores do uniforme principal do clube "${clubName}".

Formato:
{
  "nome_confirmado": "",
  "mascote": "",
  "divisao_2026": "",
  "quantidade_cores": 3,
  "cores": ["#HEX", "#HEX", "#HEX"]
}

Regras:
- Máximo 4 cores
- Usar cores da camisa principal
- Ignorar cores de escudo
- NÃO escrever nada fora do JSON
`,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error?.message || "Erro no Gemini");
    }

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!raw) throw new Error("Resposta vazia da IA");

    try {
      return JSON.parse(raw);
    } catch {
      console.error("Resposta inválida:", raw);
      throw new Error("JSON inválido");
    }
  };

  // 🚀 INVESTIGAÇÃO
  const handleInvestigate = async (club: ClubSearchResult) => {
    setSelectedClub(club);
    setQuery(club.name);
    setSuggestions([]);
    setInvestigating(true);
    setResult(null);

    try {
      const ai = await fetchGemini(club.name);
      setResult(ai);
      toast.success("Cores encontradas!");
    } catch (err: any) {
      toast.error("Erro na IA", { description: err.message });
    } finally {
      setInvestigating(false);
    }
  };

  // 💾 SALVAR
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

      toast.success("Salvo no cache!");
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* HEADER */}
        <header className="flex items-center justify-between border-b border-white/5 pb-8">
          <h1 className="text-4xl font-black italic uppercase tracking-tighter">Bancada de Cores</h1>
          <Button onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2" size={16} />
            Voltar
          </Button>
        </header>

        {/* BUSCA */}
        <section className="relative w-full max-w-2xl mx-auto z-50">
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-orange-500" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Digite o nome do clube..."
              className="h-16 pl-16 bg-white/5 border-white/10 rounded-2xl text-xl font-bold italic"
            />
            {loadingSuggest && (
              <Loader2 className="absolute right-5 top-1/2 -translate-y-1/2 animate-spin text-white/20" />
            )}
          </div>

          {/* 🔥 DROPDOWN CORRIGIDO */}
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
                    className="w-full flex items-center gap-5 p-5 hover:bg-white/5 border-b border-white/5 last:border-0 text-left"
                  >
                    <img src={club.logo || ""} className="w-12 h-12 object-contain" />
                    <div>
                      <p className="font-black italic text-lg uppercase tracking-tighter">{club.name}</p>
                      <p className="text-[10px] text-white/40 uppercase">{club.location}</p>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* RESULTADO */}
        <section className="flex flex-col items-center gap-12 py-10 min-h-[400px]">
          {investigating && (
            <div className="flex flex-col items-center gap-6 mt-20">
              <Sparkles className="text-orange-500 w-16 h-16 animate-pulse" />
              <p className="text-sm uppercase text-white/60">Buscando cores...</p>
            </div>
          )}

          {result && (
            <div className="flex flex-col items-center gap-10">
              <h2 className="text-5xl font-black italic uppercase">{result.nome_confirmado}</h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {result.cores.map((c, i) => (
                  <div key={i} className="text-center">
                    <div className="w-24 h-24 rounded-2xl border border-white/10" style={{ backgroundColor: c }} />
                    <p className="mt-2 text-xs font-mono">{c}</p>
                  </div>
                ))}
              </div>

              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ClubColors;
