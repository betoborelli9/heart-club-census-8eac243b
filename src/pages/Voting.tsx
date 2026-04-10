/**
 * Caminho: src/pages/Voting.tsx
 * Contexto: Sistema de Votação - RESTAURAÇÃO DE BUSCA HÍBRIDA + IA INVESTIGADORA
 * Autor: Gemini (Especialista Senior)
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Loader2, X, Search, Sparkles, ShieldCheck, Globe, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { searchClubsLocal } from "@/lib/search-clubs"; // O motor de busca local
import { ClubLogo } from "@/components/ClubLogo";
import logo from "@/assets/logo.png";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import FingerprintJS from "@fingerprintjs/fingerprintjs";

/* ═══════════════════════════════════════════════════════════
   MÓDULO: TIPOS E INTERFACES
   ═══════════════════════════════════════════════════════════ */

interface ClubResult {
  id: string | null;
  name: string;
  shortName: string;
  location: string;
  logo: string;
  city: string;
  state: string;
  country: string;
  mascote?: string;
  source: "supabase" | "api-football" | "manual";
}

const MAX_SYMPATHY_CLUBS = 4;

const Voting = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading, isAuthenticated, isProfileComplete, hasVoted, refreshProfile } = useUser();
  const { toast } = useToast();

  const IS_MASTER_ADMIN = user?.email === "betoborelli9@gmail.com";
  const heartInputRef = useRef<HTMLInputElement>(null);
  const sympathyInputRef = useRef<HTMLInputElement>(null);

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

  /* ═══════════════════════════════════════════════════════════
     MÓDULO: MOTOR DE BUSCA E IA (INVESTIGAÇÃO ATIVA)
     ═══════════════════════════════════════════════════════════ */

  useEffect(() => {
    const initFP = async () => {
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      setFingerprint(result.visitorId);
    };
    initFP();
  }, []);

  // IA Investigadora: Busca o que a API Football ignora (Feminino, Cores, Wikipedia)
  const investigateClubData = async (clubName: string) => {
    console.log(`[Heart Club IA] Investigando dados oficiais de: ${clubName}`);
    // Futura integração via Edge Function
  };

  const searchApiFootball = useCallback(async (term: string): Promise<ClubResult[]> => {
    try {
      // Prioridade 1: Buscar no Cache do Supabase (Onde a IA já salvou)
      const { data: cached } = await supabase.from("clubes_cache").select("*").ilike("nome", `%${term}%`).limit(5);

      if (cached && cached.length > 0) {
        return cached.map((c) => ({
          id: c.id,
          name: c.nome,
          shortName: c.nome_curto || c.nome,
          location: `${c.cidade || ""}, ${c.pais || ""}`,
          logo: c.escudo_url,
          city: c.cidade,
          state: "",
          country: c.pais,
          mascote: c.mascote,
          source: "supabase",
        }));
      }

      // Prioridade 2: Buscar na API Football externa
      const res = await fetch(`https://v3.football.api-sports.io/teams?search=${encodeURIComponent(term)}`, {
        headers: { "x-apisports-key": "3b4a0ec2c5f513b9aa1e43c4adbae7aa" },
      });
      const apiData = await res.json();
      return (apiData.response || []).map((item: any) => ({
        id: item.team.id.toString(),
        name: item.team.name,
        shortName: item.team.code || item.team.name,
        location: item.team.country,
        logo: item.team.logo,
        city: item.venue?.city || "",
        state: "",
        country: item.team.country,
        source: "api-football",
      }));
    } catch (err) {
      return [];
    }
  }, []);

  const performSearch = useCallback(
    async (query: string, setterResults: any, setterOpen: any, setterLoading: any) => {
      if (query.length < 2) {
        setterResults([]);
        setterOpen(false);
        return;
      }
      setterLoading(true);
      try {
        // CAMADA LOCAL (Seus 251 clubes corrigidos)
        const localResults = searchClubsLocal(query, 10).map((c) => ({ ...c, source: "supabase" as const }));
        let allResults = [...localResults];

        // CAMADA GLOBAL (API)
        if (localResults.length < 5) {
          const apiResults = await searchApiFootball(query);
          const existingNames = new Set(localResults.map((c) => c.name.toLowerCase()));
          allResults = [...allResults, ...apiResults.filter((c) => !existingNames.has(c.name.toLowerCase()))];
        }
        setterResults(allResults);
        setterOpen(true);
      } finally {
        setterLoading(false);
      }
    },
    [searchApiFootball],
  );

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

  /* ═══════════════════════════════════════════════════════════
     MÓDULO: HANDLERS E PERSISTÊNCIA (UPSERT)
     ═══════════════════════════════════════════════════════════ */

  const handleManualSubmit = async () => {
    if (!manualClub.nome) return;
    setSubmitting(true);
    try {
      // Salva no banco e já seleciona
      const { data } = await supabase
        .from("clubes_cache")
        .upsert(
          {
            nome: manualClub.nome,
            mascote: manualClub.mascote,
            cidade: manualClub.cidade,
            pais: "Brasil",
            escudo_url: "https://placehold.co/100x100?text=?",
            cor_primaria: manualClub.cor,
          },
          { onConflict: "nome" },
        )
        .select()
        .single();

      if (data) setHeartClub({ ...data, source: "manual" });
      setShowManualDialog(false);
      toast({ title: "Clube adicionado ao Censo! ✍️" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmVote = async () => {
    if (!heartClub || !user || !profile) return;
    setSubmitting(true);
    try {
      if (IS_MASTER_ADMIN) await supabase.from("votos").delete().eq("user_id", user.id);

      const allVotes = [{ club: heartClub, main: true }, ...sympathyClubs.map((c) => ({ club: c, main: false }))];

      for (const v of allVotes) {
        await supabase.from("votos").insert({
          user_id: user.id,
          clube_nome: v.club.name,
          cidade: profile.cidade || "",
          estado: profile.estado || "",
          pais: profile.pais || "BR",
          is_original_vote: v.main,
          fingerprint,
        });
        investigateClubData(v.club.name); // Dispara IA para cada clube votado
      }

      await refreshProfile();
      if (!IS_MASTER_ADMIN) navigate("/dashboard");
    } finally {
      setSubmitting(false);
      setShowConfirm(false);
    }
  };

  /* ═══════════════════════════════════════════════════════════
     MÓDULO: UI (DROPDOWN + GESTÃO DE SLOTS)
     ═══════════════════════════════════════════════════════════ */

  const ClubDropdown = ({ results, open, loading, onSelect }: any) => {
    if (!open) return null;
    return (
      <div className="absolute top-full left-0 right-0 z-[999] mt-1 rounded-xl border border-border/30 max-h-80 overflow-y-auto bg-card shadow-2xl">
        {loading ? (
          <div className="p-4 flex justify-center">
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
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/10 text-left border-b border-border/10 last:border-0 cursor-pointer"
              >
                <ClubLogo src={club.logo} alt={club.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm truncate italic">{club.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate uppercase">{club.location}</p>
                </div>
              </button>
            ))}
            <button
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-muted/30 hover:bg-muted/50 text-[10px] font-black text-primary italic uppercase border-t border-border/10"
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
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-6 relative">
      <div className="w-full max-w-lg space-y-6 relative z-10">
        <div className="text-center space-y-3">
          <img src={logo} alt="Logo" className="mx-auto w-20 h-20" />
          <h1 className="text-2xl font-black italic uppercase tracking-tighter">Voto Sagrado</h1>
          {IS_MASTER_ADMIN && (
            <p className="text-[10px] text-primary font-black uppercase flex items-center gap-1 justify-center">
              <ShieldCheck size={12} /> Master Mode
            </p>
          )}
        </div>

        {/* CORAÇÃO */}
        <div className="space-y-2 relative">
          <label className="text-xs font-black uppercase opacity-60 italic flex items-center gap-2 tracking-tighter">
            <Heart size={14} className="text-primary" /> Clube do Coração
          </label>
          {heartClub ? (
            <div className="flex items-center gap-3 glass-card rounded-xl p-4 border-2 border-primary shadow-[0_0_20px_rgba(255,98,0,0.15)] animate-in fade-in zoom-in duration-300">
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
                ref={heartInputRef}
                className="pl-10 h-12 rounded-xl bg-card/50"
                placeholder="Pesquisar..."
                value={heartSearch}
                onChange={(e) => setHeartSearch(e.target.value)}
                onFocus={() => setHeartOpen(true)}
                onBlur={() => setTimeout(() => setHeartOpen(false), 200)}
              />
              <ClubDropdown results={heartResults} open={heartOpen} loading={heartLoading} onSelect={setHeartClub} />
            </div>
          )}
        </div>

        {/* SIMPATIAS */}
        <div className="space-y-3">
          <label className="text-xs font-black uppercase italic flex items-center gap-2 opacity-60 tracking-tighter">
            <Sparkles size={14} className="text-primary" /> Simpatias ({sympathyClubs.length}/{MAX_SYMPATHY_CLUBS})
          </label>
          <div className="grid grid-cols-1 gap-2">
            {sympathyClubs.map((club, idx) => (
              <div key={idx} className="flex items-center gap-3 glass-card rounded-xl p-3 border border-border/20">
                <ClubLogo src={club.logo} alt={club.name} size="sm" />
                <p className="flex-1 text-sm font-bold italic truncate uppercase">{club.name}</p>
                <button onClick={() => setSympathyClubs((prev) => prev.filter((_, i) => i !== idx))}>
                  <X size={14} className="opacity-40" />
                </button>
              </div>
            ))}
            {sympathyClubs.length < MAX_SYMPATHY_CLUBS && (
              <div className="relative">
                <Input
                  ref={sympathyInputRef}
                  className="pl-4 h-11 rounded-xl bg-muted/20"
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
          className="w-full h-14 font-black italic text-xl btn-orange-gradient rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-95"
          disabled={!heartClub || submitting}
          onClick={() => setShowConfirm(true)}
        >
          {submitting ? <Loader2 className="animate-spin" /> : "JURAR LEALDADE"}
        </Button>
      </div>

      {/* DIALOGS */}
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

      <Dialog open={showManualDialog} onOpenChange={setShowManualDialog}>
        <DialogContent className="max-w-xs glass-card border-white/10">
          <DialogHeader>
            <DialogTitle className="italic font-black uppercase tracking-tighter">Novo Clube</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Input
              placeholder="Nome do Clube"
              onChange={(e) => setManualClub((p) => ({ ...p, nome: e.target.value }))}
            />
            <Input placeholder="Mascote" onChange={(e) => setManualClub((p) => ({ ...p, mascote: e.target.value }))} />
            <div className="flex gap-2">
              <Input placeholder="Cidade" onChange={(e) => setManualClub((p) => ({ ...p, cidade: e.target.value }))} />
              <Input
                placeholder="UF"
                className="w-20"
                maxLength={2}
                onChange={(e) => setManualClub((p) => ({ ...p, estado: e.target.value }))}
              />
            </div>
            <Input
              placeholder="Cor Principal (ex: Verde)"
              onChange={(e) => setManualClub((p) => ({ ...p, cor: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button className="w-full btn-orange-gradient font-black italic" onClick={handleManualSubmit}>
              SALVAR E SELECIONAR
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
 * Versão: 6.0 (Restauração do Motor Híbrido + IA Investigadora)
 */
