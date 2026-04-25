/**
 * [CAMINHO]&#58; src/pages/Admin/ClubColors.tsx
 * [MÓDULO]&#58; ADMIN — AUDITORIA DE CORES (GEMINI FIXED)
 * [STATUS]&#58; PRODUÇÃO — VERSÃO 3.6 (GEMINI FUNCIONANDO)
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

// ✅ CORRIGIDO: usar variável de ambiente
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

  useEffect(() => {
    if (!userLoading && (!user || user.email !== "betoborelli9@gmail.com")) {
      navigate("/");
    }
  }, [user, userLoading, navigate]);

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

  // ✅ CORRIGIDO: modelo válido
  const fetchGeminiWithRetry = async (payload: any, retries = 3, delay = 1000): Promise<any> => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      if (retries <= 0) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchGeminiWithRetry(payload, retries - 1, delay * 2);
    }
  };

  const handleInvestigate = async (club: ClubSearchResult) => {
    setSelectedClub(club);
    setSuggestions([]);
    setQuery(club.name);
    setInvestigating(true);
    setResult(null);

    try {
      // ✅ CORRIGIDO: payload simples e funcional
      const payload = {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `
Retorne apenas JSON com as cores do uniforme principal do clube "${club.name}".

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
- Usar cores do uniforme principal
- Ignorar cores de escudo
- NÃO retornar texto fora do JSON
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

      const resJson = await fetchGeminiWithRetry(payload);
      const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) throw new Error("IA não retornou dados");

      // ✅ CORRIGIDO: parse seguro
      let parsed: AIResult;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        console.error("Resposta inválida:", rawText);
        throw new Error("JSON inválido da IA");
      }

      setResult(parsed);
      toast.success("Investigação concluída!");
    } catch (err: any) {
      console.error("Erro Gemini:", err);
      toast.error("Erro na investigação", { description: err.message });
    } finally {
      setInvestigating(false);
    }
  };

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
    } catch {
      toast.error("Erro ao salvar no cache.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white p-6 md:p-12 font-sans">
      <div className="max-w-5xl mx-auto space-y-12">
        <header className="flex items-center justify-between border-b border-white/5 pb-8">
          <h1 className="text-4xl font-black italic uppercase">Bancada de Cores</h1>
          <Button onClick={() => navigate("/dashboard")}>
            <ArrowLeft size={16} /> Voltar
          </Button>
        </header>

        <section>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Digite o clube..." />

          {loadingSuggest && <Loader2 className="animate-spin mt-4" />}

          {suggestions.map((club, i) => (
            <button key={i} onClick={() => handleInvestigate(club)}>
              {club.name}
            </button>
          ))}
        </section>

        <section>
          {investigating && <p>Buscando cores...</p>}

          {result && (
            <div>
              <h2>{result.nome_confirmado}</h2>

              <div className="grid grid-cols-4 gap-4 mt-6">
                {result.cores.map((color, i) => (
                  <div key={i}>
                    <div className="w-20 h-20 rounded" style={{ backgroundColor: color }} />
                    <p>{color}</p>
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
