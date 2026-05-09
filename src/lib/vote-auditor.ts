/**
 * [CAMINHO]: src/lib/vote-auditor.ts
 * [STATUS]: PRODUÇÃO - VERSÃO 9.8 (MEMÓRIA DE FRAUDE PERSISTENTE)
 * [OBJETIVO]: Relacionar votos históricos por IP/Fingerprint e marcar suspeição automática.
 */

import FingerprintJS from "@fingerprintjs/fingerprintjs";

export async function getFingerprint(): Promise<string> {
  try {
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    return result.visitorId;
  } catch { return "id-gen-" + Math.random().toString(36).substring(7); }
}

export async function getFastIP() {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    return data.ip || null;
  } catch { return null; }
}

export async function getFullAddress(cep: string) {
  const cleanCep = cep.replace(/\D/g, "");
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data = await res.json();
    if (data.erro) return null;
    return { bairro: data.bairro || "Não informado", cidade: data.localidade, estado: data.uf };
  } catch { return null; }
}

export async function runSilentAudit(supabase: any, voteId: string, clubName: string, ip: string | null, fp: string) {
  if (!ip && !fp) return;

  // 1. BUSCA HISTÓRICA COMPLETA (IP ou FINGERPRINT)
  // Procuramos qualquer voto que não seja este atual (voteId)
  const { data: records, error } = await supabase
    .from("votos")
    .select("id, status_aprovacao, motivo_suspicao")
    .or(`ip_address.eq.${ip},fingerprint.eq.${fp}`)
    .neq("id", voteId);

  if (error) return;

  let motivo = "";
  if (records && records.length > 0) {
    const temRecusado = records.some(r => r.status_aprovacao === 'recusado');
    const totalAnteriores = records.length;

    if (temRecusado) {
      motivo = `LISTA NEGRA: IP/Dispositivo com histórico de fraude recusada.`;
    } else {
      motivo = `SUSPEITO: Reincidência detectada (${totalAnteriores} votos anteriores com este ID/IP).`;
    }

    // 2. ATUALIZA O STATUS PARA SUSPEITO IMEDIATAMENTE
    await supabase.from("votos").update({
      is_suspicious: true,
      status_aprovacao: "pendente",
      motivo_suspicao: motivo
    }).eq("id", voteId);
  }
}

/**
 * [RODAPÉ TÉCNICO]
 * ARQUIVO: src/lib/vote-auditor.ts
 * VERSÃO: 9.8 - Foco em inteligência relacional e status 'Suspeito' automático.
 */