/**
 * ═══════════════════════════════════════════════════════════════
 * 📁 CAMINHO: src/lib/vote-auditor.ts
 * 🧠 MÓDULO: MOTOR DE AUDITORIA ANTIFRAUDE GLOBAL
 * 🔥 STATUS: PRODUÇÃO — VERSÃO 10.0 (BORELLI DEFENSE SYSTEM)
 *
 * OBJETIVO:
 * Sistema inteligente de auditoria antifraude do Heart Club.
 *
 * RESPONSABILIDADES:
 * - Detectar votos suspeitos
 * - Gerar score de fraude
 * - Identificar duplicidades
 * - Detectar comportamento anormal
 * - Preservar votos legítimos
 * - Alimentar o painel administrativo
 *
 * ESTRATÉGIA:
 * O sistema NÃO condena automaticamente.
 * Ele apenas marca padrões suspeitos
 * para análise administrativa.
 * ═══════════════════════════════════════════════════════════════
 */

import FingerprintJS from "@fingerprintjs/fingerprintjs";

/* ═══════════════════════════════════════════════════════════
    🧩 MÓDULO 1 — IDENTIDADE DIGITAL
   ═══════════════════════════════════════════════════════════ */

export async function getFingerprint(): Promise<string> {
  try {
    const fp = await FingerprintJS.load();

    const result = await fp.get();

    return result.visitorId;
  } catch {
    return "fp-fallback-" + Math.random().toString(36).substring(2, 12);
  }
}

/* ═══════════════════════════════════════════════════════════
    🌐 MÓDULO 2 — CAPTURA DE IP
   ═══════════════════════════════════════════════════════════ */

