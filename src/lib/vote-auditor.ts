/**
 * ═══════════════════════════════════════════════════════════════════════
 * 📁 CAMINHO: src/lib/vote-auditor.ts
 * 🧠 MÓDULO: AUDITORIA RADICAL DE VOTOS
 * 🔥 STATUS: PRODUÇÃO — VERSÃO 10.5 (ANTI-FRAUDE REAL)
 *
 * OBJETIVO:
 * - Detectar múltiplos votos pelo mesmo IP
 * - Detectar múltiplos votos pelo mesmo dispositivo
 * - Gerar score de fraude
 * - Marcar automaticamente como SUSPEITO
 * - Alimentar o painel ADMIN em tempo real
 *
 * REGRAS:
 * ✅ Mesmo IP = SUSPEITO
 * ✅ Mesmo Fingerprint = SUSPEITO
 * ✅ IP + Fingerprint = SCORE MAIS ALTO
 * ✅ Auditoria silenciosa
 * ✅ Compatível com Supabase RPC
 * ═══════════════════════════════════════════════════════════════════════
 */

import FingerprintJS from "@fingerprintjs/fingerprintjs";

/* ═══════════════════════════════════════════════════════════════════════
   MÓDULO 1: IDENTIDADE DIGITAL
   ═══════════════════════════════════════════════════════════════════════ */

export async function getFingerprint(): Promise<string> {
  try {
    const fp = await FingerprintJS.load();

    const result = await fp.get();

    return result.visitorId;
  } catch (err) {
    console.error("[FINGERPRINT ERROR]", err);

    return "fingerprint-fallback-" + Math.random().toString(36).substring(2);
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   MÓDULO 2: CAPTURA DE IP
   ═══════════════════════════════════════════════════════════════════════ */

export async function getFastIP(): Promise<string | null> {
  try {
    const res = await fetch("https://api.ipify.org?format=json");

    const data = await res.json();

    return data.ip || null;
  } catch (err) {
    console.error("[IP ERROR]", err);

    return null;
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   MÓDULO 3: GEOLOCALIZAÇÃO VIA CEP
   ═══════════════════════════════════════════════════════════════════════ */

export async function getFullAddress(cep: string) {
  try {
    const cleanCep = cep.replace(/\D/g, "");

    const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);

    const data = await res.json();

    if (data.erro) {
      return null;
    }

    return {
      bairro: data.bairro || "Não informado",
      cidade: data.localidade || "Não informado",
      estado: data.uf || "Não informado",
    };
  } catch (err) {
    console.error("[CEP ERROR]", err);

    return null;
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   MÓDULO 4: ENGINE DE AUDITORIA RADICAL
   ═══════════════════════════════════════════════════════════════════════ */

export async function runSilentAudit(
  supabase: any,
  voteId: string,
  clubName: string,
  ip: string | null,
  fingerprint: string | null
) {
  try {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("[AUDITORIA INICIADA]");
    console.log("Vote ID:", voteId);
    console.log("Clube:", clubName);
    console.log("IP:", ip);
    console.log("Fingerprint:", fingerprint);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    /* =========================================
       BUSCA DUPLICIDADE POR IP
       ========================================= */

    let ipDuplicates: any[] = [];

    if (ip) {
      const { data } = await supabase
        .from("votos")
        .select(`
          id,
          user_email,
          ip_address,
          fingerprint,
          created_at
        `)
        .eq("ip_address", ip)
        .neq("id", voteId);

      ipDuplicates = data || [];
    }

    /* =========================================
       BUSCA DUPLICIDADE POR FINGERPRINT
       ========================================= */

    let fingerprintDuplicates: any[] = [];

    if (fingerprint) {
      const { data } = await supabase
        .from("votos")
        .select(`
          id,
          user_email,
          ip_address,
          fingerprint,
          created_at
        `)
        .eq("fingerprint", fingerprint)
        .neq("id", voteId);

      fingerprintDuplicates = data || [];
    }

    /* =========================================
       PROCESSAMENTO DE SCORE
       ========================================= */

    const totalIp = ipDuplicates.length;

    const totalFingerprint = fingerprintDuplicates.length;

    let fraudScore = 0;

    const motivos: string[] = [];

    /* =========================================
       SCORE POR IP
       ========================================= */

    if (totalIp >= 1) {
      fraudScore += 60;

      motivos.push(
        `${totalIp} voto(s) encontrado(s) no mesmo IP`
      );
    }

    /* =========================================
       SCORE POR FINGERPRINT
       ========================================= */

    if (totalFingerprint >= 1) {
      fraudScore += 80;

      motivos.push(
        `${totalFingerprint} dispositivo(s) repetido(s)`
      );
    }

    /* =========================================
       SCORE MÁXIMO
       ========================================= */

    if (fraudScore > 100) {
      fraudScore = 100;
    }

    /* =========================================
       DEFINE STATUS
       ========================================= */

    const isSuspicious = fraudScore >= 60;

    const motivoFinal =
      motivos.length > 0
        ? motivos.join(" + ")
        : null;

    console.log("Fraud Score:", fraudScore);
    console.log("Suspeito:", isSuspicious);
    console.log("Motivo:", motivoFinal);

    /* =========================================
       UPDATE FINAL NO BANCO
       ========================================= */

    const { error } = await supabase
      .from("votos")
      .update({
        is_suspicious: isSuspicious,
        fraud_score: fraudScore,
        motivo_suspicao: motivoFinal,
        status_aprovacao: isSuspicious
          ? "pendente"
          : "aprovado",
      })
      .eq("id", voteId);

    if (error) {
      console.error("[SUPABASE UPDATE ERROR]", error);
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("[AUDITORIA FINALIZADA]");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  } catch (err) {
    console.error("[AUDITORIA ERROR]", err);
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════
 * 📌 RODAPÉ TÉCNICO
 * ═══════════════════════════════════════════════════════════════════════
 *
 * MELHORIAS IMPLEMENTADAS:
 *
 * ✅ Auditoria real por IP
 * ✅ Auditoria real por dispositivo
 * ✅ Fraud Score dinâmico
 * ✅ Detecção automática
 * ✅ Compatível com AdminAuditTable
 * ✅ Compatível com Supabase
 * ✅ Logs completos
 * ✅ Sistema escalável
 *
 * EXEMPLOS:
 *
 * 1 voto no mesmo IP
 * → 60%
 *
 * Mesmo Fingerprint
 * → 80%
 *
 * IP + Fingerprint
 * → 100%
 *
 * STATUS:
 * fraud_score >= 60
 * → SUSPEITO
 *
 * 🔥 HEART CLUB — ANTI FRAUDE ENGINE
 * ═══════════════════════════════════════════════════════════════════════
 */