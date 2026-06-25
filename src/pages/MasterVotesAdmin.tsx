/**
 * [CAMINHO]: src/pages/MasterVotesAdmin.tsx
 * [MÓDULO]: Painel Master — Correção de Votos
 * [REGRA]: Acesso exclusivo a betoborelli9@gmail.com. Lista todos os votos
 *          (clube do coração + 4 simpatias), destaca o que está fora do
 *          padrão canônico do clubes_cache e permite trocar pelo clube
 *          correto buscando em paralelo no Supabase + API-Football.
 *          Ao corrigir, o voto continua válido e a contagem é atualizada
 *          automaticamente (apenas trocamos o `clube_nome`/`sympathy_N`).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle, Check, Search as SearchIcon, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { isMasterEmail } from "@/lib/master";
import { ClubSearch } from "@/components/dashboard/ClubSearch";
import { ClubLogo } from "@/components/ClubLogo";
import type { ClubSearchResult } from "@/lib/search-clubs";
import { toast } from "@/hooks/use-toast";

type Mismatch = { current: string; suggestion: { nome: string; escudo_url?: string } | null };
type VoteRow = {
  id: string;
  created_at: string;
  user_id: string;
  email: string | null;
  clube_nome: string | null;
  sympathy_1: string | null;
  sympathy_2: string | null;
  sympathy_3: string | null;
  sympathy_4: string | null;
  cidade: string | null;
  estado: string | null;
  pais: string | null;
  status_aprovacao: string | null;
  is_original_vote: boolean | null;
  _mismatches: Record<string, Mismatch>;
};

const SLOTS: Array<{ key: keyof VoteRow; label: string }> = [
  { key: "clube_nome", label: "Clube do Coração" },
  { key: "sympathy_1", label: "Simpatia 1" },
  { key: "sympathy_2", label: "Simpatia 2" },
  { key: "sympathy_3", label: "Simpatia 3" },
  { key: "sympathy_4", label: "Simpatia 4" },
];

export default function MasterVotesAdmin() {
  const navigate = useNavigate();
  const { user, isLoading: loading } = useUser();
  const [votes, setVotes] = useState<VoteRow[]>([]);
  const [search, setSearch] = useState("");
  const [fetching, setFetching] = useState(false);
  const [onlyMismatch, setOnlyMismatch] = useState(false);
  const [editing, setEditing] = useState<{ vote: VoteRow; field: string; label: string } | null>(null);

  useEffect(() => {
    if (!loading && !isMasterEmail(user?.email)) navigate("/dashboard", { replace: true });
  }, [loading, user, navigate]);

  const load = useCallback(async () => {
    setFetching(true);
    const { data, error } = await supabase.functions.invoke("master-votes-admin", {
      body: { action: "list", search, limit: 300 },
    });
    setFetching(false);
    if (error) {
      toast({ title: "Erro ao carregar votos", description: error.message, variant: "destructive" });
      return;
    }
    setVotes((data as any)?.votes || []);
  }, [search]);

  useEffect(() => {
    if (isMasterEmail(user?.email)) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  const filtered = useMemo(
    () => (onlyMismatch ? votes.filter((v) => Object.keys(v._mismatches || {}).length > 0) : votes),
    [votes, onlyMismatch],
  );

  const handleSelect = useCallback(
    async (club: ClubSearchResult) => {
      if (!editing) return;
      const { vote, field } = editing;
      const newName = club.name.trim();
      const { error } = await supabase.functions.invoke("master-votes-admin", {
        body: { action: "update", vote_id: vote.id, patch: { [field]: newName } },
      });
      if (error) {
        toast({ title: "Falha ao corrigir", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Voto corrigido", description: `${field} → ${newName}` });
      setEditing(null);
      await load();
    },
    [editing, load],
  );

  if (loading || !isMasterEmail(user?.email)) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#ff6200]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-30 bg-black/95 border-b border-[#ff6200]/30 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-white/70 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-sm md:text-base font-black italic uppercase tracking-wider text-[#ff6200]">
          Master · Correção de Votos
        </h1>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              placeholder="Buscar por email, clube ou cidade…"
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm italic placeholder:text-white/30 focus:outline-none focus:border-[#ff6200]"
            />
          </div>
          <button
            onClick={load}
            className="px-4 py-2 rounded-xl bg-[#ff6200] text-black text-xs font-black italic uppercase tracking-wider hover:brightness-110"
          >
            {fetching ? "Carregando…" : "Buscar"}
          </button>
          <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs italic cursor-pointer">
            <input
              type="checkbox"
              checked={onlyMismatch}
              onChange={(e) => setOnlyMismatch(e.target.checked)}
              className="accent-[#ff6200]"
            />
            Só suspeitos
          </label>
        </div>

        <p className="text-[11px] italic text-white/40">
          {filtered.length} voto(s) • clique em qualquer slot para corrigir. A contagem é atualizada
          automaticamente — clubes equivalentes (ex.: "Clube de Regatas do Flamengo" → "Flamengo")
          aparecem com um aviso laranja.
        </p>

        <div className="space-y-3">
          {filtered.map((v) => (
            <div key={v.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="text-xs italic text-white/70 truncate">
                  <span className="text-white font-bold">{v.email || "(sem email)"}</span>
                  <span className="text-white/40">
                    {" "}
                    · {v.cidade || "—"}/{v.estado || "—"} · {new Date(v.created_at).toLocaleString("pt-BR")}
                  </span>
                </div>
                {v.is_original_vote && (
                  <span className="text-[9px] font-black italic uppercase tracking-wider text-emerald-400">
                    Original
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                {SLOTS.map(({ key, label }) => {
                  const val = (v as any)[key] as string | null;
                  const mm = v._mismatches?.[key as string];
                  return (
                    <button
                      key={key as string}
                      onClick={() => setEditing({ vote: v, field: key as string, label })}
                      className={`text-left rounded-xl border px-2.5 py-2 transition ${
                        mm
                          ? "border-[#ff6200]/60 bg-[#ff6200]/10 hover:bg-[#ff6200]/20"
                          : "border-white/10 bg-black/30 hover:border-white/30"
                      }`}
                    >
                      <div className="text-[9px] font-black italic uppercase tracking-wider text-white/40">
                        {label}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {val ? (
                          <>
                            <ClubLogo
                              src={mm?.suggestion?.escudo_url}
                              alt={mm?.suggestion?.nome || val}
                              size="sm"
                            />
                            <span className="text-xs italic text-white truncate">{val}</span>
                          </>
                        ) : (
                          <span className="text-xs italic text-white/30">—</span>
                        )}
                      </div>
                      {mm && (
                        <div className="mt-1 flex items-start gap-1 text-[10px] italic text-[#ff6200]">
                          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                          <span className="leading-tight">
                            {mm.suggestion?.nome
                              ? <>Sugestão: <b>{mm.suggestion.nome}</b></>
                              : "Fora do cadastro"}
                          </span>
                        </div>
                      )}
                      {!mm && val && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] italic text-emerald-400/80">
                          <Check className="w-3 h-3" /> OK
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {!fetching && filtered.length === 0 && (
            <div className="text-center text-white/40 italic py-10">Nenhum voto encontrado.</div>
          )}
        </div>
      </main>

      {/* Modal de correção */}
      {editing && (
        <div className="fixed inset-0 z-[300] bg-black/80 flex items-start justify-center p-4 pt-16">
          <div className="w-full max-w-xl rounded-2xl border border-[#ff6200]/40 bg-black p-4 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[10px] font-black italic uppercase tracking-widest text-[#ff6200]">
                  Corrigir {editing.label}
                </div>
                <div className="text-xs italic text-white/60 mt-0.5">
                  Atual: <b className="text-white">{(editing.vote as any)[editing.field] || "—"}</b>
                </div>
              </div>
              <button onClick={() => setEditing(null)} className="text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <ClubSearch onSelect={handleSelect} />
            <p className="text-[10px] italic text-white/40 mt-3">
              Busca em paralelo no Supabase (cache local) e na API-Football. Selecionar grava direto
              no voto — o torcedor continua válido na contagem.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
