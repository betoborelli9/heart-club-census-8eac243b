/**
 * [CAMINHO]: supabase/functions/track-email-open/index.ts
 * [MODULO]: Pixel invisivel de rastreamento de leitura — embutido no HTML
 * dos e-mails de campanha (send-email-campaign). O cliente de e-mail do
 * torcedor carrega essa imagem 1x1 quando ele abre o e-mail; aqui a gente
 * so marca "aberto" e devolve um GIF transparente, sempre, mesmo se o id
 * nao existir ou der erro (nunca pode quebrar a exibicao do e-mail).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// GIF 1x1 transparente, em bytes.
const PIXEL = Uint8Array.from(
  atob("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="),
  (c) => c.charCodeAt(0),
);

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (id) {
      const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
      await admin.rpc("track_email_open", { p_id: id });
    }
  } catch (e) {
    console.warn("[track-email-open] falha ao registrar abertura:", e);
  }

  return new Response(PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
