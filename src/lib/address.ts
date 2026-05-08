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
   GPS de auditoria silenciosa — DEPRECADO.
   O app agora usa exclusivamente captureIpAudit() (IP-based,
   sem prompt de permissão do navegador).
   Mantido apenas como stub no-op para retrocompatibilidade.
   ═══════════════════════════════════════════════════════════ */
export async function captureGpsAudit(): Promise<GpsAudit> {
  return { lat: null, lng: null, voto_bairro_gps: null, voto_cidade_gps: null };
}

/* ═══════════════════════════════════════════════════════════
   Captura geográfica via IP (edge function geo-ip → ip-api.com).
   Nunca pede permissão ao navegador. Falha vira nulls.
   ═══════════════════════════════════════════════════════════ */
export interface IpAudit {
  ip: string | null;
  continente: string | null;
  pais: string | null;
  estado: string | null;
  cidade: string | null;
  bairro: string | null;
  lat: number | null;
  lng: number | null;
  isp: string | null;
}

export async function captureIpAudit(): Promise<IpAudit> {
  const empty: IpAudit = {
    ip: null, continente: null, pais: null, estado: null,
    cidade: null, bairro: null, lat: null, lng: null, isp: null,
  };
  try {
    const projectId = (import.meta as any).env?.VITE_SUPABASE_PROJECT_ID;
    if (!projectId) return empty;
    const res = await fetch(`https://${projectId}.supabase.co/functions/v1/geo-ip`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return empty;
    const j = await res.json();
    return { ...empty, ...j };
  } catch {
    return empty;
  }
}

