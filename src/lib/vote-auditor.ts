/**
 * [CAMINHO]: src/lib/vote-auditor.ts
 * [STATUS]: PRODUÇÃO - VERSÃO 9.6 (FIX EXPORT + GEO INTELLIGENCE)
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

// GARANTIA DE EXPORT PARA O Vercel Build
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
    MÓDULO 2: AUDITORIA SILENCIOSA (REGRAS DE NEGÓCIO)
   ═══════════════════════════════════════════════════════════ */

export async function runSilentAudit(supabase: any, voteId: string, clubName: string, ip: string | null, fp: string) {
  if (!ip) return;

  // 1. DADOS DO VOTO ATUAL
  const { data: vote } = await supabase
    .from("votos")
    .select("cep, ip_address")
    .eq("id", voteId)
    .single();

  if (!vote) return;

  // 2. BUSCA POR DUPLICIDADE (IP OU CEP)
  const { count: ipDup } = await supabase
    .from("votos")
    .select("id", { count: 'exact', head: true })
    .eq("ip_address", ip)
    .neq("id", voteId);

  const { count: cepDup } = await supabase
    .from("votos")
    .select("id", { count: 'exact', head: true })
    .eq("cep", vote.cep)
    .neq("id", voteId);

  let motivo = "";
  if (ipDup && ipDup > 0) motivo = `FRAUDE: IP DUPLICADO (${ip})`;
  else if (cepDup && cepDup > 0) motivo = `FRAUDE: CEP REPETIDO (${vote.cep})`;

  if (motivo) {
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
 * VERSÃO: 9.6
 */