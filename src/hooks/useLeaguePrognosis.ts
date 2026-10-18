/**
 * [CAMINHO]: src/hooks/useLeaguePrognosis.ts
 * [MÓDULO]: Probabilidades do campeonato (league-prognosis) que se RECALCULAM SOZINHAS quando o placar muda.
 *  • Gol ou fim de jogo no campeonato (tempo real do nosso banco, league_fixtures) → busca de novo em ~5 s.
 *  • Enquanto há jogo rolando: confere a cada 60 s (o servidor recalcula quando o placar muda ou a cada ~5 min de jogo).
 *  • Sem jogo ao vivo: nada de consulta extra (carrega uma vez; vale por 2 min entre telas).
 * Nada aqui chama a API de jogos: só o nosso servidor, que lê do nosso banco.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type AnyPayload = { supported?: boolean; groups?: { remaining?: { live?: unknown }[] }[]; error?: string } & Record<string, unknown>;

const CACHE = new Map<string, { at: number; data: AnyPayload }>();
const INFLIGHT = new Map<string, Promise<AnyPayload | null>>();
const FRESH_MS = 2 * 60 * 1000;
export const LIVE_POLL_MS = 60 * 1000;
export const GOAL_DEBOUNCE_MS = 5 * 1000;

/** Só para testes. */
export const clearPrognosisCache = () => {
  CACHE.clear();
  INFLIGHT.clear();
};

export const hasLiveGame = (d: AnyPayload | null | undefined) => !!d?.groups?.some((g) => g.remaining?.some((r) => !!r.live));

async function fetchPrognosis(leagueId: number, season: number, force: boolean): Promise<AnyPayload | null> {
  const key = `${leagueId}:${season}`;
  const hit = CACHE.get(key);
  if (!force && hit && Date.now() - hit.at < FRESH_MS) return hit.data;
  const running = INFLIGHT.get(key);
  if (running) return running;
  const p = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke("league-prognosis", { body: { leagueId, season } });
      if (error || !data || (data as any).error) return null;
      CACHE.set(key, { at: Date.now(), data: data as AnyPayload });
      return data as AnyPayload;
    } catch {
      return null;
    } finally {
      INFLIGHT.delete(key);
    }
  })();
  INFLIGHT.set(key, p);
  return p;
}

export function useLeaguePrognosis<T extends AnyPayload = AnyPayload>(leagueId: number | null | undefined, season: number | null | undefined, enabled = true) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState(false);
  const alive = useRef(true);
  const dataRef = useRef<T | null>(null);
  dataRef.current = data;

  const load = useCallback(
    async (force: boolean) => {
      if (!leagueId || !season) return;
      const res = await fetchPrognosis(leagueId, season, force);
      if (!alive.current) return;
      if (res) {
        setData(res as T);
        setError(false);
      } else if (!dataRef.current) {
        setError(true); // só mostra erro se ainda não temos nada; falha numa atualização mantém o que já está na tela
      }
    },
    [leagueId, season],
  );

  // 1) carga inicial (e quando troca de campeonato)
  useEffect(() => {
    alive.current = true;
    if (!enabled || !leagueId || !season) return;
    const hit = CACHE.get(`${leagueId}:${season}`);
    setData(hit && Date.now() - hit.at < FRESH_MS ? (hit.data as T) : null);
    setError(false);
    void load(false);
    return () => {
      alive.current = false;
    };
  }, [leagueId, season, enabled, load]);

  // 2) tempo real: gol / fim de jogo / mudança de status neste campeonato → recalcula em ~5 s
  useEffect(() => {
    if (!enabled || !leagueId || !season) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let channel: any = null;
    try {
      const sb = supabase as any;
      if (typeof sb.channel === "function") {
        channel = sb
          .channel(`prog-${leagueId}-${season}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "league_fixtures", filter: `league_id=eq.${leagueId}` }, () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => void load(true), GOAL_DEBOUNCE_MS);
          })
          .subscribe();
      }
    } catch {
      channel = null; // sem tempo real: a conferência de 60 s abaixo cobre
    }
    return () => {
      if (timer) clearTimeout(timer);
      try {
        if (channel) (supabase as any).removeChannel(channel);
      } catch {
        /* nada */
      }
    };
  }, [leagueId, season, enabled, load]);

  // 3) com jogo rolando: confere a cada 60 s (só com a tela visível)
  const live = hasLiveGame(data);
  useEffect(() => {
    if (!enabled || !live) return;
    const id = setInterval(() => {
      if (typeof document === "undefined" || !document.hidden) void load(true);
    }, LIVE_POLL_MS);
    return () => clearInterval(id);
  }, [enabled, live, load]);

  return { data, error, live, refresh: () => load(true) };
}
