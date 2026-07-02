/* src/components/ClubLogo.tsx
   Componente único e BLINDADO para renderizar escudos de clubes.
   Cascata de fallback: src -> resolver (Supabase cache -> API-Football -> Wikipedia) -> Shield.
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

// Cache global em memória por nome normalizado — evita chamadas repetidas ao resolver
const resolvedCache = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();

const normalizeName = (s: string) =>
  (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

const normalizeLogoSrc = (raw: string): string => {
  const s = raw.trim();
  if (!s) return s;
  if (/^(data:|blob:|https?:\/\/)/i.test(s)) return s;
  if (s.startsWith("//")) return `https:${s}`;
  if (s.startsWith("/")) return s;
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+\//i.test(s)) return `https://${s}`;
  return `/${s.replace(/^\.?\/+/, "")}`;
};

async function resolveLogo(name: string): Promise<string | null> {
  const key = normalizeName(name);
  if (!key) return null;
  if (resolvedCache.has(key)) return resolvedCache.get(key)!;
  if (inflight.has(key)) return inflight.get(key)!;

  const p = (async () => {
    try {
      const { data } = await supabase.functions.invoke("resolve-club-logo", {
        body: { clubName: name },
      });
      const url = (data as any)?.url as string | null;
      if (url) resolvedCache.set(key, url);
      return url || null;
    } catch {
      return null;
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

  const [currentSrc, setCurrentSrc] = useState<string | null>(
    normalizedInitial || resolvedCache.get(normalizeName(effectiveName)) || null,
  );
  const [failed, setFailed] = useState(false);
  const triedResolver = useRef(false);

  // Se não temos src inicial, tenta resolver imediatamente
  useEffect(() => {
    if (currentSrc || triedResolver.current || !effectiveName) return;
    triedResolver.current = true;
    resolveLogo(effectiveName).then((url) => {
      if (url) setCurrentSrc(normalizeLogoSrc(url));
      else setFailed(true);
    });
  }, [effectiveName, currentSrc]);

  const handleError = () => {
    if (!triedResolver.current && effectiveName) {
      triedResolver.current = true;
      resolveLogo(effectiveName).then((url) => {
        if (url && normalizeLogoSrc(url) !== currentSrc) {
          setCurrentSrc(normalizeLogoSrc(url));
        } else {
          setFailed(true);
        }
      });
    } else {
      setFailed(true);
    }
  };

  if (!currentSrc || failed) {
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
 * Versão: 3.0 — Blindagem: resolver em cascata (cache → API-Football → Wikipedia)
 * Regra invariável: nunca altera lógica de votos, apenas garante presença visual do escudo.
 */
