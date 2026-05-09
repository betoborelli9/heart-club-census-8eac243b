/**
 * [CAMINHO]: src/lib/vote-auditor.ts
 * [STATUS]: PRODUÇÃO - VERSÃO 9.5 (INTELIGÊNCIA GEOGRÁFICA)
 * [OBJETIVO]: Cruzamento de IP, CEP e Coordenadas para detecção de clusters de fraude.
 */

// ... (getFingerprint e getFastIP permanecem os mesmos)

export async function runSilentAudit(supabase: any, voteId: string, clubName: string, ip: string | null, fp: string) {
  if (!ip) return;

  // 1. BUSCA DADOS DO VOTO PARA CRUZAMENTO
  const { data: vote } = await supabase
    .from("votos")
    .select("cep, cidade, estado, ip_address")
    .eq("id", voteId)
    .single();

  if (!vote) return;

  // 2. DETECÇÃO DE DUPLICIDADE POR CEP (Votos na mesma rua/bairro)
  const { count: cepCount } = await supabase
    .from("votos")
    .select("id", { count: 'exact', head: true })
    .eq("cep", vote.cep)
    .neq("id", voteId);

  // 3. DETECÇÃO POR IP
  const { count: ipCount } = await supabase
    .from("votos")
    .select("id", { count: 'exact', head: true })
    .eq("ip_address", ip)
    .neq("id", voteId);

  let motivo = "";
  if (ipCount && ipCount > 0) motivo = `IP REPETIDO: ${ipCount} outros votos na mesma rede.`;
  else if (cepCount && cepCount > 0) motivo = `CEP REPETIDO: Já existe voto nesta localidade (${vote.cep}).`;

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
 * VERSÃO: 9.5
 */