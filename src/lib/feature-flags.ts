/**
 * Chavinhas por formulário (ligadas pelo Beto no Admin). Enquanto a chavinha
 * estiver DESLIGADA — ou se não for possível ler (ex.: Supabase lenta) — o site
 * se comporta exatamente como antes: nenhum card novo, nenhuma trava.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";

export type FlagKey = "form_termos" | "form_territorio" | "form_socio" | "form_embaixador";

export type FlagRow = {
  key: string;
  enabled: boolean;
  label: string;
  description: string | null;
};

const READ_TIMEOUT_MS = 6000;

export async function fetchFeatureFlags(): Promise<FlagRow[] | null> {
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), READ_TIMEOUT_MS),
    );
    const { data, error } = (await Promise.race([supabase.rpc("get_feature_flags" as any), timeout])) as any;
    if (error || !Array.isArray(data)) return null;
    return data as FlagRow[];
  } catch {
    return null;
  }
}

/** `enabled` só é true quando a leitura deu certo E a chavinha está ligada. */
export function useFeatureFlag(key: FlagKey): { enabled: boolean; ready: boolean } {
  const [state, setState] = useState({ enabled: false, ready: false });
  // No teste de "torcedor novo" do Master todos os cartões aparecem (para ele ver o que o torcedor verá).
  const { simActive } = useUser();

  useEffect(() => {
    let alive = true;
    fetchFeatureFlags().then((rows) => {
      if (!alive) return;
      setState({ enabled: !!rows?.find((r) => r.key === key)?.enabled, ready: true });
    });
    return () => {
      alive = false;
    };
  }, [key]);

  return simActive ? { enabled: true, ready: true } : state;
}
