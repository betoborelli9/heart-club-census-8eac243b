/**
 * [CAMINHO]: supabase/functions/master-votes-admin/index.ts
 * [MÓDULO]: Painel Master — listagem e correção de votos de QUALQUER torcedor.
 * [REGRA]: Acesso exclusivo a betoborelli9@gmail.com (Master Admin).
 *          Usa SERVICE_ROLE internamente para contornar a RLS de `votos`,
 *          mas só após validar o JWT do chamador.
 *
 * Ações suportadas (body JSON):
 *   { action: "list", search?: string, limit?: number }
 *   { action: "update", vote_id: string, patch: { clube_nome?, sympathy_1?..sympathy_4? } }
 */
// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const MASTER_EMAIL = "betoborelli9@gmail.com";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/** Espelho TS de src/lib/canonical-club.ts (mantido independente). */
const GENERIC = new RegExp(
  String.raw`\b(sport club|sport clube|football club|futebol clube|futbol club|clube de regatas|clube atletico|associacao atletica|esporte clube|esporte club|sociedade esportiva|club deportivo|atletico club|clube de futebol|sport recife|sport|club|clube|fc|sc|ec|ac|cr|cf|aa|se|cd|ca|paulista|paulistano|carioca|mineiro|gaucho|catarinense|baiano)\b`,
  "g",
);
const STOP = /\b(do|da|de|dos|das|of|the|el|la|los|las|del)\b/g;
function canonKey(name?: string | null) {
  if (!name) return "";
  let s = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  s = s.replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  s = s.replace(GENERIC, " ").replace(STOP, " ");
  return s.replace(/\s+/g, " ").trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  try {
    const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    if (!jwt) return json({ error: "unauthenticated" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: userData, error: uErr } = await admin.auth.getUser(jwt);
    if (uErr || !userData?.user) return json({ error: "invalid token" }, 401);
    if ((userData.user.email || "").toLowerCase() !== MASTER_EMAIL) {
      return json({ error: "forbidden" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "list");

    // ─── LIST ────────────────────────────────────────────────
    if (action === "list") {
      const search = String(body?.search || "").trim();
      const limit = Math.min(Number(body?.limit || 200), 500);

      let q = admin
        .from("votos")
        .select(
          "id, created_at, user_id, email, clube_nome, sympathy_1, sympathy_2, sympathy_3, sympathy_4, cidade, estado, pais, status_aprovacao, is_original_vote",
        )
        .order("created_at", { ascending: false })
        .limit(limit);

      if (search) {
        const s = search.replace(/[%,()]/g, " ");
        q = q.or(
          `email.ilike.%${s}%,clube_nome.ilike.%${s}%,cidade.ilike.%${s}%`,
        );
      }
      const { data: votes, error: vErr } = await q;
      if (vErr) return json({ error: vErr.message }, 500);

      // Carrega cache de clubes para casar canônico
      const { data: cache } = await admin
        .from("clubes_cache")
        .select("nome, nome_curto, escudo_url, cidade, pais");
      const canonMap = new Map<string, any>();
      (cache || []).forEach((c: any) => {
        const k = canonKey(c.nome);
        if (k && !canonMap.has(k)) canonMap.set(k, c);
      });

      const enriched = (votes || []).map((v: any) => {
        const fields = ["clube_nome", "sympathy_1", "sympathy_2", "sympathy_3", "sympathy_4"] as const;
        const mismatches: Record<string, { current: string; suggestion: any | null }> = {};
        for (const f of fields) {
          const val = (v as any)[f];
          if (!val) continue;
          const k = canonKey(val);
          const hit = canonMap.get(k);
          // Marca como "errado" quando o nome bruto difere do nome canônico do cache.
          if (!hit) {
            mismatches[f] = { current: val, suggestion: null };
          } else if (hit.nome && hit.nome.trim().toLowerCase() !== String(val).trim().toLowerCase()) {
            mismatches[f] = { current: val, suggestion: hit };
          }
        }
        return { ...v, _mismatches: mismatches };
      });

      return json({ ok: true, votes: enriched });
    }

    // ─── UPDATE ──────────────────────────────────────────────
    if (action === "update") {
      const vote_id = String(body?.vote_id || "").trim();
      const patch = body?.patch || {};
      const ALLOWED = new Set([
        "clube_nome",
        "sympathy_1",
        "sympathy_2",
        "sympathy_3",
        "sympathy_4",
      ]);
      const clean: Record<string, any> = {};
      for (const [k, v] of Object.entries(patch)) {
        if (!ALLOWED.has(k)) continue;
        clean[k] = v == null ? null : String(v).trim() || null;
      }
      if (!vote_id || Object.keys(clean).length === 0) {
        return json({ error: "vote_id/patch required" }, 400);
      }

      const { data, error } = await admin
        .from("votos")
        .update(clean)
        .eq("id", vote_id)
        .select()
        .maybeSingle();
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, vote: data });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
