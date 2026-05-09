/**
 * [CAMINHO]: src/lib/vote-auditor.ts
 * [STATUS]: PRODUÇÃO - VERSÃO 9.9.1 (BUILD FIX + RADICAL AUDIT)
 * [OBJETIVO]: Exportação total para build e auditoria implacável de duplicidade.
 */

import FingerprintJS from "@fingerprintjs/fingerprintjs";

/* ═══════════════════════════════════════════════════════════
    MÓDULO 1: IDENTIDADE DIGITAL E REDE
   ═══════════════════════════════════════════════════════════ */

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

/* ═══════════════════════════════════════════════════════════
    MÓDULO 2: ENDEREÇO (NECESSÁRIO PARA O BUILD)
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

/* ═══════════════════════════════════════════════════════════
    MÓDULO 3: AUDITORIA SILENCIOSA (A MARRETA)
   ═══════════════════════════════════════════════════════════ */

export async function runSilentAudit(supabase: any, voteId: string, clubName: string, ip: string | null, fp: string) {
  if (!ip && !fp) return;

  // Busca qualquer voto anterior com o mesmo IP ou Digital ID
  const { data: duplicates } = await supabase
    .from("votos")
    .select("id")
    .or(`ip_address.eq.${ip},fingerprint.eq.${fp}`)
    .neq("id", voteId);

  if (duplicates && duplicates.length > 0) {
    const total = duplicates.length;
    const motivo = `SUSPEITO: ID/IP REPETIDO (${total} ocorrências anteriores).`;

    // MARRETA O STATUS PARA SUSPEITO NO BANCO
    await supabase.from("votos").update({
      is_suspicious: true,
      status_aprovacao: "pendente",
      motivo_suspicao: motivo
    }).eq("id", voteId);
    
    console.log(`[AUDITOR] Voto ${voteId} marcado como fraude.`);
  }
}

/**
 * [RODAPÉ TÉCNICO]
 * ARQUIVO: src/lib/vote-auditor.ts
 * VERSÃO: 9.9.1
 */