/**
 * 📁 src/hooks/useTranslationApp.ts
 * 🌐 Wrapper sobre react-i18next para centralizar uso de tradução no app.
 * - Não altera comportamento do i18next; apenas reexpõe helpers úteis.
 * - Uso: const { t, language, changeLanguage } = useTranslationApp();
 */

import { useTranslation } from "react-i18next";
import { useCallback } from "react";

export type SupportedLng = "pt" | "en" | "es";

export const useTranslationApp = (ns: string | string[] = "translation") => {
  const { t, i18n } = useTranslation(ns);

  const changeLanguage = useCallback(
    (lng: SupportedLng) => i18n.changeLanguage(lng),
    [i18n],
  );

  return {
    t,
    i18n,
    language: (i18n.language?.split("-")[0] as SupportedLng) || "pt",
    changeLanguage,
  };
};

export default useTranslationApp;
