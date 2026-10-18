// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

const state: { payload: any; invokes: number; handlers: ((p: any) => void)[]; removed: number } = { payload: null, invokes: 0, handlers: [], removed: 0 };

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: () => {
        state.invokes++;
        return Promise.resolve({ data: JSON.parse(JSON.stringify(state.payload)), error: null });
      },
    },
    channel: () => {
      const ch: any = {
        on: (_e: string, _f: any, cb: (p: any) => void) => {
          state.handlers.push(cb);
          return ch;
        },
        subscribe: () => ch,
      };
      return ch;
    },
    removeChannel: () => {
      state.removed++;
    },
  },
}));

import { clearPrognosisCache, GOAL_DEBOUNCE_MS, hasLiveGame, LIVE_POLL_MS, useLeaguePrognosis } from "./useLeaguePrognosis";

const payload = (live: boolean, pts = 10) => ({
  supported: true,
  groups: [{ teams: [{ id: 1, points: pts }], remaining: [{ id: 5, live: live ? { gh: 1, ga: 0, el: 60, st: "2H" } : null }] }],
});

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe("probabilidades que se recalculam sozinhas", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearPrognosisCache();
    state.invokes = 0;
    state.handlers = [];
    state.removed = 0;
  });
  afterEach(() => vi.useRealTimers());

  it("hasLiveGame: só é verdade quando algum jogo que falta está ao vivo", () => {
    expect(hasLiveGame(payload(true) as any)).toBe(true);
    expect(hasLiveGame(payload(false) as any)).toBe(false);
    expect(hasLiveGame(null)).toBe(false);
  });

  it("sem jogo ao vivo: carrega uma vez e não consulta de novo sozinho", async () => {
    state.payload = payload(false);
    const { result } = renderHook(() => useLeaguePrognosis(72, 2026));
    await flush();
    expect(result.current.data).toBeTruthy();
    expect(state.invokes).toBe(1);
    await act(async () => {
      vi.advanceTimersByTime(LIVE_POLL_MS * 3);
    });
    expect(state.invokes).toBe(1);
  });

  it("com jogo ao vivo: busca de novo a cada 60 s e a tela recebe os números novos", async () => {
    state.payload = payload(true, 10);
    const { result } = renderHook(() => useLeaguePrognosis<any>(72, 2026));
    await flush();
    expect(result.current.live).toBe(true);
    expect(result.current.data.groups[0].teams[0].points).toBe(10);
    state.payload = payload(true, 13); // mudou o placar no servidor
    await act(async () => {
      vi.advanceTimersByTime(LIVE_POLL_MS);
    });
    await flush();
    expect(state.invokes).toBe(2);
    expect(result.current.data.groups[0].teams[0].points).toBe(13);
  });

  it("gol ou mudança de placar de QUALQUER jogo do campeonato (tempo real): recalcula em ~5 s, juntando vários eventos seguidos", async () => {
    state.payload = payload(false, 10);
    const { result } = renderHook(() => useLeaguePrognosis<any>(72, 2026));
    await flush();
    expect(state.invokes).toBe(1);
    expect(state.handlers.length).toBe(1);
    state.payload = payload(true, 12);
    state.handlers[0]({}); // gol em outro jogo
    state.handlers[0]({}); // outro evento logo em seguida: não duplica a busca
    await act(async () => {
      vi.advanceTimersByTime(GOAL_DEBOUNCE_MS - 100);
    });
    expect(state.invokes).toBe(1);
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    await flush();
    expect(state.invokes).toBe(2);
    expect(result.current.data.groups[0].teams[0].points).toBe(12);
  });

  it("só o minuto andando não recalcula; gol e mudança de status (intervalo, fim de jogo) recalculam", async () => {
    state.payload = payload(true, 10);
    renderHook(() => useLeaguePrognosis<any>(72, 2026));
    await flush();
    const ev = (status: string, gh: number, ga: number) => ({ new: { fixture_id: 7, status, goals_home: gh, goals_away: ga, elapsed: 50 } });
    const fire = async (e: any) => {
      state.handlers[0](e);
      await act(async () => {
        vi.advanceTimersByTime(GOAL_DEBOUNCE_MS + 100);
      });
      await flush();
    };
    await fire(ev("2H", 0, 0)); // primeiro evento do jogo: não há como comparar, busca uma vez
    const afterFirst = state.invokes;
    await fire(ev("2H", 0, 0)); // só o relógio andou
    await fire(ev("2H", 0, 0));
    expect(state.invokes).toBe(afterFirst);
    await fire(ev("2H", 1, 0)); // gol
    expect(state.invokes).toBe(afterFirst + 1);
    await fire(ev("FT", 1, 0)); // fim de jogo
    expect(state.invokes).toBe(afterFirst + 2);
  });

  it("falha numa atualização mantém o que já está na tela (não vira tela de erro)", async () => {
    state.payload = payload(true, 10);
    const { result } = renderHook(() => useLeaguePrognosis<any>(72, 2026));
    await flush();
    state.payload = { error: "internal" };
    await act(async () => {
      vi.advanceTimersByTime(LIVE_POLL_MS);
    });
    await flush();
    expect(result.current.error).toBe(false);
    expect(result.current.data.groups[0].teams[0].points).toBe(10);
  });

  it("ao sair da tela, o canal em tempo real é fechado", async () => {
    state.payload = payload(false);
    const { unmount } = renderHook(() => useLeaguePrognosis(72, 2026));
    await flush();
    unmount();
    expect(state.removed).toBe(1);
  });
});
