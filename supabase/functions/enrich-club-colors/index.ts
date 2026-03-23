/**
 * [CAMINHO/ARQUIVO]: supabase/functions/enrich-club-colors/index.ts
 * Edge Function para enriquecer cores de clubes a partir da API-Football ou extração de logo.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* [MÓDULO: CORS] */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* [MÓDULO: EXTRAÇÃO DE COR DOMINANTE VIA IMAGEM] */
async function extractDominantColorFromLogo(logoUrl: string): Promise<string | null> {
  try {
    const res = await fetch(logoUrl);
    if (!res.ok) return null;

    const buffer = new Uint8Array(await res.arrayBuffer());

    // Análise simplificada de PNG/SVG — busca pixels predominantes
    // Para PNGs, lemos os bytes brutos e fazemos amostragem de cor
    let r = 0, g = 0, b = 0, count = 0;

    // Amostragem a cada 4 bytes (RGBA) nos últimos 30% do arquivo (corpo da imagem)
    const startOffset = Math.floor(buffer.length * 0.3);
    for (let i = startOffset; i < buffer.length - 3; i += 16) {
      const pr = buffer[i];
      const pg = buffer[i + 1];
      const pb = buffer[i + 2];
      const pa = buffer[i + 3];

      // Ignora pixels transparentes, brancos e pretos
      if (pa < 128) continue;
      if (pr > 240 && pg > 240 && pb > 240) continue;
      if (pr < 15 && pg < 15 && pb < 15) continue;

      r += pr;
      g += pg;
      b += pb;
      count++;
    }

    if (count < 10) return null;

    r = Math.round(r / count);
    g = Math.round(g / count);
    b = Math.round(b / count);

    const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    return hex;
  } catch (err) {
    console.error("Color extraction failed:", err);
    return null;
  }
}

/* [MÓDULO: BUSCA CORES NA API-FOOTBALL] */
async function fetchColorsFromApiFootball(
  teamId: number,
  apiKey: string
): Promise<{ primary: string | null; secondary: string | null }> {
  const result = { primary: null as string | null, secondary: null as string | null };

  try {
    // Tenta buscar dados do time pela API-Football (endpoint de time específico)
    const urls = [
      `https://v3.football.api-sports.io/teams?id=${teamId}`,
    ];

    for (const url of urls) {
      try {
        const res = await fetch(url, {
          headers: { "x-apisports-key": apiKey },
        });
        if (!res.ok) continue;

        const json = await res.json();
        const team = json?.response?.[0]?.team;
        if (!team) continue;

        // API-Football retorna colors no campo team.colors (quando disponível)
        if (team.colors) {
          if (team.colors.player?.primary) result.primary = `#${team.colors.player.primary}`;
          if (team.colors.player?.number) result.secondary = `#${team.colors.player.number}`;
        }

        // Se não temos cores da API mas temos logo, extraímos
        if (!result.primary && team.logo) {
          result.primary = await extractDominantColorFromLogo(team.logo);
        }

        if (result.primary) break;
      } catch {
        continue;
      }
    }
  } catch (err) {
    console.error("API-Football color fetch failed:", err);
  }

  return result;
}

/* [MÓDULO: HANDLER PRINCIPAL] */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = Deno.env.get("FOOTBALL_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const clubName = body.club_name as string | undefined;

    // Se um clube específico foi solicitado
    let query = supabase
      .from("clubes_cache")
      .select("api_id, nome, escudo_url, cor_primaria, cor_secundaria");

    if (clubName) {
      query = query.ilike("nome", `%${clubName}%`);
    } else {
      // Processa clubes sem cor definida
      query = query.is("cor_primaria", null);
    }

    const { data: clubs, error } = await query.limit(50);
    if (error) throw error;
    if (!clubs || clubs.length === 0) {
      return new Response(
        JSON.stringify({ message: "Nenhum clube para processar", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let processed = 0;
    const results: Array<{ nome: string; primary: string | null; secondary: string | null }> = [];

    for (const club of clubs) {
      let primary: string | null = club.cor_primaria;
      let secondary: string | null = club.cor_secundaria;

      // Se já tem cor e não é uma busca específica, pula
      if (primary && !clubName) continue;

      // 1. Tenta API-Football se temos api_id e chave
      if (!primary && club.api_id && apiKey) {
        const colors = await fetchColorsFromApiFootball(club.api_id, apiKey);
        primary = colors.primary;
        secondary = colors.secondary;
      }

      // 2. Fallback: extrai cor do logo
      if (!primary && club.escudo_url) {
        primary = await extractDominantColorFromLogo(club.escudo_url);
      }

      if (primary) {
        // Salva em clubes_cache
        await supabase
          .from("clubes_cache")
          .update({
            cor_primaria: primary,
            cor_secundaria: secondary || "#ffffff",
          })
          .eq("nome", club.nome);

        // Upsert em club_colors
        await supabase.from("club_colors").upsert(
          {
            club_name: club.nome,
            api_id: club.api_id,
            primary_color: primary,
            secondary_color: secondary || "#ffffff",
            is_locked: false,
          },
          { onConflict: "club_name" }
        );

        processed++;
        results.push({ nome: club.nome, primary, secondary });
      }

      // Rate limit: 300ms entre chamadas
      await new Promise((r) => setTimeout(r, 300));
    }

    return new Response(
      JSON.stringify({ message: `${processed} clubes processados`, processed, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("enrich-club-colors error:", err);
    return new Response(
      JSON.stringify({ error: "Enrichment temporarily unavailable" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
