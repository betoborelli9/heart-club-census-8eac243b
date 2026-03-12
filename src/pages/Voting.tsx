// Path: src/pages/Voting.tsx
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Search, Check, Loader2, Shield, X, Sparkles, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { searchClubsLocal, ClubSearchResult } from "@/lib/search-clubs";
import { ClubLogo } from "@/components/ClubLogo";
import logo from "@/assets/logo.png";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ClubResult {
  id: string | null;
  name: string;
  shortName: string;
  location: string | null;
  logo: string | null;
  mascote: string | null;
  isCustom?: boolean;
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
    if (query.length < 2) { setter([]); setOpen(false); return; }
    const results = searchClubsLocal(query, 10).map(toClubResult);
    setter(results);
    setOpen(true);
  }, []);

  useEffect(() => { doSearch(heartSearch, setHeartResults, setHeartOpen); }, [heartSearch, doSearch]);
  useEffect(() => { doSearch(sympathySearch, setSympathyResults, setSympathyOpen); }, [sympathySearch, doSearch]);

  const createCustomClub = (name: string): ClubResult => ({
    id: null, name: name.trim(), shortName: name.trim(), location: null, logo: null, mascote: null, isCustom: true,
  });

  const selectHeart = (club: ClubResult) => {
    setHeartClub(club); setHeartSearch(""); setHeartResults([]); setHeartOpen(false);
    toast({ title: `${club.name} selecionado! ❤️`, duration: 1500 });
    setTimeout(() => sympathyInputRef.current?.focus(), 150);
  };
  const selectHeartCustom = () => { if (heartSearch.trim().length < 2) return; selectHeart(createCustomClub(heartSearch)); };

  const selectSympathy = (club: ClubResult) => {
    if (sympathyClubs.length >= 4) return;
    const isDuplicate = sympathyClubs.find(c => (c.id && c.id === club.id) || (!c.id && !club.id && c.name.toLowerCase() === club.name.toLowerCase()));
    if (isDuplicate) return;
    if (heartClub && (heartClub.id === club.id || heartClub.name.toLowerCase() === club.name.toLowerCase())) return;

    setSympathyClubs(prev => [...prev, club]); 
    setSympathySearch(""); 
    setSympathyResults([]); 
    setSympathyOpen(false);
    toast({ title: `${club.name} adicionado! ✨`, duration: 1500 });
  };

  const removeSympathy = (idx: number) => setSympathyClubs(prev => prev.filter((_, i) => i !== idx));

  const generateFingerprint = async (): Promise<string> => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (ctx) { ctx.textBaseline = "top"; ctx.font = "14px Arial"; ctx.fillText("HCG-fp", 2, 2); }
    const raw = `${canvas.toDataURL()}|${navigator.userAgent}|${navigator.language}|${Intl.DateTimeFormat().resolvedOptions().timeZone}|${window.screen.width}x${window.screen.height}`;
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
  };

  const handleConfirmVote = async () => {
    if (!heartClub || !user || !profile) return;
    setSubmitting(true);
    try {
      const fingerprint = await generateFingerprint();
      
      // CORREÇÃO AQUI: Voltando para 'data: mainVote' para não quebrar o banco
      const { data: mainVote, error: mainError } = await supabase
        .from("votos")
        .insert({
          user_id: user.id,
          clube_nome: heartClub.name,
          cidade: profile.cidade || "",
          estado: profile.estado || "",
          pais: profile.pais || "BR",
          fingerprint,
        })
        .select()
        .single();

      if (mainError) throw mainError;
      if (!mainVote?.id) throw new Error("Falha ao registrar voto principal.");

      for (const sym of sympathyClubs) {
        await supabase
          .from("votos")
          .insert({
            user_id: user.id,
            clube_nome: sym.name,
            cidade: profile.cidade || "",
            estado: profile.estado || "",
            pais: profile.pais || "BR",
            fingerprint,
            is_original_vote: false,
          })
          .select()
          .single();
      }

      await refreshProfile();
      toast({ title: "Voto registrado! 🎉", description: `Seu coração é ${heartClub.name} para sempre!` });
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao votar", description: err.message });
    } finally {
      setSubmitting(false);
      setShowConfirm(false);
    }
  };

  const ClubDropdown = ({ results, open, onSelect, searchQuery, onCustom }: {
    results: ClubResult[]; open: boolean; onSelect: (c: ClubResult) => void; searchQuery: string; onCustom: () => void;
  }) => {
    if (!open) return null;
    return (
      <div className="absolute top-full left-0 right-0 z-[999] mt-1 rounded-xl border border-border/30 max-h-72 overflow-y-auto bg-card shadow-2xl">
        {results.length === 0 && searchQuery.trim().length >= 2 && (
          <div className="py-3 px-4 text-center space-y-2">
            <p className="text-sm text-muted-foreground">Nenhum clube encontrado</p>
            <button onMouseDown={(e) => { e.preventDefault(); onCustom(); }} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline cursor-pointer">
              <Plus className="w-4 h-4" /> Adicionar "{searchQuery.trim()}"
            </button>
          </div>
        )}
        {results.map((club, i) => (
          <button key={`${club.id || club.name}-${i}`} onMouseDown={(e) => { e.preventDefault(); onSelect(club); }}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/10 transition-colors text-left border-b border-border/10 last:border-0 cursor-pointer">
            <ClubLogo src={club.logo} alt={club.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground text-sm truncate">{club.name}</p>
              <p className="text-xs text-muted-foreground truncate">{club.location}</p>
            </div>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-6 relative overflow-hidden">
      <div className="w-full max-w-lg space-y-6 relative z-10">
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center space-y-3">
          <img src={logo} alt="Heart Club" className="mx-auto w-20 h-20 object-contain" />
          <h1 className="text-2xl font-display font-bold text-foreground italic">Voto Sagrado</h1>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto italic">
            Escolha seu Clube do Coração e até 4 clubes de simpatia.🌍
          </p>
        </motion.div>

        {/* Heart Club */}
        <motion.div className="space-y-2 relative z-[100]">
          <label className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Heart className="w-4 h-4 text-primary" fill="currentColor" /> Clube do Coração
          </label>
          {heartClub ? (
            <div className="flex items-center gap-3 glass-card glow-border rounded-xl p-4 relative z-[101]">
              <ClubLogo src={heartClub.logo} alt={heartClub.name} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground italic">{heartClub.name}</p>
                <p className="text-xs text-muted-foreground">{heartClub.isCustom ? "Manual" : heartClub.location}</p>
              </div>
              <button onClick={() => setHeartClub(null)} className="text-muted-foreground hover:text-foreground p-1 cursor-pointer relative z-[110]"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <div className="relative z-[101]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
              <Input ref={heartInputRef} className="pl-10 h-12 bg-secondary/30 border-primary/30" placeholder="Buscar clube..."
                value={heartSearch} onChange={e => setHeartSearch(e.target.value)} onBlur={() => setTimeout(() => setHeartOpen(false), 200)} autoComplete="off" />
              <ClubDropdown results={heartResults} open={heartOpen} onSelect={selectHeart} searchQuery={heartSearch} onCustom={selectHeartCustom} />
            </div>
          )}
        </motion.div>

        {/* Sympathy */}
        <motion.div className="space-y-3 relative z-[50]">
          <label className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Clubes de Simpatia
          </label>
          <div className="space-y-2">
            <AnimatePresence>
              {sympathyClubs.map((club, idx) => (
                <motion.div key={`sym-${idx}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-3 glass-card rounded-xl p-3 border border-border/20 relative z-[60]">
                  <ClubLogo src={club.logo} alt={club.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm italic">{club.name}</p>
                  </div>
                  {/* FIX AQUI: onMouseDown garante que o clique funcione antes do dropdown fechar */}
                  <button 
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); removeSympathy(idx); }}
                    className="text-muted-foreground hover:text-destructive p-2 cursor-pointer relative z-[70]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {sympathyClubs.length < 4 && (
            <div className="relative z-[55]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input ref={sympathyInputRef} className="pl-10 h-11 bg-secondary/30 border-border/30"
                placeholder="Buscar simpatia..."
                value={sympathySearch} onChange={e => setSympathySearch(e.target.value)} onBlur={() => setTimeout(() => setSympathyOpen(false), 200)} autoComplete="off" />
              <ClubDropdown results={sympathyResults} open={sympathyOpen} onSelect={selectSympathy} searchQuery={sympathySearch} onCustom={selectSympathyCustom} />
            </div>
          )}
        </motion.div>

        {/* Submit */}
        <div className="pt-2 relative z-10">
          <Button className="w-full h-14 font-bold text-lg btn-orange-gradient rounded-xl" disabled={!heartClub || submitting} onClick={() => setShowConfirm(true)}>
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirmar Voto Sagrado"}
          </Button>
        </div>
      </div>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-sm glass-card border-border/30 z-[9999]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display italic">Confirmar Voto</DialogTitle>
            <DialogDescription className="italic text-zinc-400">
              Você jura lealdade ao <strong>{heartClub?.name}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConfirm(false)}>Voltar</Button>
            <Button onClick={handleConfirmVote} className="font-bold btn-orange-gradient" disabled={submitting}>
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Juro Lealdade"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Voting;