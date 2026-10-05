/**
 * [CAMINHO]: src/components/TermsGuard.tsx
 * [MÓDULO]: Porteiro dos Termos (fluxo novo): quem já votou mas ainda NÃO aceitou os Termos de Uso e a
 * Política de Privacidade só entra no site depois de aceitar. Em qualquer página protegida ele é levado
 * para /confirmar-voto, que mostra só o quadradinho dos Termos. Vale também quando o torcedor volta depois.
 * Inativo enquanto NEW_ENTRY_FLOW_ENABLED = false (o público segue no fluxo antigo) e nunca atua no Master.
 */
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { NEW_ENTRY_FLOW_ENABLED } from "@/lib/entry-flow";
import { isMasterEmail } from "@/lib/master";

// Páginas que continuam abertas: entrada, login, leitura dos próprios Termos e a tela de aceite.
const OPEN_PATHS = ["/", "/entrar", "/confirmar-voto", "/login", "/verify", "/voting", "/splash", "/convite", "/termos", "/privacidade", "/profile-setup"];

export default function TermsGuard() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, realUser, profile, isAuthReady, isLoading, hasVoted, simActive } = useUser();

  useEffect(() => {
    if (!NEW_ENTRY_FLOW_ENABLED || simActive) return;
    if (!isAuthReady || isLoading || !user || !profile || !hasVoted) return;
    if (isMasterEmail((realUser ?? user).email)) return;
    if (OPEN_PATHS.includes(pathname) || pathname.startsWith("/admin") || pathname.startsWith("/master")) return;
    if (!(profile as any).terms_accepted_at) navigate("/confirmar-voto", { replace: true });
  }, [pathname, user, realUser, profile, isAuthReady, isLoading, hasVoted, simActive, navigate]);

  return null;
}
