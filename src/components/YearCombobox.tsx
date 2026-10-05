/**
 * [CAMINHO]: src/components/YearCombobox.tsx
 * [MÓDULO]: Campo de ano de nascimento que aceita OS DOIS jeitos: digitar (ex.: 1990) ou rolar a
 * lista de anos e tocar. Ao digitar, a lista filtra pelos números já escritos. Só devolve um ano
 * válido (entre 1920 e o ano atual); enquanto não for válido, devolve vazio.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";

const MIN_YEAR = 1920;

export default function YearCombobox({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (year: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const maxYear = new Date().getFullYear();
  const [text, setText] = useState(value);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => setText(value), [value]);

  const years = useMemo(() => {
    const all: string[] = [];
    for (let y = maxYear; y >= MIN_YEAR; y--) all.push(String(y));
    return text && text.length < 4 ? all.filter((y) => y.startsWith(text)) : all;
  }, [text, maxYear]);

  // Fecha a lista ao tocar fora
  useEffect(() => {
    const close = (e: MouseEvent | TouchEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, []);

  const handleType = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 4);
    setText(digits);
    setOpen(true);
    const n = Number(digits);
    onChange(digits.length === 4 && n >= MIN_YEAR && n <= maxYear ? digits : "");
  };

  const pick = (y: string) => {
    setText(y);
    onChange(y);
    setOpen(false);
  };

  const invalid = text.length === 4 && value === "";

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <Input
        value={text}
        inputMode="numeric"
        autoComplete="off"
        maxLength={4}
        placeholder={placeholder}
        onChange={(e) => handleType(e.target.value)}
        onFocus={() => setOpen(true)}
        aria-invalid={invalid}
        className={`h-12 rounded-xl border-white/10 bg-card pr-10 ${invalid ? "border-red-500/60" : ""}`}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label="anos"
        onClick={() => setOpen((o) => !o)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
      >
        <ChevronDown className="h-4 w-4" />
      </button>
      {open && years.length > 0 && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-[200] mt-1 max-h-56 overflow-y-auto rounded-xl border border-white/10 bg-[#1A1A1A] py-1 shadow-2xl"
        >
          {years.map((y) => (
            <li key={y} role="option" aria-selected={y === value}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(y)}
                className={`block w-full px-4 py-2 text-left text-sm hover:bg-white/10 ${y === value ? "font-black text-primary" : "text-white/80"}`}
              >
                {y}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
