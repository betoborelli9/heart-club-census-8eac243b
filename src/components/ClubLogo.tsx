/* src/components/ClubLogo.tsx
   Componente único e BLINDADO para renderizar escudos de clubes.
   Cascata de fallback: src -> Supabase cache -> logos locais -> API-Football -> Wikipedia -> emblema sintético.
   Nunca altera lógica de votos ou dados dinâmicos. */

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { LOCAL_LOGOS } from "@/data/logos-manifest";

type LogoSize = "xs" | "sm" | "md" | "lg" | "xl";

const sizeClasses: Record<LogoSize, string> = {
  xs: "w-6 h-6 sm:w-7 sm:h-7",
  sm: "w-8 h-8 sm:w-10 sm:h-10",
  md: "w-10 h-10 sm:w-12 sm:h-12",
  lg: "w-14 h-14 sm:w-16 sm:h-16",
  xl: "w-20 h-20 sm:w-24 sm:h-24",
};

const BRAZIL_STATE_TO_UF: Record<string, string> = {
  acre: "ac",
  alagoas: "al",
  amapa: "ap",
  amazonas: "am",
  bahia: "ba",
  ceara: "ce",
  "distrito-federal": "df",
  "espirito-santo": "es",
  goias: "go",
  maranhao: "ma",
  "mato-grosso": "mt",
  "mato-grosso-do-sul": "ms",
  "minas-gerais": "mg",
  para: "pa",
  paraiba: "pb",
  parana: "pr",
  pernambuco: "pe",
  piaui: "pi",
  "rio-de-janeiro": "rj",
  "rio-grande-do-norte": "rn",
  "rio-grande-do-sul": "rs",
  rondonia: "ro",
  roraima: "rr",
  "santa-catarina": "sc",
  "sao-paulo": "sp",
  sergipe: "se",
  tocantins: "to",
};

interface ClubLogoProps {
  src: string | null | undefined;
  alt: string;
  /** Nome do clube para acionar resolver de fallback (cache -> API -> Wikipedia). Se omitido, usa `alt`. */
  clubName?: string;
  size?: LogoSize;
  className?: string;
  loading?: "lazy" | "eager";
  fetchPriority?: "high" | "low" | "auto";
}

type ClubeCacheLogoRow = {
  nome?: string | null;
  nome_curto?: string | null;
  escudo_url?: string | null;
  cidade?: string | null;
  pais?: string | null;
};

// Cache global em memória por nome normalizado — evita chamadas repetidas ao resolver
const resolvedCache = new Map<string, string[]>();
const inflight = new Map<string, Promise<string[]>>();

