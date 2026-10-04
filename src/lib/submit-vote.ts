/**
 * [CAMINHO]: src/lib/submit-vote.ts
 * [MÓDULO]: Grava o voto do torcedor no fluxo novo. É a MESMA gravação do Voting.tsx
 * (perfil → voto → auditoria silenciosa → clubes na base → atualiza perfil), só que sem
 * pedir nascimento/gênero antes (esses vêm depois, em cartões explicativos no Dashboard)
 * e registrando o aceite dos Termos. Nunca apaga voto de ninguém.
 */
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getFingerprint, getFastIP, runSilentAudit } from "@/lib/vote-auditor";
import { detectDeviceModel } from "@/lib/device-detect";
import { captureIpAudit } from "@/lib/address";
import { isValidClubName, persistClubsIfMissing, type ClubSearchResult } from "@/lib/search-clubs";

type ProfileLike = {
  nome_exibicao?: string | null;
  cidade?: string | null;
  estado?: string | null;
  pais?: string | null;
  cep?: string | null;
} | null;

export type SubmitVoteArgs = {
  user: User;
  profile: ProfileLike;
  heartClub: ClubSearchResult;
  sympathyClubs: ClubSearchResult[];
  updateProfile: (data: any) => Promise<void>;
  refreshProfile: () => Promise<void>;
};

/** Nome inicial do torcedor: o que veio do Google/e-mail (ele ajusta depois, no cartão do perfil). */
export function defaultDisplayName(user: User): string {
  const meta: any = user.user_metadata || {};
  const fromMeta = String(meta.full_name || meta.name || "").trim();
  if (fromMeta) return fromMeta;
  const prefix = String(user.email || "").split("@")[0].replace(/[._-]+/g, " ").trim();
  return prefix || "Torcedor";
}

export async function submitVote({
  user,
  profile,
  heartClub,
  sympathyClubs,
  updateProfile,
  refreshProfile,
}: SubmitVoteArgs): Promise<void> {
  if (!isValidClubName(heartClub.name)) throw new Error("clube_invalido");

  const [ip, fp, deviceModel] = await Promise.all([
    getFastIP(),
    getFingerprint(),
    detectDeviceModel().catch(() => "Desconhecido"),
  ]);

  // Cidade/estado/país pelo IP quando o perfil ainda não tem (silencioso, nunca pede permissão).
  const needsGeoFallback = !profile?.cidade || !profile?.estado || !profile?.pais;
  const ipGeo = needsGeoFallback ? await captureIpAudit() : null;
  const normalizedPais = (() => {
    const raw = profile?.pais || ipGeo?.pais || "BR";
    const lower = raw.toLowerCase().trim();
    if (lower === "brazil" || lower === "brasil") return "BR";
    return raw;
  })();
  const finalCidade = profile?.cidade || ipGeo?.cidade || "";
  const finalEstado = profile?.estado || ipGeo?.estado || "";

  const profilePatch: any = {
    device_hardware: deviceModel,
    latitude: ipGeo?.lat ?? null,
    longitude: ipGeo?.lng ?? null,
  };
  if (!profile?.nome_exibicao) profilePatch.nome_exibicao = defaultDisplayName(user);
  if (!profile?.cidade && ipGeo?.cidade) profilePatch.cidade = ipGeo.cidade;
  if (!profile?.estado && ipGeo?.estado) profilePatch.estado = ipGeo.estado;
  if (!profile?.pais && normalizedPais) profilePatch.pais = normalizedPais;
  await updateProfile(profilePatch);

  const mainVote: any = {
    user_id: user.id,
    email: user.email,
    clube_nome: heartClub.name,
    cidade: finalCidade,
    estado: finalEstado,
    pais: normalizedPais,
    cep: profile?.cep || null,
    ip_address: ip,
    fingerprint: fp,
    device_model: deviceModel,
    voto_lat: ipGeo?.lat ?? null,
    voto_lng: ipGeo?.lng ?? null,
    is_original_vote: true,
    status_aprovacao: "aprovado",
    is_suspicious: false,
    sympathy_1: sympathyClubs[0]?.name || null,
    sympathy_2: sympathyClubs[1]?.name || null,
    sympathy_3: sympathyClubs[2]?.name || null,
    sympathy_4: sympathyClubs[3]?.name || null,
  };

  const { data: newVote, error: voteError } = await supabase.from("votos").insert([mainVote]).select("id").single();
  if (voteError) throw voteError;

  // Aceite dos Termos (LGPD) — o torcedor marcou o quadradinho antes de chegar aqui.
  try {
    await supabase.rpc("accept_terms" as any, { p_version: "1.0" });
  } catch (err) {
    console.warn("[LGPD] accept_terms falhou (não-crítico):", err);
  }

  runSilentAudit(supabase, newVote.id, heartClub.name, ip, fp);

  const toSave = [heartClub, ...sympathyClubs]
    .filter((club): club is ClubSearchResult => !!club?.name && club.source === "api")
    .filter((club, index, self) => index === self.findIndex((c) => c.name === club.name));
  if (toSave.length > 0) await persistClubsIfMissing(toSave);

  await refreshProfile().catch(() => {});
}
