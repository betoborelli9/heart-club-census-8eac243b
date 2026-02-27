import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Search, Check, Loader2, Shield, X, Sparkles, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
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

  // Heart club
  const [heartSearch, setHeartSearch] = useState("");
  const [heartResults, setHeartResults] = useState<ClubResult[]>([]);
  const [heartClub, setHeartClub] = useState<ClubResult | null>(null);
  const [heartLoading, setHeartLoading] = useState(false);
  const [heartOpen, setHeartOpen] = useState(false);

  // Sympathy clubs
  const [sympathySearch, setSympathySearch] = useState("");
  const [sympathyResults, setSympathyResults] = useState<ClubResult[]>([]);
  const [sympathyClubs, setSympathyClubs] = useState<ClubResult[]>([]);
  const [sympathyLoading, setSympathyLoading] = useState(false);
  const [sympathyOpen, setSympathyOpen] = useState(false);

  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const heartDebounce = useRef<NodeJS.Timeout>();
  const sympathyDebounce = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/login", { replace: true });
    if (!isLoading && isAuthenticated && !isProfileComplete) navigate("/profile-setup", { replace: true });
  }, [isLoading, isAuthenticated, isProfileComplete, navigate]);

  const searchClubs = useCallback(async (query: string, setter: (r: ClubResult[]) => void, setLoading: (b: boolean) => void) => {
    if (query.length < 2) { setter([]); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("search-clubs", {
        body: { query },
      });
      if (error) throw error;
      setter(Array.isArray(data) ? data : []);
    } catch {
      setter([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Heart search debounce
  useEffect(() => {
    clearTimeout(heartDebounce.current);
    if (heartSearch.length >= 2) {
      heartDebounce.current = setTimeout(() => {
        searchClubs(heartSearch, setHeartResults, setHeartLoading);
        setHeartOpen(true);
      }, 400);
    } else {
      setHeartResults([]);
      setHeartOpen(false);
    }
    return () => clearTimeout(heartDebounce.current);
  }, [heartSearch, searchClubs]);

  // Sympathy search debounce
  useEffect(() => {
    clearTimeout(sympathyDebounce.current);
    if (sympathySearch.length >= 2) {
      sympathyDebounce.current = setTimeout(() => {
        searchClubs(sympathySearch, setSympathyResults, setSympathyLoading);
        setSympathyOpen(true);
      }, 400);
    } else {
      setSympathyResults([]);
      setSympathyOpen(false);
    }
    return () => clearTimeout(sympathyDebounce.current);
  }, [sympathySearch, searchClubs]);

  const createCustomClub = (name: string): ClubResult => ({
    id: null,
    api_id: null,
    name: name.trim(),
    shortName: name.trim(),
    city: null,
    country: null,
    logo: null,
    isCustom: true,
  });

  const selectHeart = (club: ClubResult) => {
    setHeartClub(club);
    setHeartSearch("");
    setHeartResults([]);
    setHeartOpen(false);
    toast({ title: `${club.name} selecionado! ❤️`, duration: 1500 });
  };

  const selectHeartCustom = () => {
    if (heartSearch.trim().length < 2) return;
    selectHeart(createCustomClub(heartSearch));
  };

  const selectSympathy = (club: ClubResult) => {
    if (sympathyClubs.length >= 4) return;
    const isDuplicate = sympathyClubs.find(c =>
      (c.api_id && c.api_id === club.api_id) ||
      (!c.api_id && !club.api_id && c.name.toLowerCase() === club.name.toLowerCase())
    );
    if (isDuplicate) return;
    if (heartClub && heartClub.api_id && heartClub.api_id === club.api_id) return;
    if (heartClub && !heartClub.api_id && heartClub.name.toLowerCase() === club.name.toLowerCase()) return;
    setSympathyClubs(prev => [...prev, club]);
    setSympathySearch("");
    setSympathyResults([]);
    setSympathyOpen(false);
    toast({ title: `${club.name} adicionado! ✨`, duration: 1500 });
  };

  const selectSympathyCustom = () => {
    if (sympathySearch.trim().length < 2) return;
    selectSympathy(createCustomClub(sympathySearch));
  };

  const removeSympathy = (idx: number) => {
    setSympathyClubs(prev => prev.filter((_, i) => i !== idx));
  };

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
      const { error } = await supabase.from("votos").insert({
        user_id: user.id,
        clube_nome: heartClub.name,
        cidade: profile.cidade || "",
        estado: profile.estado || "",
        pais: profile.pais || "BR",
        fingerprint,
      });
      if (error) throw error;

      for (const sym of sympathyClubs) {
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

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const ClubDropdown = ({ results, loading, open, onSelect, searchQuery, onCustom }: {
    results: ClubResult[];
    loading: boolean;
    open: boolean;
    onSelect: (c: ClubResult) => void;
    searchQuery: string;
    onCustom: () => void;
  }) => {
    if (!open) return null;
    return (
      <div className="absolute top-full left-0 right-0 z-50 mt-1 glass-card rounded-xl border border-border/30 max-h-72 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Buscando clubes no mundo todo...</span>
          </div>
        )}
        {!loading && results.length === 0 && searchQuery.trim().length >= 2 && (
          <div className="py-3 px-4 text-center space-y-2">
            <p className="text-sm text-muted-foreground">Nenhum clube encontrado para "{searchQuery}"</p>
            <button
              onClick={onCustom}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <Plus className="w-4 h-4" />
              Adicionar "{searchQuery.trim()}" manualmente
            </button>
          </div>
        )}
        {results.map((club, i) => (
          <button
            key={`${club.api_id || club.name}-${i}`}
            onClick={() => onSelect(club)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/10 transition-colors text-left border-b border-border/10 last:border-0"
          >
            {club.logo ? (
              <img src={club.logo} alt="" className="w-8 h-8 object-contain rounded" />
            ) : (
              <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center text-xs text-muted-foreground">⚽</div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground text-sm truncate">{club.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {[club.city, club.country].filter(Boolean).join(" • ")}
              </p>
            </div>
          </button>
        ))}
        {!loading && results.length > 0 && searchQuery.trim().length >= 2 && (
          <button
            onClick={onCustom}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/10 transition-colors text-left border-t border-border/20"
          >
            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
              <Plus className="w-4 h-4 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              Não encontrou? Adicionar <strong className="text-foreground">"{searchQuery.trim()}"</strong>
            </p>
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-6 relative overflow-hidden">
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full opacity-5"
        style={{ background: "radial-gradient(circle, hsl(24 100% 50%) 0%, transparent 60%)" }} />

      <div className="w-full max-w-lg space-y-6 relative z-10">
        {/* Header */}
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center space-y-3">
          <img src={logo} alt="Heart Club" className="mx-auto w-20 h-20 object-contain" />
          <h1 className="text-2xl font-display font-bold text-foreground">Voto Sagrado</h1>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Escolha seu Clube do Coração e até 4 clubes de simpatia. Busque qualquer time do planeta! 🌍
          </p>
        </motion.div>

        {/* Heart Club Field */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="space-y-2">
          <label className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Heart className="w-4 h-4 text-primary" fill="currentColor" />
            Clube do Coração
          </label>

          {heartClub ? (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-3 glass-card glow-border rounded-xl p-4"
            >
              {heartClub.logo ? (
                <img src={heartClub.logo} alt="" className="w-10 h-10 object-contain" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg">⚽</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground">{heartClub.name}</p>
                <p className="text-xs text-muted-foreground">
                  {heartClub.isCustom ? "Adicionado manualmente" : [heartClub.city, heartClub.country].filter(Boolean).join(" • ")}
                </p>
              </div>
              <button onClick={() => setHeartClub(null)} className="text-muted-foreground hover:text-foreground p-1">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
              <Input
                className="pl-10 h-12 bg-secondary/30 border-primary/30 focus:border-primary focus:shadow-[0_0_15px_rgba(255,102,0,0.2)]"
                placeholder="Buscar qualquer clube do mundo..."
                value={heartSearch}
                onChange={e => setHeartSearch(e.target.value)}
                autoComplete="off"
              />
              <ClubDropdown
                results={heartResults}
                loading={heartLoading}
                open={heartOpen}
                onSelect={selectHeart}
                searchQuery={heartSearch}
                onCustom={selectHeartCustom}
              />
            </div>
          )}
        </motion.div>

        {/* Sympathy Clubs */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="space-y-3">
          <label className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Clubes de Simpatia
            <span className="text-xs font-normal text-muted-foreground ml-1">(opcionais, até 4)</span>
          </label>

          {/* Selected sympathy clubs */}
          <AnimatePresence>
            {sympathyClubs.map((club, idx) => (
              <motion.div
                key={`sym-${club.name}-${idx}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-3 glass-card rounded-xl p-3 border border-border/20"
              >
                {club.logo ? (
                  <img src={club.logo} alt="" className="w-8 h-8 object-contain" />
                ) : (
                  <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center text-sm">⚽</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm">{club.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {club.isCustom ? "Adicionado manualmente" : [club.city, club.country].filter(Boolean).join(" • ")}
                  </p>
                </div>
                <button onClick={() => removeSympathy(idx)} className="text-muted-foreground hover:text-destructive p-1">
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          {sympathyClubs.length < 4 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-10 h-11 bg-secondary/30 border-border/30 focus:border-primary"
                placeholder={`Buscar clube de simpatia ${sympathyClubs.length + 1}...`}
                value={sympathySearch}
                onChange={e => setSympathySearch(e.target.value)}
                autoComplete="off"
              />
              <ClubDropdown
                results={sympathyResults}
                loading={sympathyLoading}
                open={sympathyOpen}
                onSelect={selectSympathy}
                searchQuery={sympathySearch}
                onCustom={selectSympathyCustom}
              />
            </div>
          )}
        </motion.div>

        {/* Warning + Submit */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="space-y-4 pt-2">
          <div className="glass-card rounded-xl p-4 text-center space-y-2">
            <Shield className="w-5 h-5 text-primary mx-auto" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Modo de testes ativo.</strong> Você pode votar quantas vezes quiser durante esta fase.
            </p>
          </div>

          <Button
            className="w-full h-14 font-bold text-lg btn-orange-gradient rounded-xl"
            disabled={!heartClub}
            onClick={() => setShowConfirm(true)}
          >
            <Heart className="w-5 h-5 mr-2" fill="currentColor" />
            Confirmar Voto
          </Button>
        </motion.div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-sm glass-card border-border/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <Heart className="w-5 h-5 text-primary" fill="currentColor" />
              Confirmar Voto
            </DialogTitle>
            <DialogDescription className="text-muted-foreground space-y-2">
              <span>Clube do Coração: <strong className="text-foreground">{heartClub?.name}</strong></span>
              {sympathyClubs.length > 0 && (
                <span className="block">Simpatia: {sympathyClubs.map(c => c.name).join(", ")}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConfirm(false)} className="glass-card border-border/50">Voltar</Button>
            <Button onClick={handleConfirmVote} className="font-bold btn-orange-gradient" disabled={submitting}>
              {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Heart className="w-4 h-4 mr-1" fill="currentColor" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Voting;
