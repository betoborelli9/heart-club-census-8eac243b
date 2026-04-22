/**
 * [CAMINHO/ARQUIVO]: supabase/functions/enrich-club-colors/index.ts
 * [MÓDULO]: IA INVESTIGADORA - GOOGLE GEMINI 1.5 FLASH (GRÁTIS)
 * [STATUS]: CORRIGIDO - MIGRADO PARA GEMINI
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const geminiKey = Deno.env.get("GEMINI_API_KEY"); 
    const apiKeyFootball = "3b4a0ec2c5f513b9aa1e43c4adbae7aa";

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await req.json().catch(() => ({}));
    const club_name = body.club_name;

    if (!club_name) throw new Error("Nome do clube vazio");

    // 1. Busca no Cache Local para evitar gastos desnecessários
    const { data: cachedClub } = await supabase
      .from("clubes_cache")
      .select("*")
      .eq("nome", club_name)
      .maybeSingle();

    if (cachedClub && cachedClub.cor_primaria && cachedClub.cor_primaria !== "#ff6200") {
      return new Response(JSON.stringify({ success: true, club: cachedClub }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Busca na API-Football para dados oficiais
    const res = await fetch(`https://v3.football.api-sports.io/teams?search=${encodeURIComponent(club_name)}`, {
      headers: { "x-apisports-key": apiKeyFootball },
    });
    const json = await res.json();
    const teamData = json.response?.[0];

    // 3. MOTOR DE INTELIGÊNCIA GEMINI (O que a API não tem)
    let aiData = { cor_primaria: "#ff6200", cor_secundaria: "#1a1a1a", cor_terciaria: "#ffffff", mascote: "", tem_feminino: false };
    
    if (geminiKey) {
      const prompt = `Atue como historiador de futebol. Para o clube "${club_name}", retorne EXATAMENTE este formato JSON: {"cor_primaria": "#HEX", "cor_secundaria": "#HEX", "cor_terciaria": "#HEX", "mascote": "nome", "tem_feminino": true/false}. Não escreva texto, apenas o JSON.`;
      
      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });
      
      const geminiJson = await geminiRes.json();
      if (geminiJson.candidates?.[0]?.content?.parts?.[0]?.text) {
        aiData = JSON.parse(geminiJson.candidates[0].content.parts[0].text);
      }
    }

    // 4. UPSERT FINAL - Popula o banco automaticamente
    const { data: finalClub, error: upsertError } = await supabase
      .from("clubes_cache")
      .upsert({
        nome: teamData?.team?.name || club_name,
        nome_curto: teamData?.team?.code || club_name.substring(0, 3).toUpperCase(),
        cidade: teamData?.venue?.city || "Brasil",
        pais: teamData?.team?.country || "Brasil",
        escudo_url: teamData?.team?.logo || (cachedClub?.escudo_url || ""),
        api_id: teamData?.team?.id || null,
        cor_primaria: aiData.cor_primaria,
        cor_secundaria: aiData.cor_secundaria,
        cor_terciaria: aiData.cor_terciaria,
        mascote: aiData.mascote,
        tem_feminino: aiData.tem_feminino,
        atualizado_em: new Date().toISOString()
      }, { onConflict: "nome" })
      .select()
      .single();

    if (upsertError) throw upsertError;

    return new Response(JSON.stringify({ success: true, club: finalClub }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: corsHeaders,
    });
  }
});

/**
 * [RODAPÉ TÉCNICO]
 * Versão: 35.0 - Finalização Gemini 1.5 Flash.
 * Removida dependência da OpenAI. Automação de cores e mascote ativa.
 */