/**
 * [EDGE FUNCTION]: backfill-vote-location
 * Preenche cidade/estado/pais nos votos que ainda não têm localização,
 * consultando ip-api.com a partir do ip_address gravado. Admin-only.
 * Não altera votos que já têm cidade/estado preenchidos.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

interface Vote {
  id: string;
  ip_address: string | null;
  cidade: string | null;
  estado: string | null;
  pais: string | null;
}

function normalizePais(name: string | null): string | null {
  if (!name) return null;
  const lower = name.toLowerCase().trim();
  if (lower === "brazil" || lower === "brasil") return "BR";
  return name;
}

async function lookupIp(ip: string): Promise<{ cidade: string | null; estado: string | null; pais: string | null }> {
  try {
    const r = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city&lang=pt-BR`);
    const j = await r.json();
    if (j.status !== "success") return { cidade: null, estado: null, pais: null };
    return {
      cidade: j.city || null,
      estado: j.regionName || null,
      pais: normalizePais(j.country),
    };
  } catch {
    return { cidade: null, estado: null, pais: null };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Verificar admin via token do usuário
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    const isMaster = user.email?.toLowerCase() === "betoborelli9@gmail.com";
    if (!isAdmin && !isMaster) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Busca votos sem cidade
    const { data: votes, error } = await admin
      .from("votos")
      .select("id, ip_address, cidade, estado, pais")
      .or("cidade.is.null,cidade.eq.")
      .not("ip_address", "is", null)
      .limit(200);

    if (error) throw error;

    let updated = 0;
    let skipped = 0;
    for (const v of (votes as Vote[]) || []) {
      if (!v.ip_address) { skipped++; continue; }
      const geo = await lookupIp(v.ip_address);
      if (!geo.cidade && !geo.estado) { skipped++; continue; }
      const patch: Record<string, string> = {};
      if (geo.cidade && !v.cidade) patch.cidade = geo.cidade;
      if (geo.estado && !v.estado) patch.estado = geo.estado;
      if (geo.pais && !v.pais) patch.pais = geo.pais;
      if (Object.keys(patch).length === 0) { skipped++; continue; }
      const { error: upErr } = await admin.from("votos").update(patch).eq("id", v.id);
      if (!upErr) updated++;
      // Rate limit ip-api (free: 45 req/min)
      await new Promise((r) => setTimeout(r, 1400));
    }

    return new Response(JSON.stringify({ ok: true, scanned: votes?.length || 0, updated, skipped }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
