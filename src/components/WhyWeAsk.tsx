/**
 * Textinho curto e calmo explicando PRA QUE serve o dado que estamos
 * pedindo, mostrado antes de qualquer formulário do censo (voto,
 * perfil, mapa de calor etc). Objetivo: nunca parecer burocracia sem
 * explicação — sempre dizer o porquê antes de pedir.
 */
import { Info } from "lucide-react";

export default function WhyWeAsk({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-primary/5 border border-primary/15 text-xs text-muted-foreground leading-relaxed">
      <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
      <p>{children}</p>
    </div>
  );
}
