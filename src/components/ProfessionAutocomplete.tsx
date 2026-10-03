/**
 * Campo de profissão com autocomplete: digita e filtra a lista de
 * profissões comuns (src/data/professions.ts). Se não achar, a pessoa
 * pode usar o que digitou mesmo assim — nunca trava o torcedor numa
 * lista fechada. Lista rolável, no máximo 8 itens visíveis por vez.
 */
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { PROFESSIONS } from "@/data/professions";

const norm = (s: string) =>
  (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function ProfessionAutocomplete({ value, onChange, placeholder }: Props) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => setQuery(value || ""), [value]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const results =
    query.trim().length === 0
      ? PROFESSIONS.slice(0, 8)
      : PROFESSIONS.filter((p) => norm(p).includes(norm(query))).slice(0, 8);

  const pick = (p: string) => {
    setQuery(p);
    onChange(p);
    setOpen(false);
  };

  return (
    <div className="relative" ref={wrapRef}>
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder || "Digite sua profissão..."}
        className="h-12 bg-secondary/30 border-border/30"
      />
      {open && results.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-card border border-border rounded-xl overflow-y-auto max-h-56 shadow-2xl">
          {results.map((p) => (
            <button
              key={p}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                pick(p);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/60 border-b border-border/30 last:border-0"
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
