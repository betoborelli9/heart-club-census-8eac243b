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

  const selectHeart = (club: ClubResult) => {
    setHeartClub(club); setHeartSearch(""); setHeartResults([]); setHeartOpen(false);
    toast({ title: `${club.name} selecionado! ❤️`, duration: 1500 });
  };

  const selectSympathy = (club: ClubResult) => {
    if (sympathyClubs.length >= 4) return;
    const isDuplicate = sympathyClubs.find(c => (c.id && c.id === club.id) || (c.name.toLowerCase() === club.name.toLowerCase()));
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
    const raw = `${canvas.toDataURL()}|${navigator.userAgent}`;
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
  };

  const handleConfirmVote = async () => {
    if (!heartClub || !user || !profile) return;
    setSubmitting(true);
    try {
      const fingerprint = await generateFingerprint();
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

      for (const sym of sympathyClubs) {
        await supabase.from("votos").insert({
          user_id: user.id,
          clube_nome: sym.name,
          cidade: profile.cidade || "",
          estado: profile.estado || "",
          pais: profile.pais || "BR",
          fingerprint,
          is_original_vote: false,
        });
      }

      await refreshProfile();
      toast({ title: "Voto registrado! 🎉" });
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao votar", description: err.message });
    } finally {
      setSubmitting(false);
      setShowConfirm(false);
    }
  };

  const ClubDropdown = ({ results, open, onSelect, searchQuery }: any) => {
    if (!open) return null;
    return (
      <div className="absolute top-full left-0 right-0 z-[999] mt-1 rounded-xl border border-border/30 max-h-72 overflow-y-auto bg-card shadow-2xl">
        {results.map((club: any, i: number) => (
          <button key={i} onMouseDown={(e) => { e.preventDefault(); onSelect(club); }}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/10 text-left border-b border-border/10 last:border-0">
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
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-6 relative">
      <div className="w-full max-w-lg space-y-6 relative z-10">
        <div className="text-center space-y-3">
          <img src={logo} alt="Logo" className="mx-auto w-20 h-20" />
          <h1 className="text-2xl font-bold italic">Voto Sagrado</h1>
        </div>

        {/* Heart Club */}
        <div className="space-y-2 relative">
          <label className="text-sm font-semibold flex items-center gap-2">❤️ Clube do Coração</label>
          {heartClub ? (
            <div className="flex items-center gap-3 glass-card rounded-xl p-4 border-2 border-primary">
              <ClubLogo src={heartClub.logo} alt={heartClub.name} size="md" />
              <p className="font-bold flex-1 italic">{heartClub.name}</p>
              <button onClick={() => setHeartClub(null)}><X className="w-5 h-5" /></button>
            </div>
          ) : (
            <div className="relative">
              <Input className="pl-10 h-12" placeholder="Buscar clube..." value={heartSearch}
                onChange={e => setHeartSearch(e.target.value)} onBlur={() => setTimeout(() => setHeartOpen(false), 200)} />
              <ClubDropdown results={heartResults} open={heartOpen} onSelect={selectHeart} searchQuery={heartSearch} />
            </div>
          )}
        </div>

{/* Sympathy */}
<div className="space-y-3">
  <label className="text-sm font-semibold flex items-center gap-2">
    ✨ Clubes de Simpatia
  </label>
  <div className="space-y-2">
    <AnimatePresence>
      {sympathyClubs.map((club, idx) => (
        <motion.button
          key={idx}
          type="button"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => handleSympathyVote(club)}   // clique para votar
          className="flex items-center gap-3 glass-card rounded-xl p-3 border border-border/20 w-full text-left hover:bg-zinc-800 transition-colors"
        >
          <ClubLogo src={club.logo} alt={club.name} size="sm" />
          <p className="font-medium flex-1 text-sm italic">{club.name}</p>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              removeSympathy(idx);
            }}
          >
            <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
          </button>
        </motion.button>
      ))}
    </AnimatePresence>
  </div>

  {sympathyClubs.length < 4 && (
    <div className="relative">
      <Input
        className="pl-10 h-11"
        placeholder="Buscar simpatia..."
        value={sympathySearch}
        onChange={(e) => setSympathySearch(e.target.value)}
        onBlur={() => setTimeout(() => setSympathyOpen(false), 200)}
      />
      <ClubDropdown
        results={sympathyResults}
        open={sympathyOpen}
        onSelect={selectSympathy}
        searchQuery={sympathySearch}
      />
    </div>
  )}
</div>

<Button
  className="w-full h-14 font-bold text-lg btn-orange-gradient"
  disabled={!heartClub || submitting}
  onClick={() => setShowConfirm(true)}
>
  {submitting ? <Loader2 className="animate-spin" /> : "Confirmar Voto"}
</Button>
</div>

<Dialog open={showConfirm} onOpenChange={setShowConfirm}>
  <DialogContent className="max-w-sm">
    <DialogHeader>
      <DialogTitle className="italic">Confirmar Lealdade?</DialogTitle>
    </DialogHeader>
    <DialogFooter className="gap-2">
      <Button variant="outline" onClick={() => setShowConfirm(false)}>
        Voltar
      </Button>
      <Button onClick={handleConfirmVote} className="btn-orange-gradient">
        Juro Lealdade
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
</div>
);
};

export default Voting;
