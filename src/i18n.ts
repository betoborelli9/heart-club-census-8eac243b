/**
 * ═══════════════════════════════════════════════════════════════════
 * [CAMINHO]: src/i18n.ts
 * [MÓDULO]: I18N — ETAPA 6 (Auditoria Final + Automação)
 * [STATUS]: Detecção prioriza navigator (idioma do dispositivo),
 *           fallback pt. Suportados: pt, en, es (+ futuros: fr, ...).
 * [FORMATAÇÃO REGIONAL]: Intl.NumberFormat e Intl.DateTimeFormat
 *           expostos via i18next interpolation.format.
 * [ESCALABILIDADE]: Para adicionar um novo idioma (ex: fr):
 *   1) criar src/locales/fr.json (mesmas chaves)
 *   2) importar abaixo e incluir em `resources` + `supportedLngs`
 *   3) adicionar { code: "fr", label: "Français", flag: "🇫🇷" } no
 *      LanguageSwitcher e em SupportedLng (useTranslationApp.ts).
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
    nonExplicitSupportedLngs: true, // pt-BR -> pt, en-US -> en, es-CO -> es
    load: "languageOnly",
    detection: {
      // navigator primeiro: idioma do dispositivo (ex.: Colômbia → es) vence
      // sobre cache antigo apenas no primeiro acesso; após escolha manual,
      // o localStorage passa a prevalecer naturalmente via caches.
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
    },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    returnEmptyString: false,
  });

// ───────────────────────────────────────────────────────────────────
// Formatadores regionais (i18next v23+: services.formatter.add).
// Uso nas chaves de tradução:
//   {{value, number}}                → 1.000 (pt) / 1,000 (en)
//   {{value, number(minimumFractionDigits: 2)}}
//   {{value, date}}                  → 11/06/2026 (pt) / 6/11/2026 (en)
//   {{value, date(dateStyle: long)}} → 11 de junho de 2026
// ───────────────────────────────────────────────────────────────────
i18n.services.formatter?.add("number", (value, lng, opts) => {
  try {
    return new Intl.NumberFormat(lng || "pt", opts as Intl.NumberFormatOptions).format(Number(value));
  } catch {
    return String(value);
  }
});

i18n.services.formatter?.add("date", (value, lng, opts) => {
  try {
    const d = value instanceof Date ? value : new Date(value);
    return new Intl.DateTimeFormat(lng || "pt", opts as Intl.DateTimeFormatOptions).format(d);
  } catch {
    return String(value);
  }
});


export default i18n;