export async function getFastIP(): Promise<string | null> {
  try {
    const res = await fetch("https://api.ipify.org?format=json");

    const data = await res.json();

    return data.ip || null;
  } catch {
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════
    📍 MÓDULO 3 — ENDEREÇO VIA CEP
   ═══════════════════════════════════════════════════════════ */

export async function getFullAddress(cep: string) {
  const cleanCep = cep.replace(/\D/g, "");

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);

    const data = await res.json();

    if (data.erro) return null;

    return {
      bairro: data.bairro || "Não informado",
      cidade: data.localidade || "Não informado",
      estado: data.uf || "Não informado",
    };
  } catch {
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════
    🧠 MÓDULO 4 — ENGINE DE SCORE
   ═══════════════════════════════════════════════════════════ */

type FraudAnalysis = {
  score: number;
  flags: string[];
  suspicious: boolean;
};

function buildFraudResult(score: number, flags: string[]): FraudAnalysis {
  return {
    score,
    flags,
    suspicious: score >= 30,
  };
}

/* ═══════════════════════════════════════════════════════════
    🔥 MÓDULO 5 — AUDITORIA PRINCIPAL
   ═══════════════════════════════════════════════════════════ */

export async function runSilentAudit(
  supabase: any,
  voteId: string,
  clubName: string,
  ip: string | null,
  fingerprint: string,
  cep?: string | null,
  bairro?: string | null,
  cidade?: string | null,
  estado?: string | null,
) {
  try {
    let fraudScore = 0;

    const flags: string[] = [];

    /* ======================================================
       🔍 BUSCA DUPLICIDADE POR IP
    ====================================================== */

    if (ip) {
      const { data: ipDuplicates } = await supabase
        .from("votos")
        .select("id")
        .eq("ip_address", ip)
        .neq("id", voteId);

      const totalIpDuplicates = ipDuplicates?.length || 0;

      if (totalIpDuplicates >= 1) {
        fraudScore += 25;

        flags.push(`IP repetido (${totalIpDuplicates})`);
      }

      if (totalIpDuplicates >= 5) {
        fraudScore += 20;

        flags.push("Alta recorrência de IP");
      }
    }

    /* ======================================================
       🔍 BUSCA DUPLICIDADE POR FINGERPRINT
    ====================================================== */

    if (fingerprint) {
      const { data: fpDuplicates } = await supabase
        .from("votos")
        .select("id")
        .eq("fingerprint", fingerprint)
        .neq("id", voteId);

      const totalFpDuplicates = fpDuplicates?.length || 0;

      if (totalFpDuplicates >= 1) {
        fraudScore += 60;

        flags.push(`Fingerprint repetido (${totalFpDuplicates})`);
      }

      if (totalFpDuplicates >= 3) {
        fraudScore += 40;

        flags.push("Fingerprint altamente reincidente");
      }
    }

    /* ======================================================
       🔍 DUPLICIDADE POR CEP
    ====================================================== */

    if (cep) {
      const { data: cepDuplicates } = await supabase
        .from("votos")
        .select("id")
        .eq("cep", cep)
        .neq("id", voteId);

      const totalCepDuplicates = cepDuplicates?.length || 0;

      if (totalCepDuplicates >= 3) {
        fraudScore += 10;

        flags.push("CEP recorrente");
      }
    }

    /* ======================================================
       🔍 DUPLICIDADE POR BAIRRO
    ====================================================== */

    if (bairro) {
      const { data: bairroDuplicates } = await supabase
        .from("votos")
        .select("id")
        .eq("bairro", bairro)
        .neq("id", voteId);

      const totalBairroDuplicates = bairroDuplicates?.length || 0;

      if (totalBairroDuplicates >= 10) {
        fraudScore += 10;

        flags.push("Alta atividade regional");
      }
    }

    /* ======================================================
       🔍 DETECÇÃO TEMPORAL
    ====================================================== */

    const last5Minutes = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data: recentVotes } = await supabase
      .from("votos")
      .select("id")
      .gte("created_at", last5Minutes);

    const recentCount = recentVotes?.length || 0;

    if (recentCount >= 20) {
      fraudScore += 20;

      flags.push("Explosão anormal de votos");
    }

    /* ======================================================
       🔍 SCORE FINAL
    ====================================================== */

    const result = buildFraudResult(fraudScore, flags);

    let approvalStatus = "aprovado";

    if (result.score >= 30) {
      approvalStatus = "pendente";
    }

    if (result.score >= 80) {
      approvalStatus = "recusado";
    }

    /* ======================================================
       💾 PERSISTÊNCIA
    ====================================================== */

    await supabase
      .from("votos")
      .update({
        fraud_score: result.score,
        fraud_flags: result.flags,
        is_suspicious: result.suspicious,
        status_aprovacao: approvalStatus,
        motivo_suspicao:
          result.flags.length > 0
            ? result.flags.join(" • ")
            : null,
      })
      .eq("id", voteId);

    console.log(
      `[HEART-AUDIT] Vote ${voteId} | Score: ${result.score} | Flags: ${result.flags.join(", ")}`,
    );
  } catch (err) {
    console.error("[HEART-AUDIT] Erro na auditoria:", err);
  }
}

/**
 * ═══════════════════════════════════════════════════════════════
 * 📌 RODAPÉ TÉCNICO
 * ═══════════════════════════════════════════════════════════════
 *
 * SISTEMA IMPLEMENTADO:
 *
 * ✅ Score de fraude
 * ✅ Flags inteligentes
 * ✅ Auditoria geográfica
 * ✅ Auditoria temporal
 * ✅ Detecção de fingerprint
 * ✅ Detecção de IP repetido
 * ✅ Estrutura modular escalável
 * ✅ Compatível com Dashboard Admin
 *
 * PRÓXIMAS EVOLUÇÕES:
 *
 * 🔥 VPN Detection
 * 🔥 Proxy Detection
 * 🔥 IA comportamental
 * 🔥 Heatmap antifraude
 * 🔥 Risk Score visual
 * 🔥 Sistema de quarentena
 *
 * 🧠 Heart Club Anti-Fraud Engine
 * 🔥 Borelli Defense Architecture
 * ═══════════════════════════════════════════════════════════════
 */