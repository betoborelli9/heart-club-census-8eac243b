/**
 * [CAMINHO]: src/lib/vote-auditor.ts
 * [STATUS]: PRODUÇÃO - VERSÃO 8.8 (FIX: CONTROLE DE DUPLICIDADE REAL)
 * [CONTEXTO]: Auditoria que não perdoa IP repetido, independente do status.
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

export async function runSilentAudit(supabase: any, voteId: string, clubName: string, ip: string | null, fp: string) {
  if (!ip) return;

  // 1. CHECAGEM DE LISTA NEGRA (IP RECUSADO)
  const { data: blacklist } = await supabase
    .from("votos")
    .select("id")
    .eq("ip_address", ip)
    .eq("status_aprovacao", "recusado")
    .limit(1);

  if (blacklist && blacklist.length > 0) {
    await supabase.from("votos").update({
      is_suspicious: true,
      status_aprovacao: "pendente",
      motivo_suspicao: "IP BANIDO: Histórico de fraude."
    }).eq("id", voteId);
    return;
  }

  // 2. CHECAGEM DE MULTI-VOTO (IP JÁ EXISTENTE NO BANCO)
  // Se houver qualquer outro voto com este IP, o sistema acusa.
  const { count, error } = await supabase
    .from("votos")
    .select("id", { count: 'exact', head: true })
    .eq("ip_address", ip)
    .neq("id", voteId);

  if (!error && count && count > 0) {
    console.log(`[AUDIT] Fraude detectada para IP ${ip}. Votos anteriores: ${count}`);
    await supabase.from("votos").update({
      is_suspicious: true,
      status_aprovacao: "pendente",
      motivo_suspicao: `IP DUPLICADO: Já existem ${count} voto(s) registrados por este endereço.`
    }).eq("id", voteId);
  }
}

export async function getFullAddress(cep: string) {
  const cleanCep = cep.replace(/\D/g, "");
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data = await res.json();
    if (data.erro) return null;
    return { bairro: data.bairro, cidade: data.localidade, estado: data.uf };
  } catch {
    return null;
  }
}

/**
 * [RODAPÉ TÉCNICO]
 * ARQUIVO: src/lib/vote-auditor.ts
 * VERSÃO: 8.8
 */