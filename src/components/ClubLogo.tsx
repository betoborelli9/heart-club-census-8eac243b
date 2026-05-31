/* src/components/ClubLogo.tsx
   Componente único para renderizar escudos de clubes.
   Fonte: exclusivamente clube.logoUrl de clubes-data.ts ou escudo_url do Supabase.
   Fallback: placeholder neutro, nunca outro escudo. */

import { useState } from "react";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

type LogoSize = "xs" | "sm" | "md" | "lg" | "xl";

const sizeClasses: Record<LogoSize, string> = {
  xs: "w-6 h-6 sm:w-7 sm:h-7",
  sm: "w-8 h-8 sm:w-10 sm:h-10", // dropdown / lista
  md: "w-10 h-10 sm:w-12 sm:h-12", // voto
  lg: "w-14 h-14 sm:w-16 sm:h-16", // dashboard profile
  xl: "w-20 h-20 sm:w-24 sm:h-24", // destaque
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
  size?: LogoSize;
  className?: string;
  loading?: "lazy" | "eager";
  fetchPriority?: "high" | "low" | "auto";
}

/**
 * Normaliza a URL do escudo para evitar ERR_NAME_NOT_RESOLVED.
 * - data:/blob: → mantém
 * - http(s):// → mantém
 * - // (protocol-relative) → prefixa https:
 * - "dominio.tld/..." (sem protocolo) → prefixa https://
 * - "arquivo.png" ou "pasta/arquivo.png" → prefixa "/" (raiz absoluta)
 * - "/..." → mantém
 */
const normalizeLogoSrc = (raw: string): string => {
  const s = raw.trim();
  if (!s) return s;
  if (/^(data:|blob:|https?:\/\/)/i.test(s)) return s;
  if (s.startsWith("//")) return `https:${s}`;
  if (s.startsWith("/")) return s;
  // Detecta domínio sem protocolo (ex.: "votenoseutime.com.br/26550.png")
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+\//i.test(s)) return `https://${s}`;
  // Caminho relativo simples → torna absoluto à raiz para funcionar em qualquer rota/domínio
  return `/${s.replace(/^\.?\/+/, "")}`;
};

export const ClubLogo = ({ src, alt, size = "md", className, loading = "lazy", fetchPriority = "auto" }: ClubLogoProps) => {
  const [error, setError] = useState(false);
  const normalizedSrc = typeof src === "string" ? normalizeLogoSrc(src) : src;

  /* ═══════════════════════════════════════════════════════════
      MÓDULO: RENDERIZAÇÃO DE FALLBACK (ERRO OU AUSÊNCIA)
     ═══════════════════════════════════════════════════════════ */

  if (!normalizedSrc || error) {

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

  /* ═══════════════════════════════════════════════════════════
      MÓDULO: RENDERIZAÇÃO DA IMAGEM (WIKIMEDIA COMPLIANT)
     ═══════════════════════════════════════════════════════════ */

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
        src={normalizedSrc}

        alt={alt}
        className="w-full h-full object-contain p-0.5"
        referrerPolicy="no-referrer"
        onError={() => setError(true)}
        loading={loading}
        // @ts-expect-error fetchpriority é atributo HTML válido, suportado em React 18.3+
        fetchpriority={fetchPriority}
      />
    </div>
  );
};

/**
 * [RODAPÉ TÉCNICO]
 * Versão: 2.1 - Adicionado suporte a múltiplos fallbacks (API-Football + Wikimedia)
 */