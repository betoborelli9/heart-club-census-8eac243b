import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Loader2, X, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { searchClubsLocal } from "@/lib/search-clubs";
import { ClubLogo } from "@/components/ClubLogo";
import logo from "@/assets/logo.png";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const Voting = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading, isAuthenticated, isProfileComplete, hasVoted, refreshProfile } = useUser();
  const { toast } = useToast();

  const heartInputRef = useRef<HTMLInputElement>(null);
  const sympathyInputRef = useRef<HTMLInputElement>(null);

  const [heartSearch, setHeartSearch] = useState("");
  const [heartResults, setHeartResults] = useState<any[]>([]);
  const [heartClub, setHeartClub] = useState<any | null>(null);
  const [heartOpen, setHeartOpen] = useState(false);

  const [sympathySearch, setSympathySearch] = useState("");
  const [sympathyResults, setSympathyResults] = useState<any[]>([]);
  const [sympathyClubs, setSympathyClubs] = useState<any[]>([]);
  const [sympathyOpen, setSympathyOpen] = useState(false);

  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/login", { replace: true });
    else if (!isLoading && isAuthenticated && !isProfileComplete) navigate("/profile-setup", { replace: true });
    else if (!isLoading && isAuthenticated && hasVoted) navigate("/dashboard", { replace: true });
  }, [isLoading, isAuthenticated, isProfileComplete, hasVoted, navigate]);

  const doSearch = useCallback((query: string, setter: (r: any[]) => void, setOpen: (b: boolean) => void) => {
    if (query.length < 2) { setter([]); setOpen(false); return; }
    const results = searchClubsLocal(query, 10);
    setter(results);
    setOpen(true);
  }, []);

  useEffect(() => { doSearch(heartSearch, setHeartResults, setHeartOpen); }, [heartSearch, doSearch]);
  useEffect(() => { doSearch(sympathySearch, setSympathyResults, setSympathyOpen); }, [sympathySearch, doSearch]);

  const selectHeart = (club: any) => {
    setHeartClub(club);
    setHeartSearch("");
    setHeartOpen(false);
    toast({ title: `${club.name} selecionado! ❤️` });
    setTimeout(() => sympathyInputRef.current?.focus(), 150);
  };

  const selectSympathy = (club: any) => {
    if (sympathyClubs.length >= 4) return;
    if (sympathyClubs.find(c => c.name === club.name) || (heartClub?.name === club.name)) return;
    setSympathyClubs(prev => [...prev, club]);
    setSympathySearch("");
    setSympathyOpen(false);
    setTimeout(() => sympathyInputRef.current?.focus(), 150);
  };

  const removeSympathy = (idx: number) => setSympathyClubs(prev => prev.filter((_, i) => i !== idx));

  // FUNÇÃO QUE GRAVA NO BANCO (O que o botão "Juro Lealdade" faz)
  const handleConfirmVote = async () => {
    if (!heartClub || !user || !profile) return;
    setSubmitting(true);
    try {
      // Grava o Clube do Coração
      const { error: mainError } = await supabase.from("votos").insert({
        user_id: user.id,
        clube_nome: heartClub.name,
        cidade: profile.cidade || "",
        estado: profile.estado || "",
        pais: profile.pais || "BR",
        is_original_vote: true
      });

      if (mainError) throw mainError;

      // Grava as Simpatias
      for (const sym of sympathyClubs) {
        await supabase.from("votos").insert({
          user_id: user.id,
          clube_nome: sym.name,
          cidade: profile.cidade || "",
          estado: profile.estado || "",
          pais: profile.pais || "BR",
          is_original_vote: false
        });
      }

      await refreshProfile();
      toast({ title: "Voto Sagrado registrado! 🦅" });
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao votar", description: err.message });
    } finally {
      setSubmitting(false);
      setShowConfirm(false);
    }
  };

  const ClubDropdown = ({ results, open, onSelect }: any) => {
    if (!open || results.length === 0) return null;
    return (
      <div className="absolute top-full left-0 right-0 z-[999] mt-1 rounded-xl border border-border/30 max-h-72 overflow-y-auto bg-card shadow-2xl">
        {results.map((club: any, i: number) => (
          <button key={i} type="button" onMouseDown={(e) => { e.preventDefault(); onSelect(club); }}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/10 text-left border-b border-border/10 last:border-0 cursor-pointer">
            <ClubLogo src={club.logo} alt={club.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground text-sm truncate italic">{club.name}</p>
              <p className="text-xs text-muted-foreground truncate">{club.location}</p>
            </div>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-6 relative">
      <div className="w-full max-w-lg space-y-6 relative z-10">
        <div className="text-center space-y-3">
          <img src={logo} alt="Logo" className="mx-auto w-20 h-20" />
          <h1 className="text-2xl font-bold italic font-display">Voto Sagrado</h1>
        </div>

        <div className="space-y-2 relative">
          <label className="text-sm font-semibold flex items-center gap-2">❤️ Clube do Coração</label>
          {heartClub ? (
            <div className="flex items-center gap-3 glass-card rounded-xl p-4 border-2 border-primary">
              <ClubLogo src={heartClub.logo} alt={heartClub.name} size="md" />
              <p className="font-bold flex-1 italic">{heartClub.name}</p>
              <button onClick={() => setHeartClub(null)} className="cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
              <Input ref={heartInputRef} className="pl-10 h-12" placeholder="Buscar seu time..." value={heartSearch}
                onChange={e => setHeartSearch(e.target.value)} onBlur={() => setTimeout(() => setHeartOpen(false), 200)} />
              <ClubDropdown results={heartResults} open={heartOpen} onSelect={selectHeart} />
            </div>
          )}
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold flex items-center gap-2">✨ Clubes de Simpatia</label>
          <div className="space-y-2">
            <AnimatePresence>
              {sympathyClubs.map((club, idx) => (
                <motion.div key={idx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-3 glass-card rounded-xl p-3 border border-border/20">
                  <ClubLogo src={club.logo} alt={club.name} size="sm" />
                  <p className="font-medium flex-1 text-sm italic">{club.name}</p>
                  <button type="button" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); removeSympathy(idx); }}>
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {sympathyClubs.length < 4 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input ref={sympathyInputRef} className="pl-10 h-11" placeholder="Buscar simpatia..." value={sympathySearch}
                onChange={e => setSympathySearch(e.target.value)} onBlur={() => setTimeout(() => setSympathyOpen(false), 200)} />
              <ClubDropdown results={sympathyResults} open={sympathyOpen} onSelect={selectSympathy} />
            </div>
          )}
        </div>

        <Button className="w-full h-14 font-bold text-lg btn-orange-gradient rounded-xl" 
          disabled={!heartClub || submitting} onClick={() => setShowConfirm(true)}>
          {submitting ? <Loader2 className="animate-spin" /> : "Confirmar Voto"}
        </Button>
      </div>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-sm glass-card border-white/10">
          <DialogHeader>
            <DialogTitle className="italic text-xl">Confirmar Lealdade?</DialogTitle>
            <DialogDescription className="italic">
              Você jura lealdade ao <strong>{heartClub?.name}</strong>? Esta ação é definitiva.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowConfirm(false)}>Voltar</Button>
            <Button onClick={handleConfirmVote} className="btn-orange-gradient font-bold" disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin" /> : "Juro Lealdade"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Voting;