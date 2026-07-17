/**
 * [CAMINHO]: src/integrations/users-table/UsersTableSync.tsx
 * [MÓDULO]: Componente-fantasma (sem UI) que dispara o upsert na tabela
 *   `users` sempre que o usuário logado ou seu perfil mudarem.
 *
 *   Isolado do restante do app: montado uma única vez em App.tsx,
 *   não interfere em rotas, contexts ou fluxos existentes.
 */

import { useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import { upsertAppUser } from "./sync";

export default function UsersTableSync() {
  const { user, profile } = useUser();

  useEffect(() => {
    if (!user?.id) return;

    // Recupera push_token opcional gravado pelo módulo de push (se houver).
    let pushToken: string | null = null;
    try {
      pushToken = localStorage.getItem("hc_push_token");
    } catch {
      /* storage indisponível — ignora */
    }

    void upsertAppUser({
      id: user.id,
      email: user.email ?? profile?.username ?? null,
      name: profile?.nome_exibicao ?? user.user_metadata?.full_name ?? null,
      birth_date: profile?.data_nascimento ?? null,
      country: profile?.pais ?? null,
      push_token: pushToken,
    });
  }, [
    user?.id,
    user?.email,
    profile?.nome_exibicao,
    profile?.data_nascimento,
    profile?.pais,
  ]);

  return null;
}
