/**
 * 📁 src/lib/club-logo-resolver.ts
 * 🎯 Resolve escudo_url de clubes a partir de nome, consultando clubes_cache.
 * Mantém cache em memória para evitar requisições repetidas.
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const normalize = (v: string) =>
  (v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

const memoryCache = new Map<string, string>(); // normalized name -> escudo_url
const pending = new Map<string, Promise<void>>();

async function fetchLogos(names: string[]): Promise<void> {
  const missing = names.filter((n) => n && !memoryCache.has(normalize(n)));
  if (missing.length === 0) return;

  const key = missing.sort().join("|");
  if (pending.has(key)) return pending.get(key);

  const promise = (async () => {
    try {
      const { data } = await supabase
        .from("clubes_cache")
        .select("nome, escudo_url")
        .in("nome", missing);
      (data || []).forEach((row: any) => {
        if (row.escudo_url) memoryCache.set(normalize(row.nome), row.escudo_url);
      });
      // Tentativa case-insensitive para nomes que não casaram exatamente
      const stillMissing = missing.filter((n) => !memoryCache.has(normalize(n)));
      if (stillMissing.length > 0) {
        const { data: data2 } = await supabase
          .from("clubes_cache")
          .select("nome, escudo_url")
          .or(stillMissing.map((n) => `nome.ilike.${n}`).join(","));
        (data2 || []).forEach((row: any) => {
          if (row.escudo_url) memoryCache.set(normalize(row.nome), row.escudo_url);
        });
      }
      // BLINDAGEM: para nomes ainda sem escudo, aciona o resolver em cascata
      // (Supabase → API-Football → Wikipedia) via edge function.
      const finalMissing = missing.filter((n) => !memoryCache.has(normalize(n)));
      if (finalMissing.length > 0) {
        await Promise.all(
          finalMissing.map(async (n) => {
            try {
              const { data: r } = await supabase.functions.invoke("resolve-club-logo", {
                body: { clubName: n },
              });
              const url = (r as any)?.url as string | undefined;
              if (url) memoryCache.set(normalize(n), url);
            } catch {}
          }),
        );
      }
    } catch (err) {
      console.warn("[club-logo-resolver]", err);
    } finally {
      pending.delete(key);
    }
  })();

  pending.set(key, promise);
  return promise;
}

/**
 * Hook: recebe lista de nomes de clubes e devolve dicionário { nomeNormalizado: escudo_url }.
 */
export function useClubLogos(names: string[]): Record<string, string> {
  const [logos, setLogos] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    if (!names || names.length === 0) return;
    fetchLogos(names).then(() => {
      if (cancelled) return;
      const result: Record<string, string> = {};
      names.forEach((n) => {
        const url = memoryCache.get(normalize(n));
        if (url) result[normalize(n)] = url;
      });
      setLogos(result);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [names.join("|")]);

  return logos;
}

export function getCachedLogo(name: string): string | undefined {
  return memoryCache.get(normalize(name));
}

export const normalizeClubName = normalize;
