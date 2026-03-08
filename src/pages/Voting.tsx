/* Caminho: src/pages/Voting.tsx
   Contexto: Fluxo de Voto Definitivo e Redirecionamento Pós-Voto */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Search, Loader2, X, Sparkles, Shield } from "lucide-react"; // Adicionado Shield
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { searchClubsLocal, ClubSearchResult } from "@/lib/search-clubs";
import { ClubLogo } from "@/components/ClubLogo";
import logo from "@/assets/logo.png";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface ClubResult {
  id: string | null;
  name: string;
  shortName: string;
  location: string | null;
  logo: string | null;
  mascote: string | null;
}

function toClubResult(c: ClubSearchResult): ClubResult {
  return {
    id: c.id,
    name: c.name,
    shortName: c.shortName,
    location: c.location,
    logo: c.logo,
    mascote: c.mascote || null,
  };
}

const Voting = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading, isAuthenticated, isProfileComplete, hasVoted, refreshProfile } = useUser();
  const { toast } = useToast();

  const heartInputRef = useRef<HTMLInputElement>(null);
  const sympathyInputRef = useRef<HTMLInputElement>(null);

  const [heartSearch, setHeartSearch] = useState("");
  const [heartResults, setHeartResults] = useState<ClubResult[]>([]);
  const [heartClub, setHeartClub] = useState<ClubResult | null>(null);
  const [heartOpen, setHeartOpen] = useState(false);

  const [sympathySearch, setSympathySearch] = useState("");
  const [sympathyResults, setSympathyResults] = useState<ClubResult[]>([]);
  const [sympathyClubs, setSympathyClubs] = useState<ClubResult[]>([]);
  const [sympathyOpen, setSympathyOpen] = useState(false);

  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/login", { replace: true });
    else if (!isLoading && isAuthenticated && !isProfileComplete) navigate("/profile-setup", { replace: true });
    else if (!isLoading && isAuthenticated && hasVoted) navigate("/dashboard", { replace: true });
  }, [isLoading, isAuthenticated, isProfileComplete, hasVoted, navigate]);

  const doSearch = useCallback((query: string, setter: (r: ClubResult[]) => void, setOpen: (b: boolean) => void) => {
    if (query.length < 2) {
      setter([]);
      setOpen(false);
      return;
    }
    const results = searchClubsLocal(query, 10).map(toClubResult);
    setter(results);
    setOpen(true);
  }, []);

  useEffect(() => { doSearch(heartSearch, setHeartResults, setHeartOpen); }, [heartSearch, doSearch]);
  useEffect(() => { doSearch(sympathySearch, setSympathyResults, setSympathyOpen); }, [sympathySearch, doSearch]);

  const selectHeart = (club: ClubResult) => {
    setHeartClub(club);
    setHeartSearch("");
    setHeartResults([]);
    setHeartOpen(false);
    toast({ title: `${club.name} selecionado! ❤️`, duration: 1500 });
    setTimeout(() => sympathyInputRef.current?.focus(), 200);
  };

  const selectSympathy = (club: ClubResult) => {
    if (sympathyClubs.length >= 4) return;
    const isDuplicate = sympathyClubs.some(c => c.name === club.name) || (heartClub?.name === club.name);
    if (isDuplicate) {
      toast({ title: "Clube já selecionado", variant: "destructive" });
      return;
    }
    setSympathyClubs(prev => [...prev, club]);
    setSympathySearch("");
    setSympathyResults([]);
    setSympathyOpen(false);
    setTimeout(() => sympathyInputRef.current?.focus(), 200);
  };

  const handleConfirmVote = async () => {
    if (!heartClub || !user || !profile) return;
    setSubmitting(true);
    try {
      const votes = [
        { user_id: user.id, clube_nome: heartClub.name, cidade: profile.cidade || "", estado: profile.estado || "", pais: profile.pais || "BR", is_original_vote: true },
        ...sympathyClubs.map(s => ({ user_id: user.id, clube_nome: s.name, cidade: profile.cidade || "", estado: profile.estado || "", pais: profile.pais || "BR", is_original_vote: false }))
      ];
      
      const { error } = await supabase.from("votos").insert(votes);
      if (error) throw error;

      // ATUALIZAÇÃO CRÍTICA: Força o refresh do perfil para o hasVoted virar true
      await refreshProfile();
      
      toast({ title: "Voto Sagrado Registrado! 🎉" });
      
      // REDIRECIONAMENTO DEFINITIVO: Impede o usuário de voltar para esta página
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao votar", description: err.message });
    } finally {
      setSubmitting(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-6">
      <div className="w-full max-w-lg space-y-6 z-10">
        <div className="text-center space-y-3">
          <img src={logo} alt="Heart Club" className="mx-auto w-20 h-20" />
          <h1 className="text-2xl font-bold">Voto Sagrado</h1>
        </div>

        {/* CORAÇÃO */}
        <div className="space-y-2 relative">
          <label className="text-sm font-semibold flex items-center gap-2">
            <Heart className="w-4 h-4 text-primary" fill="currentColor" /> Clube do Coração
          </label>
          {heartClub ? (
            <div className="flex items-center gap-3 glass-card rounded-xl p-4 border border-primary/50">
              <ClubLogo src={heartClub.logo} alt={heartClub.name} size="md" />
              <div className="flex-1 font-bold">{heartClub.name}</div>
              <button onClick={() => setHeartClub(null)}><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
              <Input
                ref={heartInputRef}
                className="pl-10 h-12 bg-secondary/20"
                placeholder="Busque seu time do coração..."
                value={heartSearch}
                onChange={e => setHeartSearch(e.target.value)}
                onFocus={() => heartSearch.length >= 2 && setHeartOpen(true)}
                onBlur={() => setTimeout(() => setHeartOpen(false), 200)}
              />
              {heartOpen && heartResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-[9999] mt-1 bg-[#1a1a1a] border border-white/20 rounded-xl shadow-2xl overflow-hidden">
                  {heartResults.map((c, i) => (
                    <div
                      key={i}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectHeart(c)}
                      className="flex items-center gap-3 p-4 hover:bg-white/10 cursor-pointer border-b border-white/5 last:border-0"
                    >
                      <ClubLogo src={c.logo} alt={c.name} size="sm" />
                      <span className="text-sm font-bold text-white">{c.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* SIMPATIAS */}
        <div className="space-y-3 relative">
          <label className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Clubes de Simpatia ({sympathyClubs.length}/4)
          </label>
          <div className="space-y-2">
            {sympathyClubs.map((c, i) => (
              <div key={i} className="flex items-center gap-3 p-3 glass-card rounded-xl border border-border/50">
                <ClubLogo src={c.logo} alt={c.name} size="sm" />
                <span className="flex-1 text-sm font-medium">{c.name}</span>
                <button onClick={() => setSympathyClubs(p => p.filter((_, idx) => idx !== i))}><X className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
          {sympathyClubs.length < 4 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={sympathyInputRef}
                className="pl-10 h-12 bg-secondary/10"
                placeholder="Próxima simpatia..."
                value={sympathySearch}
                onChange={e => setSympathySearch(e.target.value)}
                onFocus={() => sympathySearch.length >= 2 && setSympathyOpen(true)}
                onBlur={() => setTimeout(() => setSympathyOpen(false), 200)}
              />
              {sympathyOpen && sympathyResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-[9999] mt-1 bg-[#1a1a1a] border border-white/20 rounded-xl shadow-2xl overflow-hidden">
                  {sympathyResults.map((c, i) => (
                    <div
                      key={i}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectSympathy(c)}
                      className="flex items-center gap-3 p-4 hover:bg-white/10 cursor-pointer border-b border-white/5 last:border-0"
                    >
                      <ClubLogo src={c.logo} alt={c.name} size="sm" />
                      <span className="text-sm font-bold text-white">{c.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* AVISO DE VOTO ÚNICO */}
        <div className="glass-card rounded-xl p-4 border border-orange-500/20 bg-orange-500/5 text-center space-y-2">
          <Shield className="w-5 h-5 text-primary mx-auto" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground block mb-1">DECISÃO DEFINITIVA</strong>
            Ao confirmar, seu voto será registrado permanentemente. Você <strong className="text-foreground">não poderá alterar</strong> suas escolhas e esta página ficará inacessível para sempre.
          </p>
        </div>

        <Button
          className="w-full h-14 btn-orange-gradient font-bold"
          disabled={!heartClub}
          onClick={() => setShowConfirm(true)}
        >
          Confirmar Voto
        </Button>
      </div>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle>Finalizar?</DialogTitle></DialogHeader>
          <DialogFooter className="flex-col gap-2">
            <Button variant="outline" onClick={() => setShowConfirm(false)}>Ajustar</Button>
            <Button onClick={handleConfirmVote} disabled={submitting} className="btn-orange-gradient">
              {submitting ? <Loader2 className="animate-spin" /> : "Confirmar Voto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Voting;