/**
 * [CAMINHO]: src/components/correcao/RivalsCombobox.tsx
 * [MÓDULO]: Autocomplete multi-select de rivais (busca em clubes_cache).
 *  - Sugere clubes existentes no banco para garantir nome canônico + escudo.
 *  - Exibe rivais selecionados como tags/chips removíveis.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Loader2, X, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ClubLogo } from "@/components/ClubLogo";
import { searchClubsWithFallback, persistClubsIfMissing, type ClubSearchResult } from "@/lib/search-clubs";

interface ClubRow {
  id: string;
  nome: string;
  cidade: string | null;
  pais: string | null;
  escudo_url: string | null;
  source: "local" | "api";
}

interface Props {
  value: string[];
  onChange: (rivals: string[]) => void;
  excludeName?: string;
  placeholder?: string;
}

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export default function RivalsCombobox({ value, onChange, excludeName, placeholder }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClubRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const q = query.trim();
      // Hybrid search: clubes_cache FIRST + API-Football fallback (same as Voting page)
      const found: ClubSearchResult[] = await searchClubsWithFallback(q, 15);
      const exNorm = excludeName ? norm(excludeName) : "";
      const valSet = new Set(value.map(norm));
      const rows: ClubRow[] = found
        .filter((r) => norm(r.name) !== exNorm && !valSet.has(norm(r.name)))
        .map((r) => ({
          id: r.id,
          nome: r.name,
          cidade: r.city || null,
          pais: r.country || null,
          escudo_url: r.logo || null,
          source: r.source,
        }));
      setResults(rows);
      setLoading(false);
    }, 250);
  }, [query, value, excludeName]);

  const addByName = (name: string, club?: ClubRow) => {
    const clean = name.trim();
    if (!clean) return;
    if (value.some((v) => norm(v) === norm(clean))) return;
    if (value.length >= 6) return;
    onChange([...value, club?.nome || clean]);
    setQuery("");
    setResults([]);
    // Se veio da API-Football, persiste no clubes_cache em background
    // para que o escudo apareça na coluna de Rivais do Dashboard.
    if (club?.source === "api") {
      persistClubsIfMissing([
        {
          id: club.id,
          name: club.nome,
          shortName: club.nome,
          location: [club.cidade, club.pais].filter(Boolean).join(", "),
          logo: club.escudo_url || "",
          city: club.cidade || "",
          state: "",
          country: club.pais || "",
          source: "api",
          api_id: Number(String(club.id).replace(/^api-/, "")) || null,
        },
      ]).catch(() => {});
    }
  };

  const remove = (name: string) => onChange(value.filter((v) => v !== name));

  const canAddFreeText = useMemo(() => {
    const q = query.trim();
    if (q.length < 2) return false;
    if (value.some((v) => norm(v) === norm(q))) return false;
    if (results.some((r) => norm(r.nome) === norm(q))) return false;
    return true;
  }, [query, value, results]);

  return (
    <div className="relative" ref={wrapRef}>
      {/* CHIPS */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {value.map((rival) => (
            <span
              key={rival}
              className="inline-flex items-center gap-1.5 bg-[#ff6200]/10 border border-[#ff6200]/40 text-white rounded-full pl-3 pr-1 py-1 text-xs font-bold italic"
            >
              {rival}
              <button
                type="button"
                onClick={() => remove(rival)}
                className="w-5 h-5 rounded-full hover:bg-[#ff6200]/30 inline-flex items-center justify-center"
                aria-label={`Remover ${rival}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* INPUT */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canAddFreeText) {
              e.preventDefault();
              addByName(query);
            }
          }}
          placeholder={placeholder || "Digite o nome do rival..."}
          disabled={value.length >= 6}
          className="bg-white/5 border-[#ff6200]/40 text-white pl-10 focus-visible:ring-[#ff6200]"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[#ff6200]" />
        )}
      </div>

      {/* DROPDOWN */}
      {open && (results.length > 0 || canAddFreeText) && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-black border border-white/10 rounded-xl overflow-hidden shadow-2xl max-h-72 overflow-y-auto">
          {results.map((club) => (
            <button
              key={club.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                addByName(club.nome, club);
              }}
              className="w-full flex items-center gap-3 p-2.5 hover:bg-white/5 border-b border-white/5 text-left"
            >
              <div className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center p-1 shrink-0">
                <ClubLogo src={club.escudo_url || undefined} alt={club.nome} size="sm" />
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm font-bold text-white italic uppercase truncate">
                  {club.nome}
                </span>
                <span className="text-[10px] text-white/40 uppercase tracking-wider truncate">
                  {[club.cidade, club.pais].filter(Boolean).join(" • ")}
                </span>
              </div>
            </button>
          ))}
          {canAddFreeText && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                addByName(query);
              }}
              className="w-full flex items-center gap-2 p-2.5 hover:bg-[#ff6200]/10 text-left"
            >
              <Plus className="w-4 h-4 text-[#ff6200]" />
              <span className="text-xs italic text-white/80">
                Adicionar <span className="font-bold text-[#ff6200]">"{query.trim()}"</span> mesmo assim
              </span>
            </button>
          )}
        </div>
      )}

      <p className="text-[10px] italic text-white/40 mt-1.5">
        Selecione no banco para garantir o escudo certo. Máx. 6 rivais.
      </p>
    </div>
  );
}
