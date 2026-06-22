/**
 * [CAMINHO]: src/components/GlobalFooter.tsx
 * [DESCRIÇÃO]: Rodapé global com links LGPD (Privacidade, Termos, Gerenciar dados).
 * Oculto nas mesmas rotas de fluxo crítico (splash/login/voting).
 */
import { Link, useLocation } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

const HIDE_ROUTES = ["/", "/splash", "/login", "/verify", "/voting", "/profile-setup", "/convite"];

const GlobalFooter = () => {
  const { pathname } = useLocation();
  if (HIDE_ROUTES.includes(pathname)) return null;
  if (pathname.startsWith("/admin") || pathname.startsWith("/debug")) return null;

  return (
    <footer className="mt-12 border-t border-border/30 bg-black/40 px-4 py-6 text-center text-xs text-muted-foreground">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <span className="inline-flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Heart Club © {new Date().getFullYear()}
        </span>
        <Link to="/privacidade" className="hover:text-primary transition-colors">
          Política de Privacidade
        </Link>
        <Link to="/termos" className="hover:text-primary transition-colors">
          Termos de Uso
        </Link>
        <Link to="/gerenciar-dados" className="hover:text-primary transition-colors">
          Gerenciar meus Dados
        </Link>
      </div>
      <p className="mt-2 opacity-60">Em conformidade com a LGPD (Lei 13.709/2018).</p>
    </footer>
  );
};

export default GlobalFooter;
