import { describe, expect, it } from "vitest";
import { buildChromeIntentUrl, detectInAppBrowser } from "./in-app-browser";

const UA = {
  instaAndroid:
    "Mozilla/5.0 (Linux; Android 13; SM-A546E Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 Instagram 310.0.0.37.108 Android (33/13; 480dpi; 1080x2340; samsung; SM-A546E; a54x; s5e8835; pt_BR; 543872300)",
  instaIphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21C62 Instagram 312.0.0.22.114 (iPhone14,5; iOS 17_2; pt_BR; pt-BR; scale=3.00; 1170x2532; 548419712)",
  facebookAndroid:
    "Mozilla/5.0 (Linux; Android 12; Pixel 6 Build/SQ3A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/119.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/440.0.0.30.113;]",
  facebookIphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21B91 [FBAN/FBIOS;FBAV/440.0.0.31.113;FBBV/500;FBDV/iPhone14,2;FBMD/iPhone;FBSN/iOS;FBSV/17.1;FBSS/3;FBID/phone;FBLC/pt_BR]",
  tiktok:
    "Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36 musical_ly_30.1.0 JsSdk/2.0 NetType/WIFI Channel/googleplay AppName/musical_ly app_version/30.1.0",
  line: "Mozilla/5.0 (Linux; Android 11; SM-A515F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Mobile Safari/537.36 Line/12.1.0 LIFF",
  chromeAndroid:
    "Mozilla/5.0 (Linux; Android 13; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  safariIphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
  desktop: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  linux: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

describe("detectInAppBrowser", () => {
  it("reconhece Instagram, Facebook, TikTok e Line", () => {
    expect(detectInAppBrowser(UA.instaAndroid)).toEqual({ inApp: true, platform: "android" });
    expect(detectInAppBrowser(UA.instaIphone)).toEqual({ inApp: true, platform: "ios" });
    expect(detectInAppBrowser(UA.facebookAndroid)).toEqual({ inApp: true, platform: "android" });
    expect(detectInAppBrowser(UA.facebookIphone)).toEqual({ inApp: true, platform: "ios" });
    expect(detectInAppBrowser(UA.tiktok).inApp).toBe(true);
    expect(detectInAppBrowser(UA.line).inApp).toBe(true);
  });

  it("não confunde navegadores de verdade (Chrome, Safari, computador, Linux)", () => {
    expect(detectInAppBrowser(UA.chromeAndroid)).toEqual({ inApp: false, platform: "android" });
    expect(detectInAppBrowser(UA.safariIphone)).toEqual({ inApp: false, platform: "ios" });
    expect(detectInAppBrowser(UA.desktop).inApp).toBe(false);
    expect(detectInAppBrowser(UA.linux).inApp).toBe(false);
  });

  it("sem user agent não quebra", () => {
    expect(detectInAppBrowser("").inApp).toBe(false);
  });
});

describe("buildChromeIntentUrl", () => {
  it("monta o intent do Chrome com o mesmo endereço", () => {
    const url = buildChromeIntentUrl("https://www.votenoseutime.com.br/entrar?pv=abc_-1#topo");
    expect(url.startsWith("intent://www.votenoseutime.com.br/entrar?pv=abc_-1#Intent;scheme=https;package=com.android.chrome;")).toBe(true);
    expect(url.endsWith(";end")).toBe(true);
    // sem o Chrome instalado, abre o endereço normal
    expect(url).toContain("S.browser_fallback_url=" + encodeURIComponent("https://www.votenoseutime.com.br/entrar?pv=abc_-1"));
  });
});
