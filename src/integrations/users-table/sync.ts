/**
 * [CAMINHO]: src/integrations/users-table/sync.ts
 * [MÓDULO]: Integração isolada com a tabela public.users do Supabase.
 * [DESCRIÇÃO]:
 *   Persistência (upsert por id) dos metadados essenciais do torcedor
 *   na tabela `users`. Rodando de forma independente do restante do app:
 *   não altera rotas, contexts ou fluxos existentes.
 *
 *   Campos gravados: id, email, name, birth_date, country_code, push_token.
 */

import { supabase } from "@/integrations/supabase/client";
import { countryNameToIso2 } from "@/lib/country-iso";

export interface UsersTableUpsertInput {
  id: string;
  email?: string | null;
  name?: string | null;
  birth_date?: string | null; // YYYY-MM-DD
  country?: string | null;    // nome PT/EN ou ISO2/ISO3
  push_token?: string | null;
}

/**
 * Faz upsert do usuário na tabela `users`.
 * - Se o id já existir, apenas atualiza os metadados fornecidos.
 * - Não sobrescreve push_token com null (para não apagar token válido).
 * - Silencioso: registra warning e nunca lança para não quebrar UI.
 */
export async function upsertAppUser(input: UsersTableUpsertInput): Promise<void> {
  try {
    if (!input.id) return;

    // A tabela exige NOT NULL em email, name, birth_date, country_code.
    // Só fazemos upsert quando temos o mínimo — evita erros de integridade.
    const email = (input.email ?? "").trim();
    const name = (input.name ?? "").trim();
    const birth_date = (input.birth_date ?? "").trim();
    const country_code =
      (countryNameToIso2(input.country ?? null) ?? "").toUpperCase();

    if (!email || !name || !birth_date || !country_code) {
      return; // aguarda o perfil estar completo
    }

    const payload: Record<string, unknown> = {
      id: input.id,
      email,
      name,
      birth_date,
      country_code,
      updated_at: new Date().toISOString(),
    };

    if (input.push_token) payload.push_token = input.push_token;

    const { error } = await supabase
      .from("users" as any)
      .upsert(payload, { onConflict: "id" });

    if (error) {
      console.warn("[users-sync] upsert falhou:", error.message);
    }
  } catch (err) {
    console.warn("[users-sync] erro inesperado:", err);
  }
}
