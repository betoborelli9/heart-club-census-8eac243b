/**
 * Caminho: supabase/functions/completarSerieA/index.ts
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async () => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: clubes, error } = await supabase
      .from("clubes_cache")
      .select("nome")
      .or("mascote.is.null,cor_primaria.is.null");

    if (error) throw error;

    return new Response(
      JSON.stringify({
        status: "ok",
        pendentes: clubes?.length ?? 0,
        message: "Use a edge function import-clubs para enriquecer os dados.",
      }),
      { headers: { "Content-Type": "application/json" }, status: 200 },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
});