const normalizeName = (s: string) =>
  (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

const slugify = (s: string) =>
  normalizeName(s)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const splitCityState = (value: string) => {
  const parts = value.split(",").map((part) => part.trim()).filter(Boolean);
  const city = parts[0] || value;
  const stateRaw = parts[1] || "";
  const stateSlug = slugify(stateRaw);
  const state = stateSlug.length === 2 ? stateSlug : BRAZIL_STATE_TO_UF[stateSlug] || stateSlug;
  return { city, state };
};

const dedupe = (items: Array<string | null | undefined>) => {
  const seen = new Set<string>();
  const out: string[] = [];
  items.forEach((item) => {
    if (!item) return;
    const normalized = normalizeLogoSrc(item);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    out.push(normalized);
  });
  return out;
};

const significantTokens = (name: string) => {
  const stop = new Set([
    "sport", "club", "clube", "de", "da", "do", "dos", "das", "e", "futebol",
    "esporte", "esportes", "sociedade", "associacao", "association", "football", "fc",
    "cf", "ec", "sc", "ac", "regatas", "regata", "atletico", "atletica", "gremio",
  ]);
  return slugify(name)
    .split("-")
    .filter((token) => token.length > 2 && !stop.has(token))
    .sort((a, b) => b.length - a.length);
};

const normalizeLogoSrc = (raw: string): string => {
  const s = raw.trim();
  if (!s) return s;
  if (/^http:\/\//i.test(s)) return `https://${s.replace(/^http:\/\//i, "")}`;
  if (/^(data:|blob:|https?:\/\/)/i.test(s)) return s;
  if (s.startsWith("//")) return `https:${s}`;
  if (s.startsWith("/")) return s;
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+\//i.test(s)) return `https://${s}`;
  return `/${s.replace(/^\.?\/+/, "")}`;
};

// Match manifest entries (arquivos reais em /public/logos/) pelo prefixo do slug do clube.
// Ex.: "Vila Nova" → prefixo "vila-nova-" casa "vila-nova-goiania-go-brasil.png".
const localLogosByName = (name: string): string[] => {
  const slug = slugify(name);
  if (!slug) return [];
  const exact: string[] = [];
  const prefixed: string[] = [];
  for (const file of LOCAL_LOGOS) {
    if (file === slug) exact.push(`/logos/${file}.png`);
    else if (file.startsWith(`${slug}-`)) prefixed.push(`/logos/${file}.png`);
  }
  return [...exact, ...prefixed];
};


const localLogoCandidatesFromRow = (name: string, row?: ClubeCacheLogoRow | null) => {
  const cidade = row?.cidade || "";
  const pais = row?.pais || "";
  const names = [row?.nome, row?.nome_curto, name].filter(Boolean) as string[];
  const { city, state } = splitCityState(cidade);
  const countrySlug = slugify(pais);
  const countryAliases = countrySlug === "brazil" || countrySlug === "brasil" ? ["brasil", "brazil"] : [countrySlug];

  return dedupe(
    names.flatMap((clubName) => {
      const clubSlug = slugify(clubName);
      const paths = [`/logos/${clubSlug}.png`];
      if (city || state || pais) {
        countryAliases.forEach((country) => {
          paths.push(`/logos/${[clubSlug, slugify(city), state, country].filter(Boolean).join("-")}.png`);
          paths.push(`/logos/${[clubSlug, slugify(cidade), country].filter(Boolean).join("-")}.png`);
        });
      }
      return paths;
    }),
  );
};

const withTimeout = async <T,>(promise: Promise<T>, ms: number): Promise<T | null> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timeoutId = setTimeout(() => resolve(null), ms);
  });
  const result = await Promise.race([promise, timeout]);
  if (timeoutId) clearTimeout(timeoutId);
  return result as T | null;
};

