/**
 * [CAMINHO]: supabase/functions/resolve-club-logo/index.ts
 * [OBJETIVO]: BLINDAGEM DE ESCUDOS — nunca retornar vazio.
 *   Cascata: clubes_cache -> API-Football proxy/base64 -> Wikipedia -> null.
 *   Ao encontrar em fonte externa, persiste em clubes_cache (upsert).
 * [ENTRADA]: { clubName: string }
 * [SAÍDA]: { url: string | null, source: "cache"|"api-football"|"wikipedia"|"none" }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const norm = (s: string) =>
  (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const canonical = (s: string) =>
  norm(s)
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(sport club|sport clube|football club|futebol clube|futbol club|clube de regatas|clube atletico|associacao atletica|esporte clube|esporte club|sociedade esportiva|club deportivo|atletico club|clube de futebol|sport|club|clube|fc|sc|ec|ac|cr|cf|aa|se|cd|ca)\b/g, " ")
    .replace(/\b(do|da|de|dos|das|of|the|el|la|los|las|del)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const isApiSportsAsset = (url: string) => /^https:\/\/media\.api-sports\.io\/football\/(teams|leagues)\/\d+\.png(?:\?.*)?$/i.test(url);

async function imageUrlToDataUrl(url: string): Promise<string | null> {
  if (!isApiSportsAsset(url)) return url;
  try {
    const r = await fetch(url, { redirect: "follow" });
    if (!r.ok) return null;
    const contentType = r.headers.get("content-type") || "image/png";
    if (!contentType.startsWith("image/")) return null;
    const bytes = new Uint8Array(await r.arrayBuffer());
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return `data:${contentType};base64,${btoa(binary)}`;
  } catch {
    return null;
  }
}

async function urlAlive(url: string): Promise<boolean> {
  try {
    const r = await fetch(url, { method: "HEAD", redirect: "follow" });
    if (r.ok) return true;
    // alguns CDNs bloqueiam HEAD
    const g = await fetch(url, { method: "GET" });
    return g.ok;
  } catch {
    return false;
  }
}

async function fromApiFootball(name: string): Promise<{ url: string; api_id: number } | null> {
  const key = Deno.env.get("API_FOOTBALL_KEY");
  if (!key) return null;
  try {
    const search = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const r = await fetch(
      `https://v3.football.api-sports.io/teams?search=${encodeURIComponent(search)}`,
      { headers: { "x-apisports-key": key } },
    );
    const j = await r.json();
    const wanted = canonical(name);
    const rows = j?.response || [];
    const exact = rows.find((item: any) => canonical(item?.team?.name || "") === wanted);
    const t = (exact || rows[0])?.team;
    if (t?.logo) return { url: t.logo, api_id: t.id };
  } catch {}
  return null;
}

async function fromWikipedia(name: string): Promise<string | null> {
  // 1) Busca a página
  try {
    const q = encodeURIComponent(`${name} football club`);
    const s = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srsearch=${q}&srlimit=1&origin=*`,
    );
    const sj = await s.json();
    const title = sj?.query?.search?.[0]?.title;
    if (!title) return null;
    // 2) Imagem principal (page image)
    const p = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=original&titles=${encodeURIComponent(title)}&origin=*`,
    );
    const pj = await p.json();
    const pages = pj?.query?.pages || {};
    for (const k of Object.keys(pages)) {
      const src = pages[k]?.original?.source;
      if (src) return src as string;
    }
  } catch {}
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { clubName, logoUrl } = await req.json();
    const name = (clubName || "").trim();

    // 0) URL DIRETA — quando o chamador já sabe o escudo exato do clube
    // específico (ex.: veio de uma linha de classificação ou resultado de
    // busca com api_id próprio), converte essa URL exata em vez de tentar
    // "adivinhar" por nome. Elimina qualquer risco de pegar o escudo de um
    // homônimo — o navegador do torcedor não consegue acessar
    // media.api-sports.io diretamente (DNS), mas o servidor consegue.
    if (typeof logoUrl === "string" && logoUrl.trim()) {
      const raw = logoUrl.trim();
      if (await urlAlive(raw)) {
        const safeUrl = await imageUrlToDataUrl(raw);
        return new Response(JSON.stringify({ url: safeUrl || raw, source: "direct" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // URL informada não respondeu — segue para a cascata por nome abaixo
      // (só quando também temos um clubName; senão devolve vazio).
    }

    if (!name) {
      return new Response(JSON.stringify({ url: null, source: "none" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1) CACHE
    const { data: rows } = await supabase
      .from("clubes_cache")
      .select("nome, escudo_url, api_id")
      .or(`nome.ilike.${name},nome_curto.ilike.${name}`)
      .limit(10);

    const row = (rows || []).find((r: any) => norm(r.nome || "") === norm(name))
      || (rows || []).find((r: any) => canonical(r.nome || "") === canonical(name));

    if (row?.escudo_url && (await urlAlive(row.escudo_url))) {
      const safeUrl = await imageUrlToDataUrl(row.escudo_url);
      return new Response(JSON.stringify({ url: safeUrl || row.escudo_url, source: "cache" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) API-FOOTBALL
    const api = await fromApiFootball(name);
    if (api?.url) {
      try {
        await supabase.from("clubes_cache").upsert(
          { nome: name, escudo_url: api.url, api_id: api.api_id },
          { onConflict: "nome" },
        );
      } catch {}
      const safeUrl = await imageUrlToDataUrl(api.url);
      return new Response(JSON.stringify({ url: safeUrl || api.url, source: "api-football" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3) WIKIPEDIA
    const wiki = await fromWikipedia(name);
    if (wiki) {
      try {
        await supabase.from("clubes_cache").upsert(
          { nome: name, escudo_url: wiki },
          { onConflict: "nome" },
        );
      } catch {}
      return new Response(JSON.stringify({ url: wiki, source: "wikipedia" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ url: null, source: "none" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ url: null, source: "none", error: String(e) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
