/**
 * [CAMINHO]: src/pages/Voting.tsx
 * [CONTEXTO]: Votação + Identidade integrada (PASSO 1) + Captura técnica invisível.
 * [VERSÃO]: 32.0 (RITO "JURO LEALDADE" + Device/IP/Geo gravados em profiles)
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Heart, Loader2, X, Search, Sparkles, ShieldCheck, User as UserIcon, Cake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { searchClubsWithFallback, persistClubsIfMissing, isValidClubName, ClubSearchResult } from "@/lib/search-clubs";
import { ClubLogo } from "@/components/ClubLogo";
import logo from "@/assets/logo.png";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { getFingerprint, getFastIP, runSilentAudit } from "@/lib/vote-auditor";
import { detectDeviceModel } from "@/lib/device-detect";

type ClubResult = ClubSearchResult;
const MAX_SYMPATHY_CLUBS = 4;

// Captura geolocalização do browser (silenciosa, com timeout curto).
const getBrowserGeo = (): Promise<{ lat: number; lng: number } | null> =>
  new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    const timeoutId = setTimeout(() => resolve(null), 4000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timeoutId);
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        clearTimeout(timeoutId);
        resolve(null);
      },
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 60000 },
    );
  });

const Voting = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, hasVoted, isLoading, isAuthReady, isAuthenticated, refreshProfile, updateProfile } = useUser();
  const { toast } = useToast();

  const IS_MASTER_ADMIN = user?.email === "betoborelli9@gmail.com";
  const TEST_MODE = IS_MASTER_ADMIN && searchParams.get("test") === "1";

  // [BLOQUEIO] Torcedor comum só vota uma vez. Master nunca trava.
  useEffect(() => {
    if (!isAuthReady || isLoading) return;
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
      return;
    }
    if (hasVoted && !IS_MASTER_ADMIN) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthReady, isLoading, isAuthenticated, hasVoted, IS_MASTER_ADMIN, navigate]);

  // [IDENTIDADE - PASSO 1] Mostrada se perfil incompleto OU se master admin (sem trava p/ testes).
  const needsIdentity =
    IS_MASTER_ADMIN ||
    !profile?.nome_exibicao ||
    !profile?.data_nascimento ||
    !profile?.genero;

  const [nickname, setNickname] = useState("");
  const [genero, setGenero] = useState("");
  const [anoNasc, setAnoNasc] = useState("");

  useEffect(() => {
    if (profile?.nome_exibicao) setNickname(profile.nome_exibicao);
    else if (user?.user_metadata?.full_name) setNickname(user.user_metadata.full_name);
    if (profile?.genero) setGenero(profile.genero);
    if (profile?.data_nascimento) setAnoNasc(profile.data_nascimento.split("-")[0] || "");
  }, [profile, user]);

  const ANO_ATUAL = new Date().getFullYear();
  const ANOS = Array.from({ length: ANO_ATUAL - 1920 + 1 }, (_, i) => String(ANO_ATUAL - i));

  // [ESTADOS] Busca e Seleção
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
  const [submitting, setSubmitting] = useState(false);

  const heartReqId = useRef(0);
  const sympathyReqId = useRef(0);

  // [LÓGICA] Busca com Debounce Manual
  const performSearch = useCallback(
    async (
      query: string,
      setterResults: any,
      setterOpen: any,
      setterLoading: any,
      reqRef: React.MutableRefObject<number>,
    ) => {
      const term = query.trim();
      if (term.length < 3) {
        setterResults([]);
        setterOpen(false);
        return;
      }
      const currentId = ++reqRef.current;
      setterLoading(true);
      try {
        const results = await searchClubsWithFallback(term);
        if (currentId === reqRef.current) {
          setterResults(results);
          setterOpen(true);
        }
      } catch (err) {
        console.error("[Search Error]", err);
      } finally {
        if (currentId === reqRef.current) setterLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const timer = setTimeout(
      () => performSearch(heartSearch, setHeartResults, setHeartOpen, setHeartLoading, heartReqId),
      300,
    );
    return () => clearTimeout(timer);
  }, [heartSearch, performSearch]);

  useEffect(() => {
    const timer = setTimeout(
      () => performSearch(sympathySearch, setSympathyResults, setSympathyOpen, setSympathyLoading, sympathyReqId),
      300,
    );
    return () => clearTimeout(timer);
  }, [sympathySearch, performSearch]);

  // [AÇÃO] Processamento do Voto Sagrado + Identidade + Captura Técnica
  const handleConfirmVote = async () => {
    if (!heartClub || !user) return;

    if (!isValidClubName(heartClub.name)) {
      toast({ variant: "destructive", title: "Clube inválido", description: "Selecione um clube real da lista." });
      return;
    }

    if (needsIdentity) {
      if (!nickname.trim() || !genero || !anoNasc) {
        toast({
          variant: "destructive",
          title: "Complete sua identidade",
          description: "Nome, sexo e ano de nascimento são obrigatórios.",
        });
        return;
      }
    }

    setSubmitting(true);
    try {
      if (TEST_MODE) {
        navigate(`/testar-clube?club=${encodeURIComponent(heartClub.name)}`);
        return;
      }

      if (IS_MASTER_ADMIN) {
        await supabase.from("votos").delete().eq("user_id", user.id);
      }

      // [CAPTURA TÉCNICA INVISÍVEL] device + IP + geo + fingerprint
      const [ip, fp, deviceModel, geo] = await Promise.all([
        getFastIP(),
        getFingerprint(),
        detectDeviceModel().catch(() => "Desconhecido"),
        getBrowserGeo(),
      ]);

      // [IDENTIDADE] grava em profiles antes do voto
      if (needsIdentity) {
        await updateProfile({
          nome_exibicao: nickname.trim(),
          data_nascimento: `${anoNasc}-01-01`,
          genero,
          device_hardware: deviceModel,
          latitude: geo?.lat ?? null,
          longitude: geo?.lng ?? null,
        });
      } else {
        await updateProfile({
          device_hardware: deviceModel,
          latitude: geo?.lat ?? null,
          longitude: geo?.lng ?? null,
        });
      }

      const mainVote: any = {
        user_id: user.id,
        email: user.email,
        clube_nome: heartClub.name,
        cidade: profile?.cidade || "",
        estado: profile?.estado || "",
        pais: profile?.pais || "BR",
        cep: profile?.cep || null,
        ip_address: ip,
        fingerprint: fp,
        device_model: deviceModel,
        voto_lat: geo?.lat ?? null,
        voto_lng: geo?.lng ?? null,
        is_original_vote: true,
        status_aprovacao: "aprovado",
        is_suspicious: false,
        sympathy_1: sympathyClubs[0]?.name || null,
        sympathy_2: sympathyClubs[1]?.name || null,
        sympathy_3: sympathyClubs[2]?.name || null,
        sympathy_4: sympathyClubs[3]?.name || null,
      };

      const { data: newVote, error: voteError } = await supabase.from("votos").insert([mainVote]).select("id").single();

      if (voteError) throw voteError;

      runSilentAudit(supabase, newVote.id, heartClub.name, ip, fp);

      const selectedToSave: ClubSearchResult[] = [heartClub, ...sympathyClubs].filter(
        (club): club is ClubSearchResult => !!club?.name && club.source === "api",
      );
      const finalClubsToPersist = selectedToSave.filter(
        (club, index, self) => index === self.findIndex((c) => c.name === club.name),
      );
      if (finalClubsToPersist.length > 0) {
        await persistClubsIfMissing(finalClubsToPersist);
      }

      await refreshProfile().catch(() => {});

      // [TRAVA DEFINITIVA] hasVoted=true → Dashboard
      toast({ title: "Lealdade registrada com sucesso! 🏟️" });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error("[VOTING] erro:", err);
      toast({ variant: "destructive", title: "Erro ao processar votos" });
    } finally {
      setSubmitting(false);
      setShowConfirm(false);
    }
  };

  // [COMPONENTE] Dropdown de Resultados
  const ClubDropdown = ({ results, open, loading, onSelect }: any) => {
    if (!open) return null;
    return (
      <div className="absolute top-full left-0 right-0 z-[1000] mt-2 rounded-2xl border border-white/10 max-h-[350px] overflow-y-auto bg-[#1A1A1A] shadow-2xl backdrop-blur-xl">
        {loading ? (
          <div className="p-6 flex justify-center">
            <Loader2 className="animate-spin text-primary" />
          </div>
        ) : (
          results.map((club: ClubResult, i: number) => (
            <button
              key={i}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(club);
              }}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/5 border-b border-white/5 last:border-0 text-left group transition-colors"
            >
              <ClubLogo src={club.logo} alt={club.name} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-black italic text-base uppercase truncate group-hover:text-primary transition-colors">
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
          ))
        )}
      </div>
    );
  };

  if (!isAuthReady || isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-6">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-3">
          <img src={logo} alt="Logo" className="mx-auto w-20 h-20" />
          <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white">Voto Sagrado</h1>
          {IS_MASTER_ADMIN && (
            <div className="flex flex-col gap-1 items-center">
              <p className="text-[10px] text-primary font-black uppercase flex items-center gap-1">
                <ShieldCheck size={12} /> Master Mode Ativo
              </p>
              {TEST_MODE && (
                <span className="text-[8px] bg-red-500 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">
                  LINK DE VOTAÇÃO (TESTE) ATIVO
                </span>
              )}
            </div>
          )}
        </div>

        {/* CLUBE DO CORAÇÃO */}
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

        {/* SIMPATIAS */}
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

      {/* MODAL DE CONFIRMAÇÃO */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-sm glass-card border-white/10">
          <DialogHeader>
            <DialogTitle className="italic text-2xl font-black uppercase tracking-tighter text-center">
              CONFIRMAR VOTO?
            </DialogTitle>
          </DialogHeader>
          <p className="text-base italic opacity-80 text-center px-2">
            Você jura lealdade ao <strong className="text-primary not-italic uppercase">{heartClub?.name}</strong>?
          </p>
          <DialogFooter className="flex-col gap-2 mt-2">
            <Button
              className="w-full btn-orange-gradient h-14 font-black italic text-lg uppercase"
              onClick={handleConfirmVote}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="animate-spin" /> : "SIM, EU JURO!"}
            </Button>
            <Button
              variant="ghost"
              className="w-full text-xs opacity-50 font-bold italic"
              onClick={() => setShowConfirm(false)}
              disabled={submitting}
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
 * ARQUIVO: src/pages/Voting.tsx
 * VERSÃO: 31.0 (ESTÁVEL)
 */
