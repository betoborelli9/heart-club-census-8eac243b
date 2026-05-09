/**
 * [CAMINHO]: src/lib/vote-auditor.ts
 * [STATUS]: PRODUÇÃO - VERSÃO 8.6 (CORREÇÃO DE EXPORT PARA BUILD)
 * [OBJETIVO]: Garantir que getFastIP esteja disponível para o Voting.tsx.
 */

import FingerprintJS from "@fingerprintjs/fingerprintjs";

/* ═══════════════════════════════════════════════════════════
    MÓDULO 1: IDENTIDADE DIGITAL
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

// ESTA É A FUNÇÃO QUE A VERCEL DISSE QUE ESTAVA FALTANDO:
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
    MÓDULO 2: AUDITORIA SILENCIOSA (LISTA NEGRA)
   ═══════════════════════════════════════════════════════════ */

export async function runSilentAudit(supabase: any, voteId: string, clubName: string, ip: string | null, fp: string) {
  if (!ip) return;

  // 1. VERIFICAÇÃO DE ANTECEDENTES (LISTA NEGRA)
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
      motivo_suspicao: `LISTA NEGRA: IP com histórico de votos recusados.`
    }).eq("id", voteId);
    return;
  }

  // 2. VERIFICAÇÃO DE REINCIDÊNCIA (VOTAÇÃO EM MASSA)
  const { data: duplicates } = await supabase
    .from("votos")
    .select("id")
    .eq("ip_address", ip)
    .neq("id", voteId)
    .neq("status_aprovacao", "ficticio")
    .limit(1);

  if (duplicates && duplicates.length > 0) {
    await supabase.from("votos").update({
      is_suspicious: true,
      status_aprovacao: "pendente",
      motivo_suspicao: `REINCIDÊNCIA: Votação em massa detectada no IP: ${ip}`
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
 * VERSÃO: 8.6
 * - Adicionado export explícito de getFastIP para sanar erro de build.
 * - Mantida lógica de Ficha Suja para auditoria silenciosa.
 */