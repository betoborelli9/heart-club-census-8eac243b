/**
 * [CAMINHO]: src/pages/Admin/ClubColors.tsx
 * [MÓDULO]: MASTER ADMIN — Bancada de Cores dos Clubes
 * [STATUS]: PRODUÇÃO — v5.0 Google Search + Gemini via Edge Function
 * [VERSÃO]: 5.0.0
 */

/* ═══════════════════════════════════════════════════════════
   IMPORTS
═══════════════════════════════════════════════════════════ */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle2, Database, Loader2, Search, Shield, Sparkles, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClubLogo } from "@/components/ClubLogo";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { searchClubsWithFallback, type ClubSearchResult } from "@/lib/search-clubs";
import { toast } from "sonner";

/* ═══════════════════════════════════════════════════════════
   TIPOS / CONSTANTES
═══════════════════════════════════════════════════════════ */
const MASTER_EMAIL = "betoborelli9@gmail.com";
const apiKey = "";

type ClubIdentity = {
  nome_confirmado: string;
  cor_primaria: string;
  cor_secundaria: string;
  cor_terciaria: string | null;
  cor_quarta: string | null;
  mascote: string;
  tem_feminino: boolean;
  division: string;
  estrutura: "BICOLOR" | "TRICOLOR" | "QUADRICOLOR";
  cores: string[];
};

const emptyColumns = [0, 1, 2, 3];

