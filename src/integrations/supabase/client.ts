/**
 * Caminho: src/integrations/supabase/client.ts
 * Contexto: Configuração do Cliente Supabase com Fix de Autenticação
 * Projeto: HEART CLUB GLOBAL
 * Objetivo: Forçar o uso de variáveis de ambiente e flowType implicit para destravar o login no PC.
 */

import { createClient } from "@supabase/supabase-js";
import { processLock } from "@supabase/auth-js";
import type { Database } from "./types";

// Saneamento da URL: Remove barras extras e garante o uso da variável de ambiente
export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || "https://tmttlchkqjtbusfdwyrx.supabase.co").replace(
  /\/$/,
  "",
);

// CRÍTICO: Se a VITE_SUPABASE_ANON_KEY estiver vazia no .env, o sistema falha.
export const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "implicit", // Mantido como implicit para evitar erros de PKCE/DNS no Desktop
    lock: processLock,
  },
});

/**
 * Rodapé: Configuração de persistência Heart Club.
 * Atenção: Verifique se a KEY no painel do Supabase coincide com a VITE_SUPABASE_ANON_KEY.
 */
