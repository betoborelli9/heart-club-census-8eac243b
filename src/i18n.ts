/**
 * ═══════════════════════════════════════════════════════════════════
 * [CAMINHO]: src/i18n.ts
 * [MÓDULO]: I18N — ETAPA 1 (Preparação da estrutura)
 * [STATUS]: Inicialização base. Detecta idioma do navegador.
 *           Fallback: pt. Suportados: pt, en, es.
 * ═══════════════════════════════════════════════════════════════════
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import pt from "./locales/pt.json";
import en from "./locales/en.json";
import es from "./locales/es.json";

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      pt: { translation: pt },
      en: { translation: en },
      es: { translation: es },
    },
    fallbackLng: "pt",
    supportedLngs: ["pt", "en", "es"],
    nonExplicitSupportedLngs: true, // pt-BR -> pt, en-US -> en, es-AR -> es
    load: "languageOnly",
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
    },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    returnEmptyString: false,
  });

export default i18n;
