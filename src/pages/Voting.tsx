/**
 * [CAMINHO]: src/pages/Voting.tsx
 * [STATUS]: PRODUÇÃO - VERSÃO 16.0 (OPTIMIZED SEARCH + SEQUENTIAL SYNC)
 * [CONTEXTO]: Sistema de Votação - Integração de Busca Validada + Investigação IA
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Heart, Loader2, X, Search, Sparkles, ShieldCheck, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { searchClubsWithFallback, persistClubsIfMissing, ClubSearchResult } from "@/lib/search-clubs";
import { ClubLogo } from "@/components/ClubLogo";
import logo from "@/assets/logo.png";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { lookupCep, formatCep, captureGpsAudit } from "@/lib/address";

/* ═══════════════════════════════════════════════════════════
    MÓDULO: CONFIGURAÇÕES E ESTADOS
   ═══════════════════════════════════════════════════════════ */
type ClubResult = ClubSearchResult;
const MAX_SYMPATHY_CLUBS = 4;

const Voting = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, refreshProfile } = useUser();
  const { toast } = useToast();

  const IS_MASTER_ADMIN = user?.email === "betoborelli9@gmail.com";
  // Modo TESTE: master abre /voting?test=1 — fluxo idêntico, mas NÃO grava votos.
  const TEST_MODE = IS_MASTER_ADMIN && searchParams.get("test") === "1";

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
  const [fingerprint, setFingerprint] = useState<string | null>(null);

  // Endereço de Identidade (público, alimenta o mapa coroplético)
  const [cep, setCep] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidadeAddr, setCidadeAddr] = useState("");
  const [estadoAddr, setEstadoAddr] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);

  // Refs para controle de concorrência de busca (Race Conditions)
  const heartReqId = useRef(0);
  const sympathyReqId = useRef(0);

  /* ═══════════════════════════════════════════════════════════
      MÓDULO: SEGURANÇA E FINGERPRINT
     ═══════════════════════════════════════════════════════════ */
  useEffect(() => {
    const initFP = async () => {
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      setFingerprint(result.visitorId);
    };
    initFP();
  }, []);

  /* ═══════════════════════════════════════════════════════════
      MÓDULO: BUSCA OTIMIZADA (LOGICA DEBUG_API)
     ═══════════════════════════════════════════════════════════ */
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
        // Usando a lógica que funcionou na DebugApi: chamada direta ou via helper atualizado
        const results = await searchClubsWithFallback(term);

        // Só aplica o resultado se for a última requisição disparada
        if (currentId === reqRef.current) {
          setterResults(results);
          setterOpen(true);
        }
      } catch (err) {
        console.error("[Search Error]", err);
      } finally {
        if (currentId === reqRef.current) {
          setterLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    const timer = setTimeout(
      () => performSearch(heartSearch, setHeartResults, setHeartOpen, setHeartLoading, heartReqId),
      300,
    ); // Debounce de 300ms conforme DebugApi
    return () => clearTimeout(timer);
  }, [heartSearch, performSearch]);

  useEffect(() => {
    const timer = setTimeout(
      () => performSearch(sympathySearch, setSympathyResults, setSympathyOpen, setSympathyLoading, sympathyReqId),
      300,
    );
    return () => clearTimeout(timer);
  }, [sympathySearch, performSearch]);

  /* ═══════════════════════════════════════════════════════════
      MÓDULO: BUSCA POR CEP (ViaCEP)
     ═══════════════════════════════════════════════════════════ */
  const handleCepLookup = useCallback(async (raw: string) => {
    const formatted = formatCep(raw);
    setCep(formatted);
    setCepError(null);
    const digits = formatted.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const found = await lookupCep(digits);
      if (!found) {
        setCepError("CEP não encontrado.");
        return;
      }
      setBairro(found.bairro);
      setCidadeAddr(found.cidade);
      setEstadoAddr(found.estado);
    } finally {
      setCepLoading(false);
    }
  }, []);

  /* ═══════════════════════════════════════════════════════════
      MÓDULO: PROCESSAMENTO SEQUENCIAL (GARANTIA DE DADOS)
     ═══════════════════════════════════════════════════════════ */
  const handleConfirmVote = async () => {
    if (!heartClub || !user || !profile) return;
    if (!bairro.trim()) {
      toast({ variant: "destructive", title: "Informe seu bairro para registrar o voto." });
      return;
    }
    setSubmitting(true);
    try {
      const allSelected = [{ club: heartClub, main: true }, ...sympathyClubs.map((c) => ({ club: c, main: false }))];

      // Auditoria silenciosa — GPS real do navegador (não bloqueia se falhar)
      const audit = await captureGpsAudit();

      if (!TEST_MODE) {
        if (IS_MASTER_ADMIN) {
          await supabase.from("votos").delete().eq("user_id", user.id);
        }

        const cidadeFinal = cidadeAddr.trim() || profile.cidade || "";
        const estadoFinal = estadoAddr.trim() || profile.estado || "";

        const votesToInsert = allSelected.map((v) => ({
          user_id: user.id,
          clube_nome: v.club.name,
          cidade: cidadeFinal,
          estado: estadoFinal,
          pais: profile.pais || "BR",
          bairro: bairro.trim(),
          cep: cep.replace(/\D/g, "") || null,
          numero: numero.trim() || null,
          complemento: complemento.trim() || null,
          voto_bairro_gps: audit.voto_bairro_gps,
          voto_cidade_gps: audit.voto_cidade_gps,
          voto_lat: audit.lat,
          voto_lng: audit.lng,
          is_original_vote: v.main,
          fingerprint: fingerprint || "web-client",
        }));

        const { error: voteError } = await supabase.from("votos").insert(votesToInsert);
        if (voteError) throw voteError;
      }

      // 1. Salva base técnica no cache (sempre — popula clubes_cache também em modo teste)
      await persistClubsIfMissing(allSelected.map((v) => v.club));

      // 2. INVESTIGAÇÃO SEQUENCIAL: Obrigatório await para garantir Gemini antes do redirecionamento
      for (const item of allSelected) {
        console.log(`[VOTING]: Investigando ${item.club.name}...`);
        try {
          await supabase.functions.invoke("enrich-club-colors", {
            body: {
              club_name: item.club.name,
              api_id: item.club.api_id,
            },
          });
        } catch (e) {
          console.error(`Erro ao enriquecer ${item.club.name}:`, e);
        }
      }

      if (TEST_MODE) {
        toast({ title: "Modo teste — voto não contabilizado 🧪" });
        navigate(`/testar-clube?club=${encodeURIComponent(heartClub.name)}`);
      } else {
        await refreshProfile();
        toast({ title: "Lealdade registada com sucesso! 🏟️" });
        navigate("/dashboard");
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Erro ao processar votos" });
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

  /* ═══════════════════════════════════════════════════════════
      MÓDULO: RENDERIZAÇÃO PRINCIPAL
     ═══════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-6">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-3">
          <img src={logo} alt="Logo" className="mx-auto w-20 h-20" />
          <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white">Voto Sagrado</h1>
          {IS_MASTER_ADMIN && (
            <p className="text-[10px] text-primary font-black uppercase flex items-center gap-1 justify-center">
              <ShieldCheck size={12} /> Master Mode Ativo
            </p>
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

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-md glass-card border-white/10 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="italic text-2xl font-black uppercase tracking-tighter text-center">
              CONFIRMAR VOTO?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm italic opacity-70 text-center">
            Você jura lealdade ao <strong className="text-primary">{heartClub?.name}</strong>?
          </p>

          {/* ENDEREÇO DE IDENTIDADE — alimenta o mapa coroplético */}
          <div className="space-y-3 mt-2 text-left">
            <p className="text-[11px] font-black italic uppercase opacity-70">
              Digite seu CEP → Confirme seu Bairro → Vote
            </p>

            <div className="space-y-1">
              <label className="text-[10px] font-black italic uppercase opacity-60">CEP</label>
              <div className="relative">
                <Input
                  inputMode="numeric"
                  placeholder="00000-000"
                  value={cep}
                  onChange={(e) => handleCepLookup(e.target.value)}
                  className="h-11 font-black italic uppercase bg-card border-white/5"
                  maxLength={9}
                />
                {cepLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
                )}
              </div>
              {cepError && <p className="text-[10px] text-destructive italic">{cepError}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black italic uppercase opacity-60">Bairro *</label>
              <Input
                placeholder="Seu bairro"
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                className="h-11 font-black italic uppercase bg-card border-white/5"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-black italic uppercase opacity-60">Cidade</label>
                <Input
                  value={cidadeAddr}
                  onChange={(e) => setCidadeAddr(e.target.value)}
                  className="h-11 font-bold italic uppercase bg-card border-white/5"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black italic uppercase opacity-60">UF</label>
                <Input
                  value={estadoAddr}
                  onChange={(e) => setEstadoAddr(e.target.value.toUpperCase().slice(0, 2))}
                  className="h-11 font-black italic uppercase bg-card border-white/5"
                  maxLength={2}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-black italic uppercase opacity-60">Número</label>
                <Input
                  inputMode="numeric"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  className="h-11 font-bold italic uppercase bg-card border-white/5"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black italic uppercase opacity-60">Complemento</label>
                <Input
                  placeholder="Apto / Bloco"
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                  className="h-11 font-bold italic uppercase bg-card border-white/5"
                />
              </div>
            </div>

            <p className="text-[9px] italic opacity-40 leading-relaxed">
              🔒 Seu endereço completo nunca é exibido publicamente. Apenas o bairro alimenta o mapa de calor.
            </p>
          </div>

          <DialogFooter className="flex-col gap-2 mt-4">
            <Button
              className="w-full btn-orange-gradient h-12 font-black italic"
              onClick={handleConfirmVote}
              disabled={submitting || !bairro.trim()}
            >
              {submitting ? "PROCESSANDO..." : "EU JURO!"}
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
 * Versão: 16.0
 * - Implementado controle de concorrência com heartReqId/sympathyReqId (padrão DebugApi).
 * - Ajustado debounce de busca para 300ms e mínimo de 3 caracteres.
 * - Mantida a lógica de loop sequencial com await para enriquecimento de dados.
 * - Sincronizado status IS_MASTER_ADMIN para o email betoborelli9@gmail.com.
 */
