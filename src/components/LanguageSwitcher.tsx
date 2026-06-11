/**
 * 📁 src/components/LanguageSwitcher.tsx
 * 🌐 Seletor de idioma (PT / EN / ES) — Etapa 4 i18n
 * - Usa useTranslationApp (wrapper sobre react-i18next)
 * - Persistência via i18next-browser-languagedetector (localStorage: i18nextLng)
 * - Sem refresh, sem alteração de URL
 */
import { Languages, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslationApp, type SupportedLng } from "@/hooks/useTranslationApp";

const LANGS: { code: SupportedLng; label: string; flag: string }[] = [
  { code: "pt", label: "Português", flag: "🇧🇷" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "es", label: "Español", flag: "🇪🇸" },
];

const LanguageSwitcher = () => {
  const { t, language, changeLanguage } = useTranslationApp();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("language.aria")}
          title={t("language.label")}
          className="text-white/80 hover:text-[#ff6200]"
        >
          <Languages className="w-5 h-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-black/95 border-white/10 text-white min-w-[180px]">
        <DropdownMenuLabel className="text-white/50 text-xs uppercase tracking-wider">
          {t("language.label")}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />
        {LANGS.map((lng) => {
          const active = language === lng.code;
          return (
            <DropdownMenuItem
              key={lng.code}
              onClick={() => changeLanguage(lng.code)}
              className="cursor-pointer focus:bg-white/10 focus:text-white"
            >
              <span className="mr-2">{lng.flag}</span>
              <span className="flex-1">{lng.label}</span>
              {active && <Check className="w-4 h-4 text-[#ff6200]" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
