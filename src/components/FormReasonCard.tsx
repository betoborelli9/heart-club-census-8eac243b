/**
 * Card padrão que aparece ANTES de qualquer formulário do censo: explica,
 * com carinho e clareza, POR QUE estamos pedindo aquele dado e o que o
 * torcedor ganha com isso — e reafirma a promessa de privacidade.
 */
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { CheckCircle2, ShieldCheck } from "lucide-react";

interface Props {
  icon: LucideIcon;
  /** Ex.: "Passo 2 de 4" */
  step?: string;
  title: string;
  subtitle?: string;
  /** Motivos curtos (o que o torcedor ganha / pra que serve). */
  reasons: string[];
  children?: ReactNode;
}

export const PRIVACY_PROMISE =
  "Seus dados nunca são repassados a ninguém. Parceiros só recebem números somados, nunca informações de uma pessoa.";

export default function FormReasonCard({ icon: Icon, step, title, subtitle, reasons, children }: Props) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/15 via-[#0b0b0b] to-[#0b0b0b] p-6 text-white">
      <div
        className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)" }}
      />

      <div className="relative space-y-5">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/40 shadow-[0_0_30px_-8px_hsl(var(--primary))]">
            <Icon className="h-7 w-7 text-primary" />
          </div>
          <div className="min-w-0">
            {step && (
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.25em] text-primary/80">{step}</p>
            )}
            <h2 className="text-xl font-black italic leading-tight tracking-tight">{title}</h2>
            {subtitle && <p className="mt-1 text-sm leading-snug text-white/60">{subtitle}</p>}
          </div>
        </div>

        <ul className="space-y-2.5">
          {reasons.map((r) => (
            <li key={r} className="flex items-start gap-2.5 text-sm leading-snug text-white/80">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{r}</span>
            </li>
          ))}
        </ul>

        {children}

        <div className="flex items-start gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-[12px] leading-snug text-white/65">{PRIVACY_PROMISE}</p>
        </div>
      </div>
    </div>
  );
}
