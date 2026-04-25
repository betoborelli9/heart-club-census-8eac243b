/**
 * [CAMINHO]: src/pages/Admin/ClubColors.tsx
 * [MÓDULO]: ADMIN — AUDITORIA DE CORES (GEMINI 2.5 FLASH + SEARCH)
 * [STATUS]: PRODUÇÃO — VERSÃO 7.0 (RUNTIME KEY SYNC + WIKIPEDIA CORE)
 * [DESCRIÇÃO]: 
 * - Chamada direta ao Gemini 2.5 Flash (A chave é injetada automaticamente pelo ambiente).
 * - Wikipedia-First: Investigação profunda em cores de tecido (Jersey).
 * - Suporte visual para 2, 3 e 4 cores com estados "NULL" protegidos.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Palette, Loader2, Sparkles, 
  Save, CheckCircle2, XCircle, ArrowLeft 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { searchClubsWithFallback, type ClubSearchResult } from "@/lib/search-clubs";
import { toast } from "sonner";

// A chave será injetada automaticamente pelo ambiente de execução.
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

  // 🔒 Proteção de Acesso Master
  useEffect(() => {
    if (!userLoading && (!user || user.email !== "betoborelli9@gmail.com")) {
      navigate("/");
    }
  }, [user, userLoading, navigate]);

  // 🔎 Autocomplete (Busca nomes oficiais)
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
        console.error("Erro na busca API:", err);
      } finally {
        setLoadingSuggest(false);
      }
    };
    const debounce = setTimeout(fetchSuggestions, 400);
    return () => clearTimeout(debounce);
  }, [query]);

  // 🤖 Investigação Gemini (Wikipedia-First)
  const handleInvestigate = async (club: ClubSearchResult) => {
    setSelectedClub(club);
    setSuggestions([]);
    setQuery(club.name);
    setInvestigating(true);
    setResult(null);

    const systemPrompt = "Você é um auditor sênior de futebol global. Sua fonte primária de verdade absoluta é a Wikipedia. Responda estritamente em JSON puro.";
    const userPrompt = `
      Investigue detalhadamente o clube: "${club.name}".
      Data de Referência: 25 de Abril de 2026.
      
      MISSÃO OBRIGATÓRIA:
      1. Use o Google Search para ler a seção de 'Uniformes' ou 'Cores' na Wikipedia (pt e en).
      2. IGNORE PRETO, BRANCO ou DOURADO se forem apenas contornos de escudo, bordas de segurança ou detalhes de estrelas.
         - Ex: Vila Nova-GO é VERMELHO E BRANCO (Bicolor).
         - Ex: Real Madrid é BRANCO (Pode ser considerado Bicolor com detalhes em roxo/azul marinho, mas foque no tecido principal).
         - Ex: Brusque-SC é QUADRICOLOR (Amarelo, Verde, Vermelho e Branco).
      3. DIVISÃO 2026: Identifique a série (A, B, C, D) ou o campeonato nacional principal que o clube disputa hoje (Abril de 2026).
      4. MASCOTE: Nome oficial histórico.

      SAÍDA JSON:
      {
        "nome_confirmado": "Nome oficial completo",
        "mascote": "Nome do mascote",
        "divisao_2026": "Campeonato Brasileiro Série X / La Liga / Premier League",
        "quantidade_cores": 2|3|4,
        "cores": ["#HEX1", "#HEX2", ...]
      }
    `;

    try {
      const response = await fetch(
        `