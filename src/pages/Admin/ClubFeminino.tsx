/**
 * [CAMINHO]: src/pages/Admin/ClubFeminino.tsx
 * [MÓDULO]: ADMIN — Consulta limpa: clube possui futebol feminino?
 * [STATUS]: PRODUÇÃO — v1.0
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, ArrowLeft, CheckCircle2, XCircle, Venus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { searchClubsWithFallback, type ClubSearchResult } from "@/lib/search-clubs";
import { toast } from "sonner";

interface FemResult {
  nome_confirmado: string;
  tem_feminino: boolean;
  competicao_principal: string | null;
  fonte?: string;
  observacao?: string;
}

const ClubFeminino = () => {
  const navigate = useNavigate();
  const { user, isLoading: userLoading } = useUser();

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<ClubSearchResult[]>([]);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [selectedClub, setSelectedClub] = useState<ClubSearchResult | null>(null);
  const [investigating, setInvestigating] = useState(false);
  const [result, setResult] = useState<FemResult | null>(null);

  // 🔒 Acesso Master
  useEffect(() => {
    if (!userLoading && (!user || user.email !== "betoborelli9@gmail.com")) {
      navigate("/");
    }
  }, [user, userLoading, navigate]);

  // 🔎 Autocomplete a partir de 3 letras
  useEffect(() => {
    const run = async () => {
      if (query.trim().length < 3) {
        setSuggestions([]);
        return;
      }
      setLoadingSuggest(true);
      try {
        const clubs = await searchClubsWithFallback(query);
        setSuggestions(clubs.slice(0, 8));
      } catch (err) {
        console.error("Erro na busca:", err);
      } finally {
        setLoadingSuggest(false);
      }
    };
    const t = setTimeout(run, 400);
    return () => clearTimeout(t);
  }, [query]);

  const handleInvestigate = async (club: ClubSearchResult) => {
    setSelectedClub(club);
    setSuggestions([]);
    setQuery(club.name);
    setResult(null);
    setInvestigating(true);

    try {
      const { data, error } = await supabase.functions.invoke("check-club-feminino", {
        body: { clubName: club.name },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data as FemResult);
    } catch (err) {
      console.error(err);
      toast.error("Falha na consulta. Tente novamente.");
    } finally {
      setInvestigating(false);
    }
  };

  const reset = () => {
    setQuery("");
    setSelectedClub(null);
    setResult(null);
    setSuggestions([]);
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#ff6200] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-white/60 hover:text-white mb-8 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar ao Dashboard
        </button>

        <div className="flex items-center gap-3 mb-2">
          <Venus className="w-7 h-7 text-pink-400" />
          <h1 className="text-3xl font-bold italic" style={{ fontFamily: "Verdana" }}>
            Futebol Feminino
          </h1>
        </div>
        <p className="text-white/50 text-sm mb-8">
          Pesquise um clube e descubra se ele possui equipe de futebol feminino ativa.
        </p>

        {/* BUSCA */}
        <div className="relative mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Digite no mínimo 3 letras (ex: Vila Nova, Palmeiras, Ferroviária...)"
              className="pl-12 h-14 bg-[#111] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#ff6200]"
            />
            {loadingSuggest && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#ff6200] animate-spin" />
            )}
          </div>

          <AnimatePresence>
            {suggestions.length > 0 && (
              <motion.ul
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute z-20 w-full mt-2 bg-[#111] border border-white/10 rounded-lg overflow-hidden shadow-xl"
              >
                {suggestions.map((c) => (
                  <li
                    key={`${c.api_id ?? c.name}-${c.city}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleInvestigate(c);
                    }}
                    className="px-4 py-3 hover:bg-white/5 cursor-pointer flex items-center gap-3 border-b border-white/5 last:border-0"
                  >
                    {c.logo && (
                      <img src={c.logo} alt={c.name} className="w-7 h-7 object-contain" />
                    )}
                    <div className="flex-1">
                      <div className="text-sm font-medium">{c.name}</div>
                      <div className="text-xs text-white/40">
                        {c.city} • {c.country}
                      </div>
                    </div>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>

        {/* INVESTIGANDO */}
        {investigating && (
          <div className="bg-[#111] border border-white/10 rounded-lg p-8 text-center">
            <Loader2 className="w-10 h-10 text-[#ff6200] animate-spin mx-auto mb-4" />
            <p className="text-white/70">
              Consultando Google + Gemini sobre <strong>{selectedClub?.name}</strong>...
            </p>
          </div>
        )}

        {/* RESULTADO */}
        {result && !investigating && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#111] border border-white/10 rounded-lg overflow-hidden"
          >
            <div
              className={`p-6 flex items-center gap-4 ${
                result.tem_feminino ? "bg-emerald-500/10" : "bg-red-500/10"
              }`}
            >
              {result.tem_feminino ? (
                <CheckCircle2 className="w-12 h-12 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-12 h-12 text-red-400 shrink-0" />
              )}
              <div>
                <h2 className="text-xl font-bold">{result.nome_confirmado}</h2>
                <p
                  className={`text-lg font-semibold ${
                    result.tem_feminino ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {result.tem_feminino
                    ? "✅ Possui futebol feminino"
                    : "❌ Não possui futebol feminino"}
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4 text-sm">
              {result.competicao_principal && (
                <div>
                  <div className="text-white/40 text-xs uppercase tracking-wider mb-1">
                    Principal Competição
                  </div>
                  <div className="text-white">{result.competicao_principal}</div>
                </div>
              )}
              {result.observacao && (
                <div>
                  <div className="text-white/40 text-xs uppercase tracking-wider mb-1">
                    Observação
                  </div>
                  <div className="text-white/80">{result.observacao}</div>
                </div>
              )}
              {result.fonte && (
                <div>
                  <div className="text-white/40 text-xs uppercase tracking-wider mb-1">
                    Fonte
                  </div>
                  <div className="text-white/60 italic">{result.fonte}</div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-white/10">
              <Button
                onClick={reset}
                variant="outline"
                className="w-full bg-transparent border-white/20 hover:bg-white/5"
              >
                Nova consulta
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ClubFeminino;
