/**
 * [CAMINHO]: src/components/jogos/DayStrip.tsx
 * [MÓDULO]: Faixa de dias rolável (3 dias atrás até 7 à frente), com o dia escolhido sempre visível no centro.
 */
import { useEffect, useRef } from "react";
import { useTranslationApp } from "@/hooks/useTranslationApp";

export const DAY_OFFSETS = [-3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7];

export default function DayStrip({ offset, onChange }: { offset: number; onChange: (o: number) => void }) {
  const { t, language } = useTranslationApp();
  const refs = useRef<Record<number, HTMLButtonElement | null>>({});

  useEffect(() => {
    refs.current[offset]?.scrollIntoView?.({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [offset]);

  const label = (o: number) => {
    if (o === 0) return t("jogos.today");
    if (o === 1) return t("jogos.tomorrow");
    if (o === -1) return t("jogos.yesterday");
    const d = new Date();
    d.setDate(d.getDate() + o);
    return d.toLocaleDateString(language, { weekday: "short" }).replace(".", "");
  };
  const num = (o: number) => {
    const d = new Date();
    d.setDate(d.getDate() + o);
    return d.toLocaleDateString(language, { day: "2-digit", month: "2-digit" });
  };

  return (
    <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-3 pb-2" role="tablist" aria-label="dias" data-testid="day-strip">
      {DAY_OFFSETS.map((o) => (
        <button
          key={o}
          ref={(el) => (refs.current[o] = el)}
          role="tab"
          aria-selected={offset === o}
          onClick={() => onChange(o)}
          className={`flex h-14 min-w-[58px] shrink-0 flex-col items-center justify-center rounded-xl text-[11px] font-black uppercase leading-tight transition ${
            offset === o ? "bg-primary text-white shadow-[0_0_14px_rgba(255,98,0,0.4)]" : "bg-white/[0.06] text-white/60"
          }`}
        >
          <span>{label(o)}</span>
          <span className={`text-[11px] font-semibold tabular-nums ${offset === o ? "text-white/90" : "text-white/40"}`}>{num(o)}</span>
        </button>
      ))}
    </div>
  );
}
