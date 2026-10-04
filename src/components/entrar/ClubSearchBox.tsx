/**
 * [CAMINHO]: src/components/entrar/ClubSearchBox.tsx
 * [MÓDULO]: Busca de clube com espera (debounce) e lista de resultados — usada na escolha do
 * clube do coração (/entrar) e nas simpatias (/confirmar-voto).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslationApp } from "@/hooks/useTranslationApp";
import { searchClubsWithFallback, type ClubSearchResult } from "@/lib/search-clubs";
import { ClubLogo } from "@/components/ClubLogo";

/** Busca de clubes com espera e descarte de resposta velha. */
export function useClubSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClubSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const reqId = useRef(0);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 3) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }
    const timer = setTimeout(async () => {
      const id = ++reqId.current;
      setLoading(true);
      try {
        const found = await searchClubsWithFallback(term);
        if (id === reqId.current) {
          setResults(found);
          setOpen(true);
        }
      } catch (err) {
        console.error("[ENTRAR] busca falhou", err);
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const reset = useCallback(() => {
    reqId.current++;
    setQuery("");
    setResults([]);
    setOpen(false);
  }, []);

  return { query, setQuery, results, loading, open, setOpen, reset };
}

export function ResultsList({
  results,
  loading,
  open,
  onPick,
}: {
  results: ClubSearchResult[];
  loading: boolean;
  open: boolean;
  onPick: (c: ClubSearchResult) => void;
}) {
  const { t } = useTranslationApp();
  if (!open && !loading) return null;
  return (
    <div className="absolute left-0 right-0 top-full z-[100] mt-2 max-h-[340px] overflow-y-auto rounded-2xl border border-white/10 bg-[#1A1A1A] shadow-2xl">
      {loading && results.length === 0 ? (
        <div className="flex items-center justify-center gap-2 p-5 text-sm text-white/60">
          <Loader2 className="h-4 w-4 animate-spin" /> {t("entrar.searching")}
        </div>
      ) : results.length === 0 ? (
        <p className="p-5 text-center text-sm text-white/60">{t("entrar.no_results")}</p>
      ) : (
        results.map((club, i) => (
          <button
            key={`${club.id}-${i}`}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onPick(club);
            }}
            className="flex w-full items-center gap-4 border-b border-white/5 px-5 py-3.5 text-left last:border-0 hover:bg-white/5"
          >
            <ClubLogo src={club.logo} alt={club.name} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-black uppercase italic">{club.name}</p>
              <p className="text-[10px] font-bold uppercase text-white/50">
                {club.location || `${club.city}, ${club.country}`}
              </p>
            </div>
          </button>
        ))
      )}
    </div>
  );
}
