/**
 * [CAMINHO]: src/lib/address.ts
 * [STATUS]: PRODUÇÃO - VERSÃO 1.0
 * [CONTEXTO]: Helpers para captura de endereço (ViaCEP) e auditoria silenciosa (GPS + reverse geocoding).
 *
 * Uso:
 *  - lookupCep("01310-100") → { cidade, estado, bairro, logradouro }
 *  - captureGpsAudit() → { lat, lng, voto_bairro_gps, voto_cidade_gps } (silencioso, falha vira null)
 */

export interface CepResult {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  estado: string;
  ibge?: string;
}

export interface GpsAudit {
  lat: number | null;
  lng: number | null;
  voto_bairro_gps: string | null;
  voto_cidade_gps: string | null;
}

/* ═══════════════════════════════════════════════════════════
   ViaCEP — somente Brasil. Aceita CEP com ou sem hífen.
   ═══════════════════════════════════════════════════════════ */
export async function lookupCep(cepRaw: string): Promise<CepResult | null> {
  const cep = (cepRaw || "").replace(/\D/g, "");
  if (cep.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.erro) return null;
    return {
      cep,
      logradouro: data.logradouro || "",
      bairro: data.bairro || "",
      cidade: data.localidade || "",
      estado: data.uf || "",
      ibge: data.ibge,
    };
  } catch {
    return null;
  }
}

export function formatCep(value: string): string {
  const digits = (value || "").replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

/* ═══════════════════════════════════════════════════════════
   GPS de auditoria silenciosa (Nominatim reverse geocoding).
   Falhas (permissão negada, timeout, offline) retornam nulls
   — NUNCA bloqueiam o voto.
   ═══════════════════════════════════════════════════════════ */
export async function captureGpsAudit(timeoutMs = 6000): Promise<GpsAudit> {
  const empty: GpsAudit = { lat: null, lng: null, voto_bairro_gps: null, voto_cidade_gps: null };
  if (typeof navigator === "undefined" || !navigator.geolocation) return empty;

  const coords = await new Promise<GeolocationCoordinates | null>((resolve) => {
    const tid = setTimeout(() => resolve(null), timeoutMs + 500);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(tid);
        resolve(pos.coords);
      },
      () => {
        clearTimeout(tid);
        resolve(null);
      },
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60000 },
    );
  });

  if (!coords) return empty;
  const { latitude, longitude } = coords;

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=pt-BR`,
      { headers: { "User-Agent": "HeartClubApp/1.0" } },
    );
    if (!res.ok) {
      return { lat: latitude, lng: longitude, voto_bairro_gps: null, voto_cidade_gps: null };
    }
    const data = await res.json();
    const a = data.address || {};
    const bairro =
      a.suburb || a.neighbourhood || a.quarter || a.city_district || a.borough || a.hamlet || null;
    const cidade = a.city || a.town || a.municipality || a.village || null;
    return {
      lat: latitude,
      lng: longitude,
      voto_bairro_gps: bairro,
      voto_cidade_gps: cidade,
    };
  } catch {
    return { lat: latitude, lng: longitude, voto_bairro_gps: null, voto_cidade_gps: null };
  }
}
