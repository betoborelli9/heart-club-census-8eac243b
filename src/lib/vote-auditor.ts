/**
 * [CAMINHO]: src/lib/vote-auditor.ts
 * [STATUS]: PRODUÇÃO - VERSÃO 10.0 (AUDITORIA RADICAL MULTI-FILTRO)
 * [OBJETIVO]: Exportação total para build e auditoria por IP, FP, UserID e CEP.
 */

import FingerprintJS from "@fingerprintjs/fingerprintjs";

export async function getFingerprint(): Promise<string> {
  try {
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    return result.visitorId;
  } catch { 
    return "id-gen-" + Math.random().toString(36).substring(7); 
  }
}

export async function getFastIP() {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    return data.ip || null;
  } catch { 
    return null; 
  }
}

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

export async function runSilentAudit(
  supabase: any, 
  voteId: string, 
  clubName: string, 
  ip: string | null, 
  fp: string,
  userId?: string | null,
  cep?: string | null
) {
  const conditions: string[] = [];
  
  if (ip) conditions.push(`ip_address.eq.${ip}`);
  if (fp) conditions.push(`fingerprint.eq.${fp}`);
  if (userId) conditions.push(`user_id.eq.${userId}`);
  if (cep) conditions.push(`cep.eq.${cep}`);

  if (conditions.length === 0) return;

  const { data: duplicates, error } = await supabase
    .from("votos")
    .select("id")
    .or(conditions.join(","))
    .neq("id", voteId);

  if (!error && duplicates && duplicates.length > 0) {
    const total = duplicates.length;
    const motivo = `SUSPEITO: DUPLICIDADE DETECTADA (${total} ocorrências em IP/ID/CEP).`;

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
 * VERSÃO: 10.0
 */