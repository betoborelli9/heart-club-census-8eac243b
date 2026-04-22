/**
 * [CAMINHO]: src/pages/Voting.tsx
 * [STATUS]: COMPLETO - LISTAGEM MÚLTIPLA + CORREÇÃO DE LOGO
 * [DESCRIÇÃO]: Interface de votação com dropdown expandido para múltiplos resultados da API Football.
 * [CONTEXTO]: Sistema de Votação - UNIFICAÇÃO DE BUSCA + IA INVESTIGADORA
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Loader2, X, Search, Sparkles, ShieldCheck, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { searchClubsWithFallback, ClubSearchResult } from "@/lib/search-clubs";
import { ClubLogo } from "@/components/ClubLogo";
import logo from "@/assets/logo.png";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import FingerprintJS from "@fingerprintjs/fingerprintjs";

type ClubResult = ClubSearchResult;
const MAX_SYMPATHY_CLUBS = 4;

const Voting = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useUser();
  const { toast } = useToast();

  const IS_MASTER_ADMIN = user?.email === "betoborelli9@gmail.com";

  const [heartSearch, setHeartSearch] = useState("");
  const [heartResults, setHeartResults] = useState<ClubResult[]>([]);
  const [heartClub, setHeartClub] = useState<ClubResult | null>(null);
  const [heartOpen, setHeartOpen] = useState(false);
  const [heartLoading, setHeartLoading] = useState(false);

  const [sympathySearch, setSympathySearch] = useState("");
  const [sympathyResults, setSympathyResults] = useState<ClubResult[]>([]);
  const [sympathyClubs, setSympathyClubs] = useState<ClubResult[]>([]);
  const [sympathyOpen, setSympathyOpen] = useState(false);
  const [sympathyLoading, setSympathyLoading] = useState(false);

  const [showConfirm, setShowConfirm] = useState(false);
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [manualClub, setManualClub] = useState({ nome: "", mascote: "", cidade: "", estado: "", cor: "" });

  useEffect(() => {
    const initFP = async () => {
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      setFingerprint(result.visitorId);
    };
    initFP();
  }, []);

  const performSearch = useCallback(async (query: string, setterResults: any, setterOpen: any, setterLoading: any) => {
    if (query.length < 2) {
      setterResults([]);
      setterOpen(false);
      return;
    }
    setterLoading(true);
    try {
      const results = await searchClubsWithFallback(query);
      setterResults(results);
      setterOpen(true);
    } catch (err) {
      console.error("[Search Error]", err);
    } finally {
      setterLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => performSearch(heartSearch, setHeartResults, setHeartOpen, setHeartLoading), 400);
    return () => clearTimeout(timer);
  }, [heartSearch, performSearch]);

  useEffect(() => {
    const timer = setTimeout(
      () => performSearch(sympathySearch, setSympathyResults, setSympathyOpen, setSympathyLoading),
      400,
    );
    return () => clearTimeout(timer);
  }, [sympathySearch, performSearch]);

  const handleConfirmVote = async () => {
    if (!heartClub || !user || !profile) return;
    setSubmitting(true);
    try {
      if (IS_MASTER_ADMIN) {
        await supabase.from("votos").delete().eq("user_id", user.id);
      }
      const allVotes = [{ club: heartClub, main: true }, ...sympathyClubs.map((c) => ({ club: c, main: false }))];
      const votesToInsert = allVotes.map((v) => ({
        user_id: user.id,
        clube_nome: v.club.name,
        cidade: profile.cidade || "",
        estado: profile.estado || "",
        pais: profile.pais || "BR",
        is_original_vote: v.main,
        fingerprint: fingerprint || "web-client",
      }));

      const { error } = await supabase.from("votos").insert(votesToInsert);
      if (error) throw error;

      await refreshProfile();
      toast({ title: "Voto registrado com sucesso! 🏟️" });
      navigate("/dashboard");
    } catch (err) {
      toast({ variant: "destructive", title: "Erro ao votar" });
    } finally {
      setSubmitting(false);
      setShowConfirm(false);
    }
  };

  const ClubDropdown = ({ results, open, loading, onSelect }: any) => {
    if (!open) return null;
    return (
      <div className="absolute top-full left-0 right-0 z-[1000] mt-2 rounded-2xl border border-white/10 max-h-[350px] overflow-y-auto bg-[#1A1A1A] shadow-2xl backdrop-blur-xl">
        {loading ? (
          <div className="p-6 flex justify-center">
            <Loader2 className="animate-spin text-primary" />
          </div>
        ) : (
          <>
            {results.map((club: ClubResult, i: number) => (
              <button
                key={i}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(club);
                }}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/5 border-b border-white/5 last:border-0 text-left transition-all group"
              >
                <ClubLogo src={club.logo} alt={club.name} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-black italic text-base uppercase truncate tracking-tighter group-hover:text-primary">
                    {club.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">
                    {club.location || `${club.city}, ${club.country}`}
                  </p>
                </div>
                <div className="text-[8px] font-black px-2 py-1 bg-primary/10 text-primary rounded uppercase italic">
                  {club.source}
                </div>
              </button>
            ))}
            <button
              className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-muted/10 hover:bg-muted/20 text-[10px] font-black text-primary italic uppercase"
              onClick={() => setShowManualDialog(true)}
            >
              <PlusCircle size={14} /> Clube não listado? Adicionar Manual
            </button>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-6">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-3">
          <img src={logo} alt="Logo" className="mx-auto w-20 h-20" />
          <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white">Voto Sagrado</h1>
          {IS_MASTER_ADMIN && (
            <p className="text-[10px] text-primary font-black uppercase flex items-center gap-1 justify-center">
              <ShieldCheck size={12} /> Master Mode
            </p>
          )}
        </div>

        <div className="space-y-2 relative">
          <label className="text-xs font-black uppercase opacity-60 italic flex items-center gap-2">
            <Heart size={14} className="text-primary" /> Clube do Coração
          </label>
          {heartClub ? (
            <div className="flex items-center gap-3 glass-card rounded-xl p-4 border-2 border-primary animate-in zoom-in duration-300">
              <ClubLogo src={heartClub.logo} alt={heartClub.name} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-black italic text-lg uppercase truncate tracking-tighter">{heartClub.name}</p>
                <p className="text-[10px] text-muted-foreground uppercase">{heartClub.location}</p>
              </div>
              <button
                onClick={() => setHeartClub(null)}
                className="p-2 opacity-40 hover:opacity-100 transition-opacity"
              >
                <X size={20} />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary opacity-50" />
              <Input
                className="pl-10 h-14 rounded-xl bg-card border-white/5"
                placeholder="Pesquisar seu clube..."
                value={heartSearch}
                onChange={(e) => setHeartSearch(e.target.value)}
                onFocus={() => setHeartOpen(true)}
                onBlur={() => setTimeout(() => setHeartOpen(false), 200)}
              />
              <ClubDropdown results={heartResults} open={heartOpen} loading={heartLoading} onSelect={setHeartClub} />
            </div>
          )}
        </div>

        <div className="space-y-3">
          <label className="text-xs font-black uppercase italic flex items-center gap-2 opacity-60">
            <Sparkles size={14} className="text-primary" /> Simpatias ({sympathyClubs.length}/{MAX_SYMPATHY_CLUBS})
          </label>
          <div className="grid grid-cols-1 gap-2">
            {sympathyClubs.map((club, idx) => (
              <div key={idx} className="flex items-center gap-3 glass-card rounded-xl p-3 border border-white/5">
                <ClubLogo src={club.logo} alt={club.name} size="sm" />
                <p className="flex-1 text-sm font-bold italic truncate uppercase">{club.name}</p>
                <button onClick={() => setSympathyClubs((p) => p.filter((_, i) => i !== idx))}>
                  <X size={14} />
                </button>
              </div>
            ))}
            {sympathyClubs.length < MAX_SYMPATHY_CLUBS && (
              <div className="relative">
                <Input
                  className="pl-4 h-12 rounded-xl bg-card border-white/5"
                  placeholder="Adicionar simpatia..."
                  value={sympathySearch}
                  onChange={(e) => setSympathySearch(e.target.value)}
                  onFocus={() => setSympathyOpen(true)}
                  onBlur={() => setTimeout(() => setSympathyOpen(false), 200)}
                />
                <ClubDropdown
                  results={sympathyResults}
                  open={sympathyOpen}
                  loading={sympathyLoading}
                  onSelect={(c: any) => {
                    if (!sympathyClubs.find((x) => x.name === c.name)) setSympathyClubs((p) => [...p, c]);
                    setSympathySearch("");
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <Button
          className="w-full h-16 font-black italic text-xl btn-orange-gradient rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-95"
          disabled={!heartClub || submitting}
          onClick={() => setShowConfirm(true)}
        >
          {submitting ? <Loader2 className="animate-spin" /> : "JURAR LEALDADE"}
        </Button>
      </div>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-sm glass-card border-white/10 text-center">
          <DialogHeader>
            <DialogTitle className="italic text-2xl font-black uppercase tracking-tighter">CONFIRMAR VOTO?</DialogTitle>
          </DialogHeader>
          <p className="text-sm italic opacity-70">
            Você confirma lealdade ao <strong className="text-primary">{heartClub?.name}</strong>?
          </p>
          <DialogFooter className="flex-col gap-2 mt-4">
            <Button
              className="w-full btn-orange-gradient h-12 font-black italic"
              onClick={handleConfirmVote}
              disabled={submitting}
            >
              EU JURO!
            </Button>
            <Button
              variant="ghost"
              className="w-full text-xs opacity-50 font-bold italic"
              onClick={() => setShowConfirm(false)}
            >
              VOLTAR
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
 * Versão: 9.0 (Revisão Total de Estabilidade)
 * Modificações:
 * - Recuperado Master Mode para betoborelli9@gmail.com.
 * - Corrigido Dropdown para z-index 1000 (evita ficar atrás de outros elementos).
 * - Sincronizado src={club.logo} com a resposta da Edge Function.
 * - Mantida lógica de 4 slots de simpatia.
 */
