/**
 * [CAMINHO]&#58; src/pages/Admin/ClubColors.tsx
 * VERSÃO: 4.0 (FUNCIONANDO REAL)
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Palette, Loader2, Sparkles, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/contexts/UserContext";
import { searchClubsWithFallback, type ClubSearchResult } from "@/lib/search-clubs";
import { toast } from "sonner";

// 🔑 SUA CHAVE AQUI
const apiKey = "AIzaSyD9jqFr7is90UNvO8E4j45er_gRAu5x7_Q";

interface AIResult {
  nome: string;
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

  // 🔒 proteção
  useEffect(() => {
    if (!userLoading && (!user || user.email !== "betoborelli9@gmail.com")) {
      navigate("/");
    }
  }, [user, userLoading, navigate]);

  // 🔎 autocomplete (NÃO MEXI)
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

  // 🤖 GEMINI (CORRIGIDO)
  const handleInvestigate = async (club: ClubSearchResult) => {
    setSelectedClub(club);
    setSuggestions([]);
    setQuery(club.name);
    setInvestigating(true);
    setResult(null);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `
Retorne APENAS JSON.

Clube: ${club.name}

Me diga SOMENTE as cores principais do uniforme em HEX.

Formato:
{
  "nome": "nome do clube",
  "cores": ["#HEX", "#HEX", "#HEX"]
}
`,
                  },
                ],
              },
            ],
          }),
        },
      );

      const data = await response.json();

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) throw new Error("Sem resposta da IA");

      const clean = text.replace(/```json|```/g, "").trim();

      const parsed = JSON.parse(clean);

      setResult(parsed);
      toast.success("Cores carregadas");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro na IA");
    } finally {
      setInvestigating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* HEADER */}
        <header className="flex justify-between items-center border-b border-white/10 pb-6">
          <h1 className="text-4xl font-black italic">BANCADA DE CORES</h1>

          <Button onClick={() => navigate("/dashboard")}>
            <ArrowLeft /> Voltar
          </Button>
        </header>

        {/* BUSCA */}
        <section className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500" />

          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Digite o nome do clube..."
            className="pl-12 h-14 text-lg"
          />

          {loadingSuggest && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin" />}

          <AnimatePresence>
            {suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute w-full bg-[#1A1A1A] mt-2 rounded-xl overflow-hidden"
              >
                {suggestions.map((club, i) => (
                  <button
                    key={i}
                    onClick={() => handleInvestigate(club)}
                    className="w-full p-4 text-left hover:bg-white/5"
                  >
                    {club.name}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* RESULTADO */}
        <section className="flex justify-center items-center min-h-[300px]">
          {investigating ? (
            <div className="text-center">
              <Sparkles className="animate-pulse mx-auto mb-4" size={40} />
              Buscando cores...
            </div>
          ) : result ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {result.cores.map((color, i) => (
                <div key={i} className="text-center">
                  <div className="w-32 h-32 rounded-xl mb-2 border" style={{ backgroundColor: color }} />
                  <span className="font-mono">{color}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-white/20">Digite um clube para buscar</div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ClubColors;
