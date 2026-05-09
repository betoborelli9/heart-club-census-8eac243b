/**
 * [CAMINHO]: src/lib/vote-auditor.ts
 * [STATUS]: PRODUÇÃO - VERSÃO 7.0 (BLINDAGEM TOTAL)
 * [OBJETIVO]: Impedir votação em massa no mesmo local/dispositivo.
 */

import FingerprintJS from "@fingerprintjs/fingerprintjs";

/* ═══════════════════════════════════════════════════════════
    MÓDULO 1: DNA DO HARDWARE (MAIS RIGOROSO)
   ═══════════════════════════════════════════════════════════ */
export async function getFingerprint(): Promise<string> {
  try {
    const fp = await FingerprintJS.load();
    // Usamos o visitorId como base, mas ele precisa ser persistente
    const result = await fp.get();
    return result.visitorId;
  } catch {
    return "id-local-" + window.screen.width + window.screen.height;
  }
}

/* ═══════════════════════════════════════════════════════════
    MÓDULO 2: DNA DE REDE (A FONTE DA VERDADE)
   ═══════════════════════════════════════════════════════════ */
export async function getFastIP() {
  try {
    // Ipify é o mais estável para capturar o IP real do Wi-Fi
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    return data.ip || null;
  } catch { return null; }
}

/* ═══════════════════════════════════════════════════════════
    MÓDULO 3: AUDITORIA IMPLACÁVEL (DETECTOR DE MASSA)
   ═══════════════════════════════════════════════════════════ */
export async function runSilentAudit(supabase: any, voteId: string, clubName: string, ip: string | null, fp: string) {
  if (!ip) return; // Sem IP não há auditoria de rede

  // BUSCA QUALQUER VOTO REAL COM O MESMO IP (Independente do Fingerprint)
  const { data: duplicates } = await supabase
    .from("votos")
    .select("id, email, created_at")
    .eq("ip_address", ip)
    .neq("id", voteId) // Ignora o voto atual
    .neq("status_aprovacao", "ficticio")
    .limit(1);

  if (duplicates && duplicates.length > 0) {
    // Se achou alguém no mesmo IP, marca como SUSPEITO na hora
    await supabase.from("votos").update({
      is_suspicious: true,
      status_aprovacao: "pendente",
      motivo_suspicao: `Votação em massa detectada no IP: ${ip}`
    }).eq("id", voteId);
    
    console.log(`[AUDITORIA]: Voto ${voteId} marcado como suspeito por IP repetido.`);
  }
}

/* ═══════════════════════════════════════════════════════════
    MÓDULO 4: ENRIQUECIMENTO POSTAL
   ═══════════════════════════════════════════════════════════ */
export async function getFullAddress(cep: string) {
  const cleanCep = cep.replace(/\D/g, "");
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data = await res.json();
    if (data.erro) return null;
    return {
      bairro: data.bairro || "Não informado",
      cidade: data.localidade,
      estado: data.uf
    };
  } catch { return null; }
}

/**
 * [RODAPÉ TÉCNICO]
 * ARQUIVO: src/lib/vote-auditor.ts
 * VERSÃO: 7.0
 * - Prioridade absoluta ao IP para detecção de fraude em Wi-Fi compartilhado.
 * - Descarte de filtros que tornavam a busca "gentil" demais.
 */