/* src/components/ClubLogo.tsx
   Componente único e BLINDADO para renderizar escudos de clubes.
   Cascata de fallback: src -> Supabase cache -> logos locais -> API-Football -> Wikipedia -> Shield.
   Nunca altera lógica de votos ou dados dinâmicos. */

import { useEffect, useRef, useState } from "react";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

type LogoSize = "xs" | "sm" | "md" | "lg" | "xl";

const sizeClasses: Record<LogoSize, string> = {
  xs: "w-6 h-6 sm:w-7 sm:h-7",
  sm: "w-8 h-8 sm:w-10 sm:h-10",
  md: "w-10 h-10 sm:w-12 sm:h-12",
  lg: "w-14 h-14 sm:w-16 sm:h-16",
  xl: "w-20 h-20 sm:w-24 sm:h-24",
};

const fallbackIconSize: Record<LogoSize, string> = {
  xs: "w-3 h-3",
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
  xl: "w-8 h-8",
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
  estado?: string | null;
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

const localLogoCandidatesFromRow = (name: string, row?: ClubeCacheLogoRow | null) => {
  const cidade = row?.cidade || "";
  const estado = row?.estado || "";
  const pais = row?.pais || "";
  const names = [row?.nome, row?.nome_curto, name].filter(Boolean) as string[];

  return dedupe(
    names.flatMap((clubName) => {
      const paths = [`/logos/${slugify(clubName)}.png`];
      if (cidade || estado || pais) {
        paths.push(`/logos/${[clubName, cidade, estado, pais].map(slugify).filter(Boolean).join("-")}.png`);
      }
      return paths;
    }),
  );
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
          .select("nome, nome_curto, escudo_url, cidade, estado, pais")
          .ilike("nome", `%${query}%`)
          .order("escudo_url", { ascending: false, nullsFirst: false })
          .limit(6);

        (data || []).forEach((row: ClubeCacheLogoRow) => {
          candidates.push(row.escudo_url || "");
          candidates.push(...localLogoCandidatesFromRow(name, row));
        });

        if (candidates.length > 0) break;
      }

      const { data } = await supabase.functions.invoke("resolve-club-logo", {
        body: { clubName: name },
      });
      const url = (data as any)?.url as string | null;
      if (url) candidates.push(url);

      const urls = dedupe(candidates);
      if (urls.length) resolvedCache.set(key, urls);
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
    dedupe([normalizedInitial, ...(resolvedCache.get(cacheKey) || []), ...localLogoCandidatesFromRow(effectiveName)]),
  );
  const [resolving, setResolving] = useState(false);
  const [failed, setFailed] = useState(false);
  const currentSrc = candidates[0] || null;

  // Sempre reforça a fila de escudos ao mudar de clube: cache Supabase + local + API + Wikipedia.
  useEffect(() => {
    let cancelled = false;
    failedSources.current = new Set();
    const initial = dedupe([normalizedInitial, ...(resolvedCache.get(cacheKey) || []), ...localLogoCandidatesFromRow(effectiveName)]);
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
    if (resolving && !failed) {
      return (
        <div
          className={cn(
            sizeClasses[size],
            "rounded-full bg-white/10 flex items-center justify-center shrink-0 animate-pulse",
            className,
          )}
          title={alt}
        />
      );
    }
    return (
      <div
        className={cn(
          sizeClasses[size],
          "rounded-full bg-secondary/50 flex items-center justify-center shrink-0",
          className,
        )}
        title={alt}
      >
        <Shield className={cn(fallbackIconSize[size], "text-muted-foreground")} />
      </div>
    );
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
 * Versão: 4.0 — Blindagem: src → cache → logos locais → API-Football → Wikipedia
 * Regra invariável: nunca altera lógica de votos, apenas garante presença visual do escudo.
 */
