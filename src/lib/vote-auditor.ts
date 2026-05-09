/**
 * [CAMINHO]: src/lib/vote-auditor.ts
 * [MÓDULO]: AUDITORIA DE IDENTIDADE (GPS, IP, FINGERPRINT, CEP)
 * [OBJETIVO]: Centralizar verificação de fraudes e histórico de votos reais.
 */

import FingerprintJS from "@fingerprintjs/fingerprintjs";

export interface VoteIdentity {
  fingerprint: string;
  ip_address: string | null;
  isp: string | null;
  lat: number | null;
  lng: number | null;
  bairro: string | null;
  cep: string | null;
}

// --- MÓDULO 1: IDENTIDADE DO HARDWARE ---
export async function getFingerprint(): Promise<string> {
  const fp = await FingerprintJS.load();
  const result = await fp.get();
  return result.visitorId;
}

// --- MÓDULO 2: IDENTIDADE DE REDE (WIFI/ISP) ---
export async function getNetworkData() {
  try {
    const res = await fetch("https://ipapi.co/json/");
    const data = await res.json();
    return {
      ip: data.ip || null,
      isp: data.org || null // Aqui pega o nome do WiFi/Provedor
    };
  } catch (error) {
    console.error("Erro ao capturar rede", error);
    return { ip: null, isp: null };
  }
}

// --- MÓDULO 3: GEOLOCALIZAÇÃO (GPS) ---
export async function getGpsCoords(): Promise<{lat: number, lng: number} | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { timeout: 5000 }
    );
  });
}

// --- MÓDULO 4: LOCALIZAÇÃO POSTAL (CEP/BAIRRO) ---
export async function getPostalData(cep: string) {
  const cleanCep = cep.replace(/\D/g, "");
  if (cleanCep.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    return await res.json();
  } catch { return null; }
}

// --- MÓDULO 5: AUDITORIA HISTÓRICA (A SEQUÊNCIA QUE O MODERADOR VÊ) ---
export async function auditRealVote(supabase: any, clubName: string, identity: VoteIdentity) {
  // Busca votos anteriores do mesmo clube vindos do mesmo IP ou Aparelho
  const { data: history } = await supabase
    .from("votos")
    .select("id, created_at, email")
    .eq("clube_nome", clubName)
    .neq("status_integridade", "ficticio") // ISOLA TOTALMENTE OS FICTÍCIOS
    .or(`fingerprint.eq.${identity.fingerprint},ip_address.eq.${identity.ip_address}`)
    .order('created_at', { ascending: false });

  return {
    isSuspicious: history && history.length > 0,
    history: history || []
  };
}