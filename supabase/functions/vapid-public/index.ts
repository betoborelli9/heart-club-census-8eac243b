import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
serve(() => new Response(Deno.env.get("VAPID_PUBLIC_KEY") || "", { headers: { "Access-Control-Allow-Origin": "*" } }));
