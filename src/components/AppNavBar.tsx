/**
 * 📁 src/components/AppNavBar.tsx
 * 🧭 Barra de navegação inferior unificada — links para todas as páginas principais.
 * Aparece em Dashboard, Stats, MapaCalor, Embaixadores etc.
 */

import { NavLink } from "react-router-dom";
import { Home, Trophy, Map, Users, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { to: "/dashboard", label: "Início", icon: Home },
  { to: "/stats", label: "Ranking", icon: Trophy },
  { to: "/mapa-calor", label: "Mapa de Calor", icon: Map },
  { to: "/embaixadores", label: "Embaixadores", icon: Users },
  { to: "/embaixador", label: "Painel", icon: Megaphone },
];

export default function AppNavBar() {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-black/95 backdrop-blur border-t border-primary/30"
      aria-label="Navegação principal"
    >
      <ul className="max-w-6xl mx-auto flex justify-around items-stretch">
        {ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 px-1 text-[10px] font-black italic transition",
                  isActive
                    ? "text-primary"
                    : "text-white/60 hover:text-white"
                )
              }
            >
              <Icon className="h-5 w-5" />
              <span className="tracking-wide">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
