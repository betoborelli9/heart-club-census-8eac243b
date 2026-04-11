/**
 * Caminho: supabase/functions/completarSerieA/index.ts
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { completarSerieA } from "../import-clubs/importSerieA.ts";

serve(async () => {
  try {
    await completarSerieA();
    return new Response(JSON.stringify({ status: "Motor de busca processado com sucesso" }), { 
      headers: { "Content-Type": "application/json" }, status: 200 
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});