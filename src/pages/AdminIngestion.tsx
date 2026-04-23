/**
 * [CAMINHO]: src/pages/AdminIngestion.tsx
 * [CONTEXTO]: Painel administrativo de ingestão de clubes via API-Football + IA Historiadora.
 * [REGRA]: Acesso restrito ao Master Admin (betoborelli9@gmail.com). Não altera o fluxo de votação.
 */

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Search, Database, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { searchClubsWithFallback, ClubSearchResult } from "@/lib/search-clubs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const SLOTS = 5;

type SlotState = {
  query: string;
  results: ClubSearchResult[];
  open: boolean;
  loading: boolean;
  selected: ClubSearchResult | null;
  status: "idle" | "processing" | "done" | "error";
  message?: string;
};

const emptySlot = (): SlotState => ({
  query: "",
  results: [],
  open: false,
  loading: false,
  selected: null,
  status: "idle",
});

const AdminIngestion = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useUser();
  const { toast } = useToast();

  const [slots, setSlots] = useState<SlotState[]>(() =>
    Array.from({ length: SLOTS }, emptySlot),
  );
  const [globalProcessing, setGlobalProcessing] = useState(false);
  const debounceRefs = useRef<(ReturnType<typeof setTimeout> | null)[]>(
    Array(SLOTS).fill(null),
  );

  /* [GUARDA DE ACESSO] */
  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate("/login");
      return;
    }
    if (user.email !== "betoborelli9@gmail.com") {
      navigate("/dashboard");
    }
  }, [user, isLoading, navigate]);

  const updateSlot = (idx: number, patch: Partial<SlotState>) => {
    setSlots((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  /* [BUSCA COM DEBOUNCE - 350ms / mínimo 3 letras] */
  const handleQueryChange = (idx: number, value: string) => {
    updateSlot(idx, { query: value, open: true });

    if (debounceRefs.current[idx]) clearTimeout(debounceRefs.current[idx]!);

    if (value.trim().length < 3) {
      updateSlot(idx, { results: [], loading: false });
      return;
    }

    updateSlot(idx, { loading: true });
    debounceRefs.current[idx] = setTimeout(async () => {
      try {
        const results = await searchClubsWithFallback(value, 15);
        updateSlot(idx, { results, loading: false, open: true });
      } catch (err) {
        console.error("[AdminIngestion] search error:", err);
        updateSlot(idx, { results: [], loading: false });
      }
    }, 350);
  };

  const handleSelect = (idx: number, club: ClubSearchResult) => {
    updateSlot(idx, {
      selected: club,
      query: club.name,
      open: false,
      results: [],
      status: "idle",
      message: undefined,
    });
  };

  const clearSlot = (idx: number) => {
    setSlots((prev) => prev.map((s, i) => (i === idx ? emptySlot() : s)));
  };

  /* [INGESTÃO SEQUENCIAL — aguarda cada enrich-club-colors antes do próximo] */
  const handleProcessAll = async () => {
    const selected = slots
      .map((s, i) => ({ slot: s, idx: i }))
      .filter((x) => x.slot.selected);

    if (selected.length === 0) {
      toast({
        title: "Nenhum clube selecionado",
        description: "Selecione ao menos um clube para processar.",
        variant: "destructive",
      });
      return;
    }

    setGlobalProcessing(true);
    let successCount = 0;
    let failCount = 0;

    for (const { slot, idx } of selected) {
      const club = slot.selected!;
      updateSlot(idx, { status: "processing", message: "Enriquecendo via IA…" });

      try {
        const { data, error } = await supabase.functions.invoke(
          "enrich-club-colors",
          {
            body: {
              club_name: club.name,
              api_id: club.api_id ?? null,
            },
          },
        );

        if (error) throw error;

        successCount++;
        updateSlot(idx, {
          status: "done",
          message: data?.message || "Salvo no clubes_cache.",
        });
      } catch (err: any) {
        failCount++;
        console.error("[AdminIngestion] enrich error:", err);
        updateSlot(idx, {
          status: "error",
          message: err?.message || "Falha no enriquecimento.",
        });
      }
    }

    setGlobalProcessing(false);
    toast({
      title: "Ingestão concluída",
      description: `${successCount} sucesso(s), ${failCount} erro(s).`,
    });
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-[#ff6200] w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      {/* [HEADER] */}
      <header className="border-b border-white/10 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-[#ff6200]" />
            <h1 className="text-base md:text-lg italic font-black uppercase tracking-tight">
              Ingestão de Clubes — API Football + IA
            </h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="text-white/60 hover:text-white"
          >
            ← Dashboard
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-4 text-xs italic text-white/70 leading-relaxed">
          Pesquise até <strong className="text-[#ff6200]">5 clubes</strong> via
          API-Football. Ao processar, cada clube é enriquecido pela IA
          historiadora (cores, mascote, apelido) e gravado em{" "}
          <code className="text-[#ff6200]">clubes_cache</code>. Esta página{" "}
          <strong>não interfere</strong> no fluxo de votação.
        </div>

        {/* [BLOCOS DE SLOTS] */}
        <div className="space-y-4">
          {slots.map((slot, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-4 md:p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase italic text-[#ff6200] tracking-widest">
                  Slot #{idx + 1}
                </span>
                {slot.selected && (
                  <button
                    onClick={() => clearSlot(idx)}
                    className="text-white/40 hover:text-white text-xs flex items-center gap-1"
                  >
                    <X size={12} /> limpar
                  </button>
                )}
              </div>

              {/* [INPUT DE BUSCA] */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  value={slot.query}
                  onChange={(e) => handleQueryChange(idx, e.target.value)}
                  onFocus={() =>
                    slot.results.length > 0 && updateSlot(idx, { open: true })
                  }
                  placeholder="Digite ao menos 3 letras (ex: Atletico, Vasco, Real…)"
                  className="pl-9 bg-black/40 border-white/10 text-white placeholder:text-white/30"
                />
                {slot.loading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[#ff6200]" />
                )}

                {slot.open && slot.results.length > 0 && (
                  <div className="absolute z-30 mt-1 w-full max-h-64 overflow-auto rounded-lg border border-white/10 bg-black/95 backdrop-blur-xl shadow-2xl">
                    {slot.results.map((r) => (
                      <button
                        key={r.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelect(idx, r);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-white/10 border-b border-white/5 last:border-0 flex items-center gap-3"
                      >
                        {r.logo ? (
                          <img
                            src={r.logo}
                            alt=""
                            className="w-6 h-6 object-contain"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded bg-white/10" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white truncate">
                            {r.name}
                          </div>
                          <div className="text-[10px] text-white/40 truncate">
                            {r.location} • {r.source.toUpperCase()}
                            {r.api_id ? ` • api_id ${r.api_id}` : ""}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* [PREVIEW DOS DADOS] */}
              {slot.selected && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-[80px_1fr_auto] gap-4 items-start">
                  {slot.selected.logo ? (
                    <img
                      src={slot.selected.logo}
                      alt=""
                      className="w-16 h-16 object-contain bg-white/5 rounded-lg p-1"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-white/10" />
                  )}

                  <div className="text-xs space-y-1 font-mono">
                    <PreviewRow label="nome" value={slot.selected.name} />
                    <PreviewRow
                      label="api_id"
                      value={slot.selected.api_id ?? "—"}
                    />
                    <PreviewRow
                      label="cidade"
                      value={slot.selected.city || "—"}
                    />
                    <PreviewRow
                      label="pais"
                      value={slot.selected.country || "—"}
                    />
                    <PreviewRow label="escudo_url" value={slot.selected.logo || "—"} />
                    <PreviewRow
                      label="source"
                      value={slot.selected.source}
                    />
                    <div className="pt-1 text-[10px] italic text-white/40">
                      ↳ Cores, mascote, apelido, estádio e fundação serão
                      preenchidos pela IA historiadora.
                    </div>
                  </div>

                  <StatusBadge status={slot.status} message={slot.message} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* [BOTÃO DE PROCESSAMENTO] */}
        <div className="sticky bottom-4 z-20">
          <Button
            onClick={handleProcessAll}
            disabled={globalProcessing || slots.every((s) => !s.selected)}
            className="w-full h-14 bg-[#ff6200] hover:bg-[#ff7a1f] text-black font-black uppercase italic tracking-wider text-sm rounded-xl shadow-2xl shadow-[#ff6200]/30"
          >
            {globalProcessing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processando sequencialmente…
              </>
            ) : (
              <>
                <Database className="w-5 h-5 mr-2" />
                Processar e Salvar no Cache
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
};

/* [SUBCOMPONENTES] */
const PreviewRow = ({ label, value }: { label: string; value: any }) => (
  <div className="flex gap-2">
    <span className="text-white/40 w-20 shrink-0">{label}:</span>
    <span className="text-white/90 break-all">{String(value)}</span>
  </div>
);

const StatusBadge = ({
  status,
  message,
}: {
  status: SlotState["status"];
  message?: string;
}) => {
  if (status === "idle") {
    return (
      <span className="text-[10px] italic text-white/30 uppercase">
        aguardando
      </span>
    );
  }
  if (status === "processing") {
    return (
      <span className="flex items-center gap-1 text-[10px] italic text-[#ff6200] uppercase">
        <Loader2 className="w-3 h-3 animate-spin" />
        processando
      </span>
    );
  }
  if (status === "done") {
    return (
      <span
        className="flex items-center gap-1 text-[10px] italic text-emerald-400 uppercase"
        title={message}
      >
        <CheckCircle2 className="w-3 h-3" />
        salvo
      </span>
    );
  }
  return (
    <span
      className="flex items-center gap-1 text-[10px] italic text-red-400 uppercase"
      title={message}
    >
      <AlertTriangle className="w-3 h-3" />
      erro
    </span>
  );
};

export default AdminIngestion;

/**
 * [RODAPÉ TÉCNICO]
 * - 5 slots independentes com autocomplete (debounce 350ms, mín. 3 letras).
 * - Acesso restrito a betoborelli9@gmail.com (Master Admin).
 * - Loop sequencial com await garante que enrich-club-colors complete por clube.
 * - Não altera Voting.tsx nem fluxo de votação.
 */
