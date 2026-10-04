/**
 * [CAMINHO]: src/components/entrar/reasonCards.tsx
 * [MÓDULO]: Cartões "Por que pedimos" que o torcedor vê DEPOIS de votar, um de cada vez.
 * Os textos ficam em src/locales/*.json (entrar.reason_*), então valem para pt, en e es.
 * Usado (a) na simulação do Master (?sim=1) e (b) no cartão real de nascimento/gênero do Dashboard.
 */
import { Briefcase, Cake, MapPin, Megaphone, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import FormReasonCard from "@/components/FormReasonCard";
import { useTranslationApp } from "@/hooks/useTranslationApp";

export type ReasonCardId = "basics" | "territory" | "socio" | "amb";

export const REASON_CARDS: { id: ReasonCardId; icon: LucideIcon; key: string }[] = [
  { id: "basics", icon: Cake, key: "basics" },
  { id: "territory", icon: MapPin, key: "territory" },
  { id: "socio", icon: Briefcase, key: "socio" },
  { id: "amb", icon: Megaphone, key: "amb" },
];

export function ReasonCard({
  id,
  step,
  children,
}: {
  id: ReasonCardId;
  step?: string;
  children?: ReactNode;
}) {
  const { t } = useTranslationApp();
  const def = REASON_CARDS.find((c) => c.id === id)!;
  const k = def.key;
  return (
    <FormReasonCard
      icon={def.icon}
      step={step}
      title={t(`entrar.reason_${k}_title`)}
      subtitle={t(`entrar.reason_${k}_sub`)}
      reasons={[t(`entrar.reason_${k}_1`), t(`entrar.reason_${k}_2`), t(`entrar.reason_${k}_3`)]}
    >
      {children}
    </FormReasonCard>
  );
}
