/**
 * [CAMINHO]: src/lib/vote-auditor.ts
 * [STATUS]: PRODUÇÃO - VERSÃO 8.5 (BLACKLIST PERSISTENTE)
 * [OBJETIVO]: Manter o rastro do fraudador sem computar o voto no Censo.
 */

/* ═══════════════════════════════════════════════════════════
    MÓDULO 5: AUDITORIA DE ANTECEDENTES (LISTA NEGRA)
   ═══════════════════════════════════════════════════════════ */
export async function runSilentAudit(supabase: any, voteId: string, clubName: string, ip: string | null, fp: string) {
  if (!ip) return;

  // 1. BUSCA POR ANTECEDENTES (Votos que você já recusou no passado)
  const { data: blacklist } = await supabase
    .from("votos")
    .select("id, motivo_suspicao")
    .eq("ip_address", ip)
    .eq("status_aprovacao", "recusado") // AQUI ESTÁ A CHAVE: Ele não foi deletado!
    .limit(1);

  if (blacklist && blacklist.length > 0) {
    // Se o IP está na lista negra, o voto novo já nasce marcado
    await supabase.from("votos").update({
      is_suspicious: true,
      status_aprovacao: "pendente", // Fica travado para você ver
      motivo_suspicao: "IP BANIDO: Este torcedor possui histórico de fraudes recusadas."
    }).eq("id", voteId);
    return;
  }

  // 2. BUSCA POR REINCIDÊNCIA (Votos em massa no mesmo momento)
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
      motivo_suspicao: `ALERTA: Múltiplos votos detectados no IP: ${ip}`
    }).eq("id", voteId);
  }
}

/**
 * [RODAPÉ TÉCNICO]
 * ARQUIVO: src/lib/vote-auditor.ts
 * - O status 'recusado' impede que o voto some no RPC 'get_heatmap_data'.
 * - O rastro permanece para consulta do Master Admin.
 */