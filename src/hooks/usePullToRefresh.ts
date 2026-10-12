/**
 * [CAMINHO]: src/hooks/usePullToRefresh.ts
 * [MÓDULO]: "Puxar para atualizar" como nos apps: só dispara quando a página está no topo e o dedo desce além do limite.
 * Não interfere na rolagem normal (só observa os toques).
 */
import { useEffect, useRef, useState } from "react";

export function usePullToRefresh(onRefresh: () => Promise<unknown> | unknown, threshold = 64) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const pullRef = useRef(0);
  const cb = useRef(onRefresh);
  cb.current = onRefresh;

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      startY.current = window.scrollY <= 0 ? e.touches[0].clientY : null;
    };
    const onMove = (e: TouchEvent) => {
      if (startY.current == null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0 && window.scrollY <= 0) {
        pullRef.current = Math.min(dy * 0.5, 110);
        setPull(pullRef.current);
      } else if (pullRef.current) {
        pullRef.current = 0;
        setPull(0);
      }
    };
    const onEnd = async () => {
      const was = pullRef.current;
      startY.current = null;
      pullRef.current = 0;
      setPull(0);
      if (was >= threshold) {
        setRefreshing(true);
        try {
          await cb.current();
        } finally {
          setRefreshing(false);
        }
      }
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [threshold]);

  return { pull, refreshing, ready: pull >= threshold };
}
