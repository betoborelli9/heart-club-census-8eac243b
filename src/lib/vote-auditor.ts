/**
 * [CAMINHO]: src/lib/vote-auditor.ts
 * [STATUS]: PRODUÇÃO - VERSÃO 9.9 (BLOQUEIO RADICAL)
 * [OBJETIVO]: Se o IP ou ID de hardware bater, o voto cai na malha fina instantaneamente.
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
    return {
      bairro: data.bairro || "Não informado",
      cidade: data.localidade,
      estado: data.uf
    };
  } catch { return null; }
}

export async function runSilentAudit(supabase: any, voteId: string, clubName: string, ip: string | null, fp: string) {
  if (!ip && !fp) return;

  // BUSCA RADICAL: Não importa o status, se o rastro existe, é fraude.
  const { data: duplicates } = await supabase
    .from("votos")
    .select("id, status_aprovacao")
    .or(`ip_address.eq.${ip},fingerprint.eq.${fp}`)
    .neq("id", voteId); // Ignora o próprio voto que acabou de entrar

  if (duplicates && duplicates.length > 0) {
    const total = duplicates.length;
    const motivo = `SUSPEITO: ID/IP REPETIDO (${total} ocorrências anteriores).`;

    // MARRETA O STATUS PARA SUSPEITO
    await supabase.from("votos").update({
      is_suspicious: true,
      status_aprovacao: "pendente", // Sai do ranking e fica aguardando você
      motivo_suspicao: motivo
    }).eq("id", voteId);
    
    console.log(`[AUDITOR] Voto ${voteId} marcado como fraude. Motivo: ${motivo}`);
  }
}

/**
 * [RODAPÉ TÉCNICO]
 * ARQUIVO: src/lib/vote-auditor.ts
 * VERSÃO: 9.9 - Fim da tolerância com IPs duplicados.
 */