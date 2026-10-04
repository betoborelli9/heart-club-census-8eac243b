/**
 * [CAMINHO]: src/components/dashboard/MasterAlerts.tsx
 * [MÓDULO]: Pacote de alertas do Master Admin no topo do Dashboard (API-Football + Supabase,
 * Lovable, termômetros do banco). Só é montado quando o usuário é o Master (ver Dashboard.tsx);
 * o banco também recusa qualquer outra pessoa nas RPCs usadas aqui.
 * Cada alerta fica isolado: se um deles der erro ao desenhar, some sozinho e NUNCA derruba o Dashboard.
 */
import { Component, type ReactNode } from "react";
import ApiHealthAlert from "@/components/dashboard/ApiHealthAlert";
import LovableCommitAlert from "@/components/dashboard/LovableCommitAlert";
import DbHealthThermometers from "@/components/dashboard/DbHealthThermometers";

class Isolated extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error("[MasterAlerts] alerta falhou ao desenhar:", error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function MasterAlerts() {
  return (
    <>
      <Isolated>
        <ApiHealthAlert />
      </Isolated>
      <Isolated>
        <LovableCommitAlert />
      </Isolated>
      <Isolated>
        <DbHealthThermometers />
      </Isolated>
    </>
  );
}
