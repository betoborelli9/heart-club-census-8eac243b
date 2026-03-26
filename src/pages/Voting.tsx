/**
 * [CAMINHO/ARQUIVO]: src/pages/Voting.tsx
 * [MÓDULO]: SISTEMA DE VOTAÇÃO (PROTOCOLO MASTER ATIVADO)
 * [STATUS]: CORREÇÃO DE REDIRECIONAMENTO E TRAVA ADMIN
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Search, Check, Loader2, Shield, X, Sparkles, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { searchClubsSupabase } from "@/lib/search-clubs"; // Alterado para buscar no banco
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ClubResult {
  id: string | null;
  api_id: number | null;
  name: string;
  shortName: string;
  city: string | null;
  country: string | null;
  logo: string | null;
  isCustom?: boolean;
}

const Voting = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading, isAuthenticated, isProfileComplete, refreshProfile } = useUser();
  const { toast } = useToast();

  /* [MÓDULO: CONTROLE MASTER] */
  const IS_MASTER_ADMIN = user?.email === "betoborelli9@gmail.com";

  const [heartSearch, setHeartSearch] = useState("");
  const [heartResults, setHeartResults] = useState<ClubResult[]>([]);
  const [heartClub, setHeartClub] = useState<ClubResult | null>(null);
  const [heartLoading, setHeartLoading] = useState(false);
  const [heartOpen, setHeartOpen] = useState(false);

  const [sympathySearch, setSympathySearch] = useState("");
  const [sympathyResults, setSympathyResults] = useState<ClubResult[]>([]);
  const [sympathyClubs, setSympathyClubs] = useState<ClubResult[]>([]);
  const [sympathyLoading, setSympathyLoading] = useState(false);
  const [sympathyOpen, setSympathyOpen] = useState(false);

  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const heartDebounce = useRef<NodeJS.Timeout>();
  const sympathyDebounce = useRef<NodeJS.Timeout>();

  /* [MÓDULO: SEGURANÇA CORRIGIDA] */
  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      navigate("/login", { replace: true });
      return;
    }

    if (!isProfileComplete) {
      navigate("/profile-setup", { replace: true });
      return;
    }

    // Se for o Beto Borelli, NUNCA redireciona para o dashboard, permitindo testes infinitos.
    if (profile?.has_voted && !IS_MASTER_ADMIN) {
      navigate("/dashboard", { replace: true });
    }
  }, [isLoading, isAuthenticated, isProfileComplete, navigate, IS_MASTER_ADMIN, profile]);

  /* [MÓDULO: BUSCA NO SUPABASE] */
  const searchClubs = useCallback(
    async (query: string, setter: (r: ClubResult[]) => void, setLoading: (b: boolean) => void) => {
      if (query.length < 2) {
        setter([]);
        return;
      }
      setLoading(true);

      // Agora usando a função que busca no banco clubes_cache
      const found = await searchClubsSupabase(query);

      const mapped: ClubResult[] = found.map((club) => ({
        id: club.id,
        api_id: null,
        name: club.name,
        shortName: club.shortName,
        city: club.city,
        country: club.country,
        logo: club.logo,
      }));

      setter(mapped);
      setLoading(false);
    },
    [],
  );

  // ... (restante das funções selectHeart, handleConfirmVote permanecem iguais)
  // Certifique-se de aplicar o restante do JSX que você enviou abaixo

  // RENDERIZAÇÃO (JSX mantido conforme seu envio, mas com a trava aplicada)
  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-6 relative overflow-hidden">
      {/* Conteúdo da página mantido conforme seu arquivo original */}
      {/* ... */}
      {IS_MASTER_ADMIN && (
        <div className="bg-red-600/20 text-red-500 px-4 py-1 rounded-full text-[10px] font-black uppercase mb-4 animate-pulse">
          Modo Master: Votação Liberada para Testes
        </div>
      )}
      {/* ... restante do código original */}
    </div>
  );
};

export default Voting;

/**
 * [RODAPÉ TÉCNICO]
 * ARQUIVO: src/pages/Voting.tsx
 * STATUS: Trava de redirecionamento removida para admin. Busca alterada para Supabase.
 */
