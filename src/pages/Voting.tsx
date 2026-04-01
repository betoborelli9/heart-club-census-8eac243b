/**
 * Caminho: src/pages/Voting.tsx
 * Contexto: Sistema de Votação - Busca Híbrida (Supabase + API-Football)
 * Mudança: Integração completa com busca em duas camadas
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Loader2, X, Search, Sparkles, ShieldCheck, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { searchClubsLocal } from "@/lib/search-clubs";
import { ClubLogo } from "@/components/ClubLogo";
import logo from "@/assets/logo.png";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import FingerprintJS from "@fingerprintjs/fingerprintjs";

/* ═══════════════════════════════════════════════════════════
   MÓDULO: TIPOS E CONSTANTES
   ═══════════════════════════════════════════════════════════ */

interface ClubResult {
  id: string;
  name: string;
  shortName: string;
  location: string;
  logo: string;
  city: string;
  state: string;
  country: string;
  mascote: string;
  source: "supabase" | "api-football";
}

const MAX_SYMPATHY_CLUBS = 4;

/* ═══════════════════════════════════════════════════════════
   MÓDULO: COMPONENTE PRINCIPAL DE VOTAÇÃO
   ═══════════════════════════════════════════════════════════ */

const Voting = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading, isAuthenticated, isProfileComplete, hasVoted, refreshProfile } = useUser();
  const { toast } = useToast();

  /* [SUBMÓDULO: CONTROLE MASTER DE ACESSO] */
  const IS_MASTER_ADMIN = user?.email === "betoborelli9@gmail.com";

  const heartInputRef = useRef<HTMLInputElement>(null);
  const sympathyInputRef = useRef<HTMLInputElement>(null);

  /* [SUBMÓDULO: ESTADOS DE BUSCA - CORAÇÃO] */
  const [heartSearch, setHeartSearch] = useState("");
  const [heartResults, setHeartResults] = useState<ClubResult[]>([]);
  const [heartClub, setHeartClub] = useState<ClubResult | null>(null);
  const [heartOpen, setHeartOpen] = useState(false);
  const [heartLoading, setHeartLoading] = useState(false);

  /* [SUBMÓDULO: ESTADOS DE BUSCA - SIMPATIA] */
  const [sympathySearch, setSympathySearch] = useState("");
  const [sympathyResults, setSympathyResults] = useState<ClubResult[]>([]);
  const [sympathyClubs, setSympathyClubs] = useState<ClubResult[]>([]);
  const [sympathyOpen, setSympathyOpen] = useState(false);
  const [sympathyLoading, setSympathyLoading] = useState(false);
  const [activeSympathyIndex, setActiveSympathyIndex] = useState<number>(0);

  /* [SUBMÓDULO: ESTADOS GERAIS] */
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fingerprint, setFingerprint] = useState<string | null>(null);

  /* ═══════════════════════════════════════════════════════════
     MÓDULO: INICIALIZAÇÃO E SEGURANÇA
     ═══════════════════════════════════════════════════════════ */

  useEffect(() => {
    const initFP = async () => {
      try {
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        setFingerprint(result.visitorId);
      } catch (err) {
        setFingerprint(`fallback-${Math.random().toString(36).substr(2, 9)}`);
      }
    };
    initFP();
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login", { replace: true });
    } else if (!isLoading && isAuthenticated && !isProfileComplete) {
      navigate("/profile-setup", { replace: true });
    } else if (!isLoading && isAuthenticated && hasVoted && !IS_MASTER_ADMIN) {
      navigate("/dashboard", { replace: true });
    }
  }, [isLoading, isAuthenticated, isProfileComplete, hasVoted, navigate, IS_MASTER_ADMIN]);

 /* ═══════════════════════════════════════════════════════════
     MÓDULO: BUSCA HÍBRIDA (SUPABASE + API-FOOTBALL)
     ═══════════════════════════════════════════════════════════ */

  /**
   * [SUBMÓDULO: BUSCA NA API-FOOTBALL DIRETA + CACHE SUPABASE]
   * Função: Primeiro busca no Supabase, se não achar consulta direto a API-Football e salva no Supabase
   */
  const searchApiFootball = useCallback(async (term: string): Promise<ClubResult[]> => {
    try {
      // 1. Busca no Supabase (cache local)
      const { data: cached } = await supabase
        .from("clubes_cache")
        .select("*")
        .ilike("nome", `%${term}%`)
        .limit(10);

      if (cached && cached.length > 0) {
        return cached.map((c: any) => ({
          id: c.id,
          name: c.nome,
          shortName: c.nome_curto || c.nome,
          location: c.pais,
          logo: c.escudo_url,
          city: c.cidade,
          state: "",
          country: c.pais,
          mascote: "",
          source: "supabase" as const,
        }));
      }

      // 2. Se não achou, consulta direto a API-Football
      const res = await fetch(
        `https://v3.football.api-sports.io/teams?search=${encodeURIComponent(term)}`,
        { headers: { "x-apisports-key": "3b4a0ec2c5f513b9aa1e43c4adbae7aa" } }
      );

      if (!res.ok) {
        console.error("Erro na API-Football:", res.status);
        return [];
      }

      const apiData = await res.json();
      const teams = apiData.response || [];

      const results = teams.map((item: any) => ({
        id: null,
        name: item.team.name,
        shortName: item.team.code || item.team.name,
        location: item.team.country,
        logo: item.team.logo,
        city: item.venue?.city || "",
        state: "",
        country: item.team.country,
        mascote: "",
        source: "api-football" as const,
      }));

      // 3. Grava no Supabase para uso futuro
      for (const r of results) {
        await supabase.from("clubes_cache").upsert({
          nome: r.name,
          nome_curto: r.shortName,
          cidade: r.city,
          pais: r.country,
          escudo_url: r.logo,
        }, { onConflict: "nome" });
      }

      return results;
    } catch (err) {
      console.error("Erro na busca:", err);
      return [];
    }
  }, []);

  /**
   * [SUBMÓDULO: BUSCA UNIFICADA - DUAS CAMADAS]
   * Função: Primeiro Supabase local, depois API-Football se necessário
   */
  const performSearch = useCallback(
    async (
      query: string,
      setterResults: (r: ClubResult[]) => void,
      setterOpen: (b: boolean) => void,
      setterLoading: (b: boolean) => void,
    ) => {
      if (query.length < 2) {
        setterResults([]);
        setterOpen(false);
        return;
      }

      setterLoading(true);

      try {
        // CAMADA 1: Busca no Supabase (251 clubes)
        const localResults = searchClubsLocal(query, 10);

        let allResults: ClubResult[] = localResults.map((club) => ({ ...club, source: "supabase" as const }));

        // CAMADA 2: Se poucos resultados, busca na API-Football
        if (localResults.length < 5) {
          const apiResults = await searchApiFootball(query);

          // Filtra duplicados (nomes similares)
          const existingNames = new Set(localResults.map((c) => c.name.toLowerCase()));
          const uniqueApiResults = apiResults.filter((c) => !existingNames.has(c.name.toLowerCase()));

          allResults = [...allResults, ...uniqueApiResults];
        }

        setterResults(allResults);
        setterOpen(true);
      } catch (err) {
        console.error("Erro na busca:", err);
        setterResults([]);
      } finally {
        setterLoading(false);
      }
    },
    [searchApiFootball],
  );
  
            /* [SUBMÓDULO: DEBOUNCE PARA BUSCAS] */
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(heartSearch, setHeartResults, setHeartOpen, setHeartLoading);
    }, 400);
    return () => clearTimeout(timer);
  }, [heartSearch, performSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(sympathySearch, setSympathyResults, setSympathyOpen, setSympathyLoading);
    }, 400);
    return () => clearTimeout(timer);
  }, [sympathySearch, performSearch]);

  /* ═══════════════════════════════════════════════════════════
     MÓDULO: SELEÇÃO DE CLUBES COM FOCO AUTOMÁTICO
     ═══════════════════════════════════════════════════════════ */

  /**
   * [SUBMÓDULO: SELEÇÃO DO CLUBE DO CORAÇÃO]
   * Efeito: Após selecionar, foca automaticamente no primeiro input de simpatia
   */
  const selectHeart = (club: ClubResult) => {
    setHeartClub(club);
    setHeartSearch("");
    setHeartOpen(false);
    toast({ title: `${club.name} selecionado! ❤️` });

    // Foco automático no input de simpatia após 150ms
    setTimeout(() => sympathyInputRef.current?.focus(), 150);
  };

  /**
   * [SUBMÓDULO: SELEÇÃO DE CLUBES DE SIMPATIA]
   * Limite: 4 clubes de simpatia (MAX_SYMPATHY_CLUBS)
   * Efeito: Após selecionar, abre próximo input automaticamente
   */
  const selectSympathy = (club: ClubResult) => {
    if (sympathyClubs.length >= MAX_SYMPATHY_CLUBS) {
      toast({
        title: "Limite atingido",
        description: `Você pode escolher até ${MAX_SYMPATHY_CLUBS} clubes de simpatia.`,
        variant: "destructive",
      });
      return;
    }

    if (sympathyClubs.find((c) => c.name === club.name) || heartClub?.name === club.name) {
      toast({
        title: "Clube já selecionado",
        description: "Este clube já foi escolhido.",
        variant: "destructive",
      });
      return;
    }

    const newSympathyClubs = [...sympathyClubs, club];
    setSympathyClubs(newSympathyClubs);
    setSympathySearch("");
    setSympathyOpen(false);
    setActiveSympathyIndex(newSympathyClubs.length);

    // Se ainda não atingiu o limite, mantém foco no input para próximo
    if (newSympathyClubs.length < MAX_SYMPATHY_CLUBS) {
      setTimeout(() => sympathyInputRef.current?.focus(), 150);
    }
  };

  const removeSympathy = (idx: number) => {
    setSympathyClubs((prev) => {
      const newClubs = prev.filter((_, i) => i !== idx);
      setActiveSympathyIndex(newClubs.length);
      return newClubs;
    });
    setTimeout(() => sympathyInputRef.current?.focus(), 150);
  };

  /* ═══════════════════════════════════════════════════════════
     MÓDULO: PERSISTÊNCIA DO VOTO
     ═══════════════════════════════════════════════════════════ */

  const handleConfirmVote = async () => {
    if (!heartClub || !user || !profile) return;
    setSubmitting(true);

    try {
      // Bypass Master: Deleta votos anteriores
      if (IS_MASTER_ADMIN) {
        await supabase.from("votos").delete().eq("user_id", user.id);
      }

      // Insere clube do coração
      const { error: mainError } = await supabase.from("votos").insert({
        user_id: user.id,
        clube_nome: heartClub.name,
        cidade: profile.cidade || "",
        estado: profile.estado || "",
        pais: profile.pais || "BR",
        is_original_vote: true,
        fingerprint: fingerprint || null,
      });

      if (mainError && !IS_MASTER_ADMIN) throw mainError;

      // Insere clubes de simpatia (até 4)
      for (const sym of sympathyClubs) {
        await supabase.from("votos").insert({
          user_id: user.id,
          clube_nome: sym.name,
          cidade: profile.cidade || "",
          estado: profile.estado || "",
          pais: profile.pais || "BR",
          is_original_vote: false,
          fingerprint: fingerprint || null,
        });
      }

      await refreshProfile();
      toast({
        title: IS_MASTER_ADMIN ? "Modo Master: Voto Resetado!" : "Voto Sagrado registrado! 🦅",
        description: `${heartClub.name} + ${sympathyClubs.length} clubes de simpatia.`,
      });

      if (!IS_MASTER_ADMIN) navigate("/dashboard", { replace: true });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao votar", description: err.message });
    } finally {
      setSubmitting(false);
      setShowConfirm(false);
    }
  };

  /* ═══════════════════════════════════════════════════════════
     MÓDULO: COMPONENTES DE UI INTERNOS
     ═══════════════════════════════════════════════════════════ */

  /**
   * [SUBMÓDULO: DROPDOWN DE RESULTADOS]
   * Exibe: Loading, resultados do Supabase e API-Football separados por seção
   */
  const ClubDropdown = ({
    results,
    open,
    loading,
    onSelect,
  }: {
    results: ClubResult[];
    open: boolean;
    loading: boolean;
    onSelect: (c: ClubResult) => void;
  }) => {
    if (!open) return null;

    if (loading)
      return (
        <div className="absolute top-full left-0 right-0 z-[999] mt-1 rounded-xl border border-border/30 p-4 bg-card shadow-2xl flex items-center justify-center">
          <Loader2 className="animate-spin w-5 h-5 text-[#ff6200]" />
        </div>
      );

    if (results.length === 0)
      return (
        <div className="absolute top-full left-0 right-0 z-[999] mt-1 rounded-xl border border-border/30 p-4 bg-card shadow-2xl text-center text-muted-foreground text-sm">
          Nenhum clube encontrado
        </div>
      );

    const supabaseResults = results.filter((r) => r.source === "supabase");
    const apiResults = results.filter((r) => r.source === "api-football");

    return (
      <div className="absolute top-full left-0 right-0 z-[999] mt-1 rounded-xl border border-border/30 max-h-80 overflow-y-auto bg-card shadow-2xl">
        {/* Seção: Resultados do Supabase */}
        {supabaseResults.length > 0 && (
          <div className="border-b border-border/20 last:border-0">
            <div className="px-3 py-2 bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Heart size={12} /> Seu Clube Está Aqui
            </div>
            {supabaseResults.map((club, i) => (
              <button
                key={`sb-${i}`}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(club);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/10 text-left border-b border-border/10 last:border-0 cursor-pointer"
              >
                <ClubLogo src={club.logo} alt={club.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground text-sm truncate italic">{club.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{club.location}</p>
                </div>
                <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full">Local</span>
              </button>
            ))}
          </div>
        )}

        {/* Seção: Resultados da API-Football */}
        {apiResults.length > 0 && (
          <div>
            <div className="px-3 py-2 bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Globe size={12} /> Descubra Novos Clubes
            </div>
            {apiResults.map((club, i) => (
              <button
                key={`api-${i}`}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(club);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/10 text-left border-b border-border/10 last:border-0 cursor-pointer"
              >
                <img src={club.logo} alt={club.name} className="w-8 h-8 object-contain" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground text-sm truncate italic">{club.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{club.country}</p>
                </div>
                <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">Global</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  /* ═══════════════════════════════════════════════════════════
     MÓDULO: RENDERIZAÇÃO PRINCIPAL
     ═══════════════════════════════════════════════════════════ */

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-6 relative">
      <div className="w-full max-w-lg space-y-6 relative z-10">
        {/* CABEÇALHO */}
        <div className="text-center space-y-3">
          <img src={logo} alt="Logo" className="mx-auto w-20 h-20" />
          <h1 className="text-2xl font-bold italic">Voto Sagrado</h1>
          {IS_MASTER_ADMIN && (
            <p className="text-[10px] text-[#ff6200] font-black uppercase flex items-center justify-center gap-1">
              <ShieldCheck size={12} /> Modo Master Ativado
            </p>
          )}
        </div>

        {/* INPUT CLUBE DO CORAÇÃO */}
        <div className="space-y-2 relative">
          <label className="text-sm font-semibold flex items-center gap-2 italic tracking-tighter uppercase opacity-70">
            <Heart size={14} className="text-[#ff6200]" /> Clube do Coração
          </label>
          {heartClub ? (
            <div className="flex items-center gap-3 glass-card rounded-xl p-4 border-2 border-[#ff6200] shadow-[0_0_15px_rgba(255,98,0,0.2)]">
              <ClubLogo src={heartClub.logo} alt={heartClub.name} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-bold italic text-lg uppercase tracking-tighter truncate">{heartClub.name}</p>
                <p className="text-xs text-muted-foreground">{heartClub.location}</p>
              </div>
              <button
                onClick={() => setHeartClub(null)}
                className="cursor-pointer text-white/40 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ff6200]" />
              <Input
                ref={heartInputRef}
                className="pl-10 h-12 rounded-xl"
                placeholder="Pesquisar clube (ex: Sampaio)..."
                value={heartSearch}
                onChange={(e) => setHeartSearch(e.target.value)}
                onBlur={() => setTimeout(() => setHeartOpen(false), 200)}
              />
              <ClubDropdown results={heartResults} open={heartOpen} loading={heartLoading} onSelect={selectHeart} />
            </div>
          )}
        </div>

        {/* INPUTS CLUBES DE SIMPATIA - 4 SLOTS */}
        <div className="space-y-3">
          <label className="text-sm font-semibold flex items-center gap-2 italic tracking-tighter uppercase opacity-70">
            <Sparkles size={14} className="text-[#ff6200]" />
            Clubes de Simpatia
            <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full">
              {sympathyClubs.length}/{MAX_SYMPATHY_CLUBS}
            </span>
          </label>

          {/* Lista de clubes selecionados */}
          <div className="grid grid-cols-1 gap-2">
            <AnimatePresence>
              {sympathyClubs.map((club, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-3 glass-card rounded-xl p-3 border border-border/20"
                >
                  <ClubLogo src={club.logo} alt={club.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm italic truncate">{club.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{club.location}</p>
                  </div>
                  <button type="button" onClick={() => removeSympathy(idx)}>
                    <X className="w-4 h-4 text-muted-foreground hover:text-white transition-colors" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Input para próximo clube (se houver vagas) */}
          {sympathyClubs.length < MAX_SYMPATHY_CLUBS && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-50" />
              <Input
                ref={sympathyInputRef}
                className="pl-10 h-11 rounded-xl"
                placeholder={`${MAX_SYMPATHY_CLUBS - sympathyClubs.length} vaga(s) restante(s)...`}
                value={sympathySearch}
                onChange={(e) => setSympathySearch(e.target.value)}
                onBlur={() => setTimeout(() => setSympathyOpen(false), 200)}
              />
              <ClubDropdown
                results={sympathyResults}
                open={sympathyOpen}
                loading={sympathyLoading}
                onSelect={selectSympathy}
              />
            </div>
          )}
        </div>

        {/* BOTÃO DE CONFIRMAÇÃO */}
        <Button
          className="w-full h-14 font-black italic text-xl btn-orange-gradient rounded-2xl shadow-xl shadow-[#ff6200]/20"
          disabled={!heartClub || submitting}
          onClick={() => setShowConfirm(true)}
        >
          {submitting ? <Loader2 className="animate-spin" /> : "Jurar Lealdade"}
        </Button>
      </div>

      {/* DIALOG DE CONFIRMAÇÃO */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-sm glass-card border-border/10">
          <DialogHeader>
            <DialogTitle className="italic text-2xl font-black uppercase tracking-tighter">Confirmar?</DialogTitle>
            <DialogDescription className="italic font-medium text-white/60">
              Você jura lealdade eterna ao <strong>{heartClub?.name}</strong>?
              {sympathyClubs.length > 0 && (
                <span className="block mt-2 text-sm">
                  Com simpatia por: {sympathyClubs.map((c) => c.name).join(", ")}
                </span>
              )}
              {IS_MASTER_ADMIN && (
                <span className="block text-[#ff6200] mt-2 font-bold uppercase text-[10px]">
                  Master: Votos anteriores serão deletados para teste.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-6">
            <Button
              variant="outline"
              className="rounded-xl font-bold uppercase italic"
              onClick={() => setShowConfirm(false)}
            >
              Voltar
            </Button>
            <Button
              onClick={handleConfirmVote}
              className="btn-orange-gradient font-black uppercase italic rounded-xl px-6"
              disabled={submitting}
            >
              {submitting ? <Loader2 className="animate-spin" /> : "EU JURO"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Voting;

/**
 * [RODAPÉ TÉCNICO]
 * Arquivo: src/pages/Voting.tsx
 * Versão: 3.0 (Busca Híbrida)
 * Funcionalidades:
 *   - Busca dupla: Supabase (251 clubes) → API-Football (mundo)
 *   - Debounce de 400ms nas buscas
 *   - Foco automático entre inputs
 *   - Limite de 4 clubes de simpatia
 *   - Separação visual: "Seu Clube Está Aqui" vs "Descubra Novos Clubes"
 *   - Badges indicando origem (Local/Global)
 * Próximo passo: Testar integração na Vercel
 */