async function resolveLogoCandidates(name: string): Promise<string[]> {
  const key = normalizeName(name);
  if (!key) return [];
  if (resolvedCache.has(key)) return resolvedCache.get(key)!;
  if (inflight.has(key)) return inflight.get(key)!;

  const p = (async () => {
    const candidates: string[] = [];
    try {
      const token = significantTokens(name)[0];
      const queries = [name, token].filter(Boolean) as string[];

      for (const query of queries) {
        const { data } = await supabase
          .from("clubes_cache")
          .select("nome, nome_curto, escudo_url, cidade, pais")
          .ilike("nome", `%${query}%`)
          .order("escudo_url", { ascending: false, nullsFirst: false })
          .limit(6);

        (data || []).forEach((row: ClubeCacheLogoRow) => {
          candidates.push(row.escudo_url || "");
          candidates.push(...localLogoCandidatesFromRow(name, row));
        });

        if (candidates.length > 0) break;
      }

      const cacheUrls = dedupe(candidates);
      if (cacheUrls.length) resolvedCache.set(key, cacheUrls);

      const functionResult = await withTimeout(
        supabase.functions.invoke("resolve-club-logo", { body: { clubName: name } }),
        2500,
      );
      const data = functionResult?.data;
      const url = (data as any)?.url as string | null;
      if (url) candidates.push(url);

      const urls = dedupe(candidates);
      resolvedCache.set(key, urls);
      return urls;
    } catch {
      const urls = dedupe(candidates);
      if (urls.length) resolvedCache.set(key, urls);
      return urls;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
}

const initialsFromName = (name: string) => {
  const tokens = significantTokens(name).slice(0, 3);
  const initials = tokens.map((token) => token[0]).join("").toUpperCase();
  return initials || normalizeName(name).slice(0, 2).toUpperCase() || "HC";
};

const fallbackPalette = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const safeHues = [28, 46, 142, 186, 206, 228, 272];
  const hue = safeHues[hash % safeHues.length];
  return {
    primary: `hsl(${hue} 78% 42%)`,
    secondary: `hsl(${(hue + 42) % 360} 82% 58%)`,
  };
};

const SyntheticCrest = ({ name, size, className }: { name: string; size: LogoSize; className?: string }) => {
  const palette = fallbackPalette(name);
  const initials = initialsFromName(name);
  return (
    <div
      className={cn(sizeClasses[size], "flex items-center justify-center shrink-0", className)}
      title={name}
      aria-label={name}
    >
      <svg viewBox="0 0 64 64" role="img" aria-hidden="true" className="w-full h-full drop-shadow-sm">
        <defs>
          <linearGradient id={`crest-${slugify(name) || "club"}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={palette.secondary} />
            <stop offset="100%" stopColor={palette.primary} />
          </linearGradient>
        </defs>
        <path
          d="M32 4 54 12v18c0 15.5-8.8 25-22 30C18.8 55 10 45.5 10 30V12L32 4Z"
          fill={`url(#crest-${slugify(name) || "club"})`}
          stroke="rgba(255,255,255,0.86)"
          strokeWidth="3"
        />
        <path d="M18 18h28M18 46h28" stroke="rgba(0,0,0,0.28)" strokeWidth="3" strokeLinecap="round" />
        <text
          x="32"
          y="38"
          textAnchor="middle"
          fontFamily="Verdana, Arial, sans-serif"
          fontSize={initials.length > 2 ? 15 : 19}
          fontWeight="900"
          fontStyle="italic"
          fill="white"
          stroke="rgba(0,0,0,0.45)"
          strokeWidth="0.8"
          paintOrder="stroke"
        >
          {initials}
        </text>
      </svg>
    </div>
  );
};

export const ClubLogo = ({
  src,
  alt,
  clubName,
  size = "md",
  className,
  loading = "lazy",
  fetchPriority = "auto",
}: ClubLogoProps) => {
  const effectiveName = clubName || alt;
  const normalizedInitial = typeof src === "string" && src.trim() ? normalizeLogoSrc(src) : null;
  const cacheKey = normalizeName(effectiveName);
  const failedSources = useRef<Set<string>>(new Set());

  const [candidates, setCandidates] = useState<string[]>(
    dedupe([normalizedInitial, ...localLogosByName(effectiveName), ...(resolvedCache.get(cacheKey) || []), ...localLogoCandidatesFromRow(effectiveName)]),
  );
  const [resolving, setResolving] = useState(false);
  const [failed, setFailed] = useState(false);
  const currentSrc = candidates[0] || null;

  // Sempre reforça a fila de escudos ao mudar de clube: cache Supabase + local + API + Wikipedia.
  useEffect(() => {
    let cancelled = false;
    failedSources.current = new Set();
    const initial = dedupe([normalizedInitial, ...localLogosByName(effectiveName), ...(resolvedCache.get(cacheKey) || []), ...localLogoCandidatesFromRow(effectiveName)]);
    setCandidates(initial);
    setFailed(false);
    setResolving(true);

    resolveLogoCandidates(effectiveName).then((urls) => {
      if (cancelled) return;
      const next = dedupe([...initial, ...urls]).filter((url) => !failedSources.current.has(url));
      setCandidates(next);
      setFailed(next.length === 0);
      setResolving(false);
    });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, effectiveName, normalizedInitial]);

  const handleError = () => {
    if (currentSrc) failedSources.current.add(currentSrc);
    setCandidates((prev) => {
      const next = prev.filter((url) => url !== currentSrc);
      if (next.length === 0 && !resolving) setFailed(true);
      return next;
    });
  };

  const showFallback = !currentSrc || failed;

  if (showFallback) {
    return <SyntheticCrest name={effectiveName} size={size} className={className} />;
  }

  return (
    <div
      className={cn(
        sizeClasses[size],
        "flex items-center justify-center shrink-0 overflow-hidden rounded-full bg-white/5",
        className,
      )}
      title={alt}
    >
      <img
        key={currentSrc}
        src={currentSrc}
        alt={alt}
        className="w-full h-full object-contain p-0.5"
        referrerPolicy="no-referrer"
        onError={handleError}
        loading={loading}
        // @ts-expect-error fetchpriority é atributo HTML válido
        fetchpriority={fetchPriority}
      />
    </div>
  );
};

/**
 * [RODAPÉ TÉCNICO]
 * Versão: 5.0 — Blindagem: src → cache imediato → logos locais normalizados → API-Football/Wikipedia com timeout → emblema sintético
 * Regra invariável: nunca altera lógica de votos, apenas garante presença visual do escudo.
 */
