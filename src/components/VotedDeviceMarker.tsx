/**
 * [CAMINHO]: src/components/VotedDeviceMarker.tsx
 * [MÓDULO]: Marca no aparelho (localStorage + cookie de 1 ano) que aqui já houve um torcedor que votou, com o clube
 * (nome e escudo) e o e-mail mascarado — assim, se ele voltar sem estar logado, a porta de entrada mostra
 * "Bem-vindo de volta, torcedor do <Clube>!" em vez da busca de clube.
 * Grava quando um torcedor logado tem voto (cobre quem acabou de votar e quem já tinha votado e fez login).
 * Nunca grava durante o teste do Master (simulação) e nunca mexe em voto nenhum.
 */
import { useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import { useViewedClub } from "@/contexts/ViewedClubContext";
import { CLUBS_DATA } from "@/clubes-data";
import { supabase } from "@/integrations/supabase/client";
import { isMasterEmail } from "@/lib/master";
import { markDeviceVoted, maskEmail, readVotedDevice } from "@/lib/entry-flow";

const norm = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

/** Escudo do clube pelo nome: primeiro a lista local, depois o cache de clubes. Qualquer falha → sem escudo (o app acha depois). */
async function findClubLogo(name: string): Promise<string | undefined> {
  const local = (CLUBS_DATA as any[]).find((c) => norm(c.nome) === norm(name));
  if (local?.logoUrl) return local.logoUrl as string;
  try {
    const { data } = await supabase
      .from("clubes_cache")
      .select("escudo_url")
      .ilike("nome", name)
      .order("escudo_url", { ascending: false, nullsFirst: false })
      .limit(1);
    return (data?.[0] as any)?.escudo_url || undefined;
  } catch {
    return undefined;
  }
}

export default function VotedDeviceMarker() {
  const { user, isAuthReady, isLoading, isAuthenticated, hasVoted, simActive } = useUser();
  const { heartClubName } = useViewedClub();

  useEffect(() => {
    if (!isAuthReady || isLoading || simActive) return;
    if (!isAuthenticated || !hasVoted || !user) return;
    if (isMasterEmail(user.email)) return;

    const email = maskEmail(user.email);
    const current = readVotedDevice();
    if (!heartClubName) {
      // o clube ainda está carregando: guarda ao menos que este aparelho já teve um voto
      if (!current) markDeviceVoted({ email });
      return;
    }
    if (current?.clubName === heartClubName && current.email === email && current.logo) return;

    let cancelled = false;
    (async () => {
      const logo = current?.clubName === heartClubName ? current.logo : await findClubLogo(heartClubName);
      if (!cancelled) markDeviceVoted({ clubName: heartClubName, logo, email });
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthReady, isLoading, isAuthenticated, hasVoted, simActive, user, heartClubName]);

  return null;
}
