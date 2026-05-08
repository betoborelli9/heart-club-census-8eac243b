/**
 * [EDGE FUNCTION]: geo-ip
 * Resolve a localização aproximada (continente, país, estado, cidade, bairro, lat/lng, ISP)
 * via IP do request usando ip-api.com (free, sem chave). Sem JWT.
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const cache = new Map<string, { at: number; data: any }>();
const TTL_MS = 60 * 60 * 1000;

const rate = new Map<string, number[]>();
function rateLimited(ip: string) {
  const now = Date.now();
  const arr = (rate.get(ip) || []).filter((t) => now - t < 60_000);
  arr.push(now);
  rate.set(ip, arr);
  return arr.length > 30;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const fwd = req.headers.get("x-forwarded-for") || "";
  const ip = (fwd.split(",")[0] || "").trim() || "0.0.0.0";

  if (rateLimited(ip)) {
    return new Response(JSON.stringify({ error: "rate_limited" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const cached = cache.get(ip);
  if (cached && Date.now() - cached.at < TTL_MS) {
    return new Response(JSON.stringify(cached.data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const url = `http://ip-api.com/json/${ip === "0.0.0.0" ? "" : ip}?fields=status,continent,country,regionName,city,district,query,isp,org,lat,lon&lang=pt-BR`;
    const r = await fetch(url);
    const j = await r.json();
    if (j.status !== "success") {
      const empty = { ip, continente: null, pais: null, estado: null, cidade: null, bairro: null, lat: null, lng: null, isp: null };
      return new Response(JSON.stringify(empty), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = {
      ip: j.query || ip,
      continente: j.continent || null,
      pais: j.country || null,
      estado: j.regionName || null,
      cidade: j.city || null,
      bairro: j.district || null,
      lat: typeof j.lat === "number" ? j.lat : null,
      lng: typeof j.lon === "number" ? j.lon : null,
      isp: j.isp || j.org || null,
    };
    cache.set(ip, { at: Date.now(), data });
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "lookup_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
