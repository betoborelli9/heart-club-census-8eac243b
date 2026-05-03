/**
 * device-detect.ts
 * Captura silenciosa de modelo do dispositivo via User-Agent + UA Client Hints.
 * Não pergunta nada ao usuário. Retorna string curta (ex.: "iPhone 15", "Samsung SM-S921", "Pixel 8", "Android Phone").
 */
export async function detectDeviceModel(): Promise<string> {
  try {
    const ua = navigator.userAgent || "";

    // 1) UA Client Hints (Chrome/Edge/Android modernos) — mais preciso
    const navAny = navigator as any;
    if (navAny.userAgentData?.getHighEntropyValues) {
      try {
        const hints = await navAny.userAgentData.getHighEntropyValues(["model", "platform", "platformVersion"]);
        if (hints?.model && hints.model.length > 0) {
          return `${hints.platform || "Device"} ${hints.model}`.trim();
        }
        if (hints?.platform) {
          return `${hints.platform} ${hints.platformVersion || ""}`.trim();
        }
      } catch {/* ignore */}
    }

    // 2) iPhone / iPad / iPod (modelo exato não exposto pelo iOS — usa versão)
    if (/iPhone/i.test(ua)) {
      const m = ua.match(/iPhone OS (\d+)_/);
      return m ? `iPhone (iOS ${m[1]})` : "iPhone";
    }
    if (/iPad/i.test(ua)) return "iPad";
    if (/iPod/i.test(ua)) return "iPod";

    // 3) Android — extrai modelo entre parênteses
    if (/Android/i.test(ua)) {
      const m = ua.match(/Android[^;]*;\s*([^;)]+)\)/);
      const model = m?.[1]?.trim();
      if (model && !/wv|Build/i.test(model)) return model;
      return "Android Phone";
    }

    // 4) Desktop fallback
    if (/Macintosh/i.test(ua)) return "Mac";
    if (/Windows/i.test(ua)) return "Windows PC";
    if (/Linux/i.test(ua)) return "Linux PC";
    return "Desconhecido";
  } catch {
    return "Desconhecido";
  }
}