/* ═══════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
═══════════════════════════════════════════════════════════ */
const ClubColors = () => {
  const navigate = useNavigate();
  const { user, isLoading: userLoading } = useUser();

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<ClubSearchResult[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [selectedClub, setSelectedClub] = useState<ClubSearchResult | null>(null);
  const [investigating, setInvestigating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<ClubIdentity | null>(null);

  const visibleColors = useMemo(() => result?.cores?.slice(0, 4) || [], [result]);

  /* ═══════════════════════════════════════════════════════════
     ACESSO MASTER ADMIN
  ═══════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!userLoading && (!user || user.email !== MASTER_EMAIL)) {
      navigate("/", { replace: true });
    }
  }, [navigate, user, userLoading]);

  /* ═══════════════════════════════════════════════════════════
     AUTOCOMPLETE — API FOOTBALL A PARTIR DE 3 LETRAS
  ═══════════════════════════════════════════════════════════ */
  useEffect(() => {
    const term = query.trim();
    if (term.length < 3) {
      setSuggestions([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const clubs = await searchClubsWithFallback(term, 10);
        setSuggestions(clubs);
      } catch (error) {
        console.error("[ClubColors autocomplete]", error);
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [query]);

  /* ═══════════════════════════════════════════════════════════
     INVESTIGAÇÃO — GOOGLE SEARCH + GEMINI NO EDGE
  ═══════════════════════════════════════════════════════════ */
  const investigateClub = async (club: ClubSearchResult) => {
    setSelectedClub(club);
    setQuery(club.name);
    setSuggestions([]);
    setResult(null);
    setInvestigating(true);

    try {
      const { data, error } = await supabase.functions.invoke<ClubIdentity>("investigate-club-colors", {
        body: { clubName: club.name, apiKey },
      });

      if (error) throw new Error(error.message || "Falha na investigação");
      if (!data?.cores?.length) throw new Error("IA não retornou cores válidas");

      setResult(data);
      toast.success("Dados investigados com Google + IA");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      console.error("[ClubColors investigate]", message);
      toast.error(message);
    } finally {
      setInvestigating(false);
    }
  };

  /* ═══════════════════════════════════════════════════════════
     PERSISTÊNCIA — CLUBES_CACHE
  ═══════════════════════════════════════════════════════════ */
  const saveToCache = async () => {
    if (!result || !selectedClub) return;
    setSaving(true);

    try {
      const payload = {
        nome: result.nome_confirmado,
        nome_curto: selectedClub.shortName || result.nome_confirmado,
        cidade: selectedClub.city || "Desconhecida",
        pais: selectedClub.country || "Brasil",
        escudo_url: selectedClub.logo || null,
        api_id: selectedClub.api_id ? String(selectedClub.api_id) : null,
        cor_primaria: result.cor_primaria,
        cor_secundaria: result.cor_secundaria,
        cor_terciaria: result.cor_terciaria,
        cor_quarta: result.cor_quarta,
        mascote: result.mascote,
        tem_feminino: result.tem_feminino,
        feminino: result.tem_feminino,
        division: result.division,
      };

      const { error } = await supabase.from("clubes_cache").upsert(payload, { onConflict: "nome" });
      if (error) throw error;

      toast.success("Salvo no clubes_cache");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao salvar";
      console.error("[ClubColors save]", message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  /* ═══════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════ */
  return (
    <main className="min-h-screen bg-background text-foreground px-4 py-6 md:px-10 md:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase italic tracking-[0.28em] text-primary">Master Admin</p>
            <h1 className="mt-2 text-3xl font-black uppercase italic leading-none md:text-5xl">Bancada de Cores</h1>
          </div>
          <Button variant="outline" onClick={() => navigate("/dashboard")} className="w-fit gap-2 font-black italic">
            <ArrowLeft size={16} /> Voltar
          </Button>
        </header>

        <section className="relative z-20">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-primary" size={22} />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Digite 3 letras para buscar na API Football..."
              className="h-14 rounded-lg border-border bg-card pl-12 pr-12 text-base font-black italic uppercase"
            />
            {loadingSuggestions && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-primary" size={20} />
            )}
          </div>

          <AnimatePresence>
            {suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute mt-2 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-2xl"
              >
                {suggestions.map((club) => (
                  <button
                    key={`${club.source}-${club.id}-${club.name}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => investigateClub(club)}
                    className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted"
                  >
                    <ClubLogo src={club.logo} alt={club.name} className="h-10 w-10 shrink-0 object-contain" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black uppercase italic">{club.name}</p>
                      <p className="truncate text-xs font-bold text-muted-foreground">{club.location || club.country}</p>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <section className="grid min-h-[360px] place-items-center rounded-lg border border-border bg-card p-4 md:p-8">
          {investigating ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <Sparkles className="animate-pulse text-primary" size={48} />
              <div>
                <p className="text-2xl font-black uppercase italic">Consultando Google</p>
                <p className="text-sm font-bold text-muted-foreground">Cores, feminino e competição principal do clube.</p>
              </div>
            </div>
          ) : result ? (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <div className="grid h-20 w-20 place-items-center rounded-full bg-background p-3 shadow-xl">
                    <ClubLogo src={selectedClub?.logo || ""} alt={result.nome_confirmado} className="h-full w-full object-contain" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black uppercase italic leading-none md:text-4xl">{result.nome_confirmado}</h2>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-black uppercase italic">
                      <span className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-muted-foreground">
                        <Shield size={13} /> {result.mascote}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-muted-foreground">
                        <Users size={13} /> Feminino: {result.tem_feminino ? "SIM" : "NÃO"}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-primary">
                        <CheckCircle2 size={13} /> {result.division}
                      </span>
                    </div>
                  </div>
                </div>
                <Button onClick={saveToCache} disabled={saving} className="gap-2 font-black uppercase italic">
                  {saving ? <Loader2 className="animate-spin" size={16} /> : <Database size={16} />}
                  Salvar no Cache
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {emptyColumns.map((column) => {
                  const color = visibleColors[column];
                  return (
                    <div key={column} className="space-y-3 text-center">
                      <div
                        className="grid aspect-square place-items-center rounded-lg border border-border shadow-inner"
                        style={{ backgroundColor: color || "hsl(var(--muted))" }}
                      >
                        {!color && <X className="text-muted-foreground" size={42} />}
                      </div>
                      <div
                        className="mx-auto grid h-12 w-full max-w-36 place-items-center rounded-md border border-border text-xs font-black uppercase italic"
                        style={{ backgroundColor: color || "hsl(var(--muted))" }}
                      >
                        <span className="rounded bg-background/80 px-2 py-1 text-foreground">{color || "X"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-center text-xs font-black uppercase italic tracking-[0.24em] text-muted-foreground">
                {result.estrutura} • {visibleColors.length} cores oficiais retornadas
              </p>
            </motion.div>
          ) : (
            <div className="text-center text-muted-foreground">
              <Search className="mx-auto mb-4 opacity-40" size={44} />
              <p className="font-black uppercase italic">Busque um clube para investigar</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default ClubColors;

/**
 * [RODAPÉ TÉCNICO]
 * v5.0.0 — Página independente de Master Admin.
 * - Autocomplete usa searchClubsWithFallback/API Football a partir de 3 letras.
 * - Front não consulta Gemini diretamente; chama a Edge Function investigate-club-colors.
 * - Renderiza 4 colunas dinâmicas: bicolor ocupa 2, tricolor 3 e quadricolor 4.
 * - Persiste cor_primaria, cor_secundaria, cor_terciaria, cor_quarta, mascote, tem_feminino e division em clubes_cache.
 */