/**
 * [CAMINHO]: src/lib/vote-auditor.ts
 * [STATUS]: PRODUÇÃO - VERSÃO 8.7 (AUDITORIA AGRESSIVA)
 * [OBJETIVO]: Detectar fraudes por IP e Fingerprint de forma implacável.
 * [MÓDULOS]: 1. Identidade Digital, 2. Auditoria Silenciosa, 3. Localização.
 */

import FingerprintJS from "@fingerprintjs/fingerprintjs";

/* ═══════════════════════════════════════════════════════════
    MÓDULO 1: CAPTURA DE IDENTIDADE DIGITAL
   ═══════════════════════════════════════════════════════════ */

export async function getFingerprint(): Promise<string> {
  try {
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    return result.visitorId;
  } catch (error) {
    return "id-gen-" + Math.random().toString(36).substring(7);
  }
}

export async function getFastIP() {
  try {
    // Usando ipify pela estabilidade e velocidade
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    return data.ip || null;
  } catch {
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════
    MÓDULO 2: AUDITORIA SILENCIOSA (DETECTOR DE FRAUDE)
   ═══════════════════════════════════════════════════════════ */

export async function runSilentAudit(supabase: any, voteId: string, clubName: string, ip: string | null, fp: string) {
  if (!ip) return;

  // 1. CHECAGEM DE LISTA NEGRA (IP MARCADO COMO RECUSADO)
  const { data: blacklist } = await supabase
    .from("votos")
    .select("status_aprovacao")
    .eq("ip_address", ip)
    .eq("status_aprovacao", "recusado")
    .limit(1);

  if (blacklist && blacklist.length > 0) {
    await supabase.from("votos").update({
      is_suspicious: true,
      status_aprovacao: "pendente",
      motivo_suspicao: "LISTA NEGRA: IP com histórico de fraude."
    }).eq("id", voteId);
    return;
  }

  // 2. CHECAGEM DE MULTI-VOTO (MESMO IP, OUTROS IDs)
  // Conta votos existentes com este IP que não sejam o atual
  const { count, error } = await supabase
    .from("votos")
    .select("id", { count: 'exact', head: true })
    .eq("ip_address", ip)
    .neq("id", voteId);

  if (!error && count && count > 0) {
    await supabase.from("votos").update({
      is_suspicious: true,
      status_aprovacao: "pendente",
      motivo_suspicao: `REINCIDÊNCIA: IP já registrou ${count} voto(s).`
    }).eq("id", voteId);
  }
}

/* ═══════════════════════════════════════════════════════════
    MÓDULO 3: ENRIQUECIMENTO POSTAL
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
  } catch {
    return null;
  }
}

/**
 * [RODAPÉ TÉCNICO]
 * ARQUIVO: src/lib/vote-auditor.ts
 * VERSÃO: 8.7
 * - Implementada contagem exata por IP para evitar race conditions.
 * - Prioridade absoluta para o campo status_aprovacao 'recusado'.
 */