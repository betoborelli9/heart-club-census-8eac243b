/**
 * [CAMINHO]: src/lib/in-app-browser.ts
 * [MÓDULO]: Detecta o navegador interno de aplicativos (Instagram, Facebook, TikTok, Line…).
 * O Google bloqueia o login (OAuth) nesses navegadores ("disallowed_useragent"), então a tela de entrada
 * esconde o botão do Google e oferece abrir no Chrome (Android) ou no navegador do iPhone.
 */

export type InAppBrowserInfo = {
  inApp: boolean;
  platform: "android" | "ios" | "other";
};

// Instagram, Facebook (FBAN/FBAV/FB_IAB/FBIOS/FB4A), Messenger, TikTok (e o motor da ByteDance), Line, Snapchat, Twitter/X, LinkedIn, Pinterest, WeChat.
const IN_APP_PATTERN =
  /Instagram|FBAN|FBAV|FB_IAB|FBIOS|FB4A|FBSS|Messenger|musical_ly|TikTok|Bytedance|\bLine\/|Snapchat|Twitter|LinkedInApp|Pinterest|MicroMessenger/i;

export function detectInAppBrowser(userAgent?: string | null): InAppBrowserInfo {
  const ua = userAgent ?? (typeof navigator !== "undefined" ? navigator.userAgent : "") ?? "";
  const platform: InAppBrowserInfo["platform"] = /Android/i.test(ua)
    ? "android"
    : /iPhone|iPad|iPod/i.test(ua)
      ? "ios"
      : "other";
  return { inApp: IN_APP_PATTERN.test(ua), platform };
}

/**
 * Link que abre a MESMA página no Chrome do Android: intent://<host><caminho>#Intent;scheme=https;package=com.android.chrome;end
 * Se o Chrome não estiver instalado, o Android abre o endereço normal (S.browser_fallback_url).
 */
export function buildChromeIntentUrl(href: string): string {
  const url = new URL(href);
  const fallback = encodeURIComponent(url.origin + url.pathname + url.search);
  return `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${fallback};end`;
}
