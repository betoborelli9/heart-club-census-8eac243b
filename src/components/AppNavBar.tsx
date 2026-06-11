/**
 * 📁 src/components/AppNavBar.tsx
 * 🧭 Barra de navegação inferior unificada — links para todas as páginas principais.
 */

import { NavLink } from "react-router-dom";
import { Home, Trophy, Map, Users, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslationApp } from "@/hooks/useTranslationApp";

export default function AppNavBar() {
  const { t } = useTranslationApp();
  const ITEMS = [
    { to: "/dashboard", label: t("navbar.home"), shortLabel: t("navbar.home"), icon: Home },
    { to: "/stats", label: t("navbar.ranking"), shortLabel: t("navbar.ranking"), icon: Trophy },
    { to: "/mapa-calor", label: t("navbar.map_long"), shortLabel: t("navbar.map"), icon: Map },
    { to: "/embaixadores", label: t("navbar.ambassadors_long"), shortLabel: t("navbar.ambassadors_short"), icon: Users },
    { to: "/embaixador", label: t("navbar.panel"), shortLabel: t("navbar.panel"), icon: Megaphone },
  ];

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-black/95 backdrop-blur border-t border-primary/30"
      aria-label={t("navbar.aria")}
    >
      <ul className="max-w-6xl mx-auto flex justify-around items-stretch">
        {ITEMS.map(({ to, label, shortLabel, icon: Icon }) => (
          <li key={to} className="flex-1 min-w-0">
            <NavLink
              to={to}
              end
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 px-0.5 text-[9px] sm:text-[10px] font-black italic transition leading-tight",
                  isActive
                    ? "text-primary"
                    : "text-white/70 hover:text-white"
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="tracking-tight text-center w-full truncate block sm:hidden">{shortLabel}</span>
              <span className="tracking-wide hidden sm:inline">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
