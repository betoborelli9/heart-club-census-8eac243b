import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Search, Check, AlertTriangle, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { clubs, Club } from "@/data/clubs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Voting = () => {
  const navigate = useNavigate();
  const { user, profile, hasVoted, isLoading, isAuthenticated, isProfileComplete, refreshProfile } = useUser();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [sympathyClubs, setSympathyClubs] = useState<string[]>([]);
  const [sympathySearch, setSympathySearch] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<"heart" | "sympathy">("heart");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/login", { replace: true });
    if (!isLoading && isAuthenticated && !isProfileComplete) navigate("/profile-setup", { replace: true });
    if (!isLoading && hasVoted) navigate("/dashboard", { replace: true });
  }, [isLoading, isAuthenticated, isProfileComplete, hasVoted, navigate]);

  const filteredClubs = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return clubs.slice(0, 16);
    return clubs.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.shortName.toLowerCase().includes(q) ||
      c.state.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const sympathyFiltered = useMemo(() => {
    const q = sympathySearch.toLowerCase();
    const available = clubs.filter(c => c.id !== selectedClub?.id);
    if (!q) return available.slice(0, 16);
    return available.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.shortName.toLowerCase().includes(q)
    );
  }, [sympathySearch, selectedClub]);

  const toggleSympathy = (id: string) => {
    setSympathyClubs(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : prev.length < 4 ? [...prev, id] : prev
    );
  };

  const generateFingerprint = async (): Promise<string> => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.textBaseline = "top";
      ctx.font = "14px Arial";
      ctx.fillText("HCG-fingerprint", 2, 2);
    }
    const canvasData = canvas.toDataURL();
    const ua = navigator.userAgent;
    const lang = navigator.language;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const screen = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
    
    const raw = `${canvasData}|${ua}|${lang}|${tz}|${screen}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(raw);
    const hash = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hash));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  };

  const handleConfirmVote = async () => {
    if (!selectedClub || !user || !profile) return;
    setSubmitting(true);

    try {
      const fingerprint = await generateFingerprint();

      const { error } = await supabase.from("votos").insert({
        user_id: user.id,
        clube_nome: selectedClub.name,
        cidade: profile.cidade || "",
        estado: profile.estado || "",
        pais: profile.pais || "BR",
        fingerprint,
      });

      if (error) throw error;

      // Insert sympathy votes
      for (const symId of sympathyClubs) {
        const sym = clubs.find(c => c.id === symId);
        if (sym) {
          await supabase.from("votos").insert({
            user_id: user.id,
            clube_nome: sym.name,
            cidade: profile.cidade || "",
            estado: profile.estado || "",
            pais: profile.pais || "BR",
            fingerprint,
            is_suspicious: false,
          });
        }
      }

      await refreshProfile();
      toast({ title: "Voto registrado! 🎉", description: `Seu coração é ${selectedClub.name} para sempre!` });
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao votar", description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-start px-4 py-8 relative overflow-hidden">
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full opacity-5"
        style={{ background: "radial-gradient(circle, hsl(24 100% 50%) 0%, transparent 60%)" }} />

      <div className="w-full max-w-lg space-y-6 relative z-10">
        {/* Header */}
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-xl flex items-center justify-center animate-pulse-glow"
            style={{ background: "var(--gradient-orange)" }}>
            <Heart className="w-7 h-7 text-white" fill="currentColor" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">Voto Sagrado</h1>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            {step === "heart"
              ? "Escolha seu Clube do Coração. Este voto é eterno e irrevogável."
              : "Escolha até 4 clubes de simpatia (opcional)"}
          </p>
        </motion.div>

        {/* Steps indicator */}
        <div className="flex gap-2 justify-center">
          <div className={`h-1.5 w-16 rounded-full transition-colors ${step === "heart" ? "bg-primary" : "bg-primary/30"}`} />
          <div className={`h-1.5 w-16 rounded-full transition-colors ${step === "sympathy" ? "bg-primary" : "bg-muted"}`} />
        </div>

        <AnimatePresence mode="wait">
          {step === "heart" && (
            <motion.div
              key="heart"
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -50, opacity: 0 }}
              className="space-y-4"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-10 h-12 bg-secondary/30 border-border/30"
                  placeholder="Buscar clube..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-1">
                {filteredClubs.map(club => (
                  <button
                    key={club.id}
                    onClick={() => setSelectedClub(club)}
                    className={`glass-card-hover flex items-center gap-3 p-3 rounded-xl text-left text-sm transition-all ${
                      selectedClub?.id === club.id
                        ? "glow-border bg-primary/10"
                        : ""
                    }`}
                  >
                    <span className="text-2xl">{club.emoji}</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{club.name}</p>
                      <p className="text-xs text-muted-foreground">{club.state}</p>
                    </div>
                    {selectedClub?.id === club.id && (
                      <Check className="w-4 h-4 text-primary ml-auto shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              <Button
                className="w-full h-14 font-bold text-lg btn-orange-gradient rounded-xl"
                disabled={!selectedClub}
                onClick={() => setShowConfirm(true)}
              >
                <Heart className="w-5 h-5 mr-2" fill="currentColor" />
                Confirmar Clube do Coração
              </Button>
            </motion.div>
          )}

          {step === "sympathy" && (
            <motion.div
              key="sympathy"
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -50, opacity: 0 }}
              className="space-y-4"
            >
              {sympathyClubs.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {sympathyClubs.map(id => {
                    const c = clubs.find(x => x.id === id);
                    return c ? (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 bg-primary/15 text-primary text-xs font-medium px-3 py-1.5 rounded-full cursor-pointer border border-primary/20"
                        onClick={() => toggleSympathy(id)}
                      >
                        {c.emoji} {c.shortName} ✕
                      </span>
                    ) : null;
                  })}
                </div>
              )}

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-10 h-12 bg-secondary/30 border-border/30"
                  placeholder="Buscar clube de simpatia..."
                  value={sympathySearch}
                  onChange={e => setSympathySearch(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
                {sympathyFiltered.map(club => {
                  const selected = sympathyClubs.includes(club.id);
                  return (
                    <button
                      key={club.id}
                      onClick={() => toggleSympathy(club.id)}
                      className={`glass-card-hover flex items-center gap-2 p-3 rounded-xl text-left text-sm ${
                        selected ? "glow-border bg-primary/10" : ""
                      }`}
                    >
                      {selected && <Check className="w-3 h-3 text-primary shrink-0" />}
                      <span className="text-lg">{club.emoji}</span>
                      <span className="font-medium text-foreground truncate">{club.name}</span>
                    </button>
                  );
                })}
              </div>

              <div className="glass-card rounded-xl p-4 text-center space-y-2">
                <Shield className="w-5 h-5 text-primary mx-auto" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Atenção:</strong> Após confirmar, sua votação será registrada permanentemente.
                  Esta página não estará mais disponível. Seu voto é sagrado e representa seu coração para sempre. ❤️
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-13 glass-card border-border/50"
                  onClick={() => setStep("heart")}
                >
                  Voltar
                </Button>
                <Button
                  className="flex-1 h-13 font-bold btn-orange-gradient rounded-xl animate-pulse-glow"
                  onClick={handleConfirmVote}
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <Heart className="w-5 h-5 mr-2" fill="currentColor" />
                  )}
                  Confirmar Voto
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-sm glass-card border-border/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <AlertTriangle className="w-5 h-5 text-primary" />
              Voto Sagrado
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Você está prestes a declarar{" "}
              <strong className="text-foreground">{selectedClub?.name}</strong> como seu Clube do Coração.
              <br /><br />
              <span className="text-primary font-semibold">
                Este voto é eterno e não poderá ser alterado. Nunca. 🔒
              </span>
              <br /><br />
              Tem certeza absoluta?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConfirm(false)} className="glass-card border-border/50">
              Deixa eu pensar...
            </Button>
            <Button
              onClick={() => {
                setShowConfirm(false);
                setStep("sympathy");
              }}
              className="font-bold btn-orange-gradient"
            >
              <Heart className="w-4 h-4 mr-1" fill="currentColor" />
              Confirmar para sempre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Voting;
