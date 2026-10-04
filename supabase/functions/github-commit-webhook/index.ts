/**
 * [EDGE FUNCTION] github-commit-webhook
 *
 * Recebe o aviso de "push" do GitHub e grava em lovable_commit_alerts SOMENTE os commits
 * feitos pela Lovable (bot gpt-engineer-app / lovable). O alerta aparece só para admin/master.
 *
 * Segurança: a chamada vem do GitHub (sem login do Supabase), então o deploy é feito com
 * `--no-verify-jwt` e a autenticidade é garantida pela assinatura HMAC (X-Hub-Signature-256)
 * com o segredo GITHUB_WEBHOOK_SECRET. Sem assinatura válida => 401 e nada é gravado.
 *
 * NÃO chama API-Football e não lê dado de torcedor.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SECRET = Deno.env.get("GITHUB_WEBHOOK_SECRET") || "";
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const hex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");

async function validSignature(body: string, header: string | null): Promise<boolean> {
  if (!SECRET || !header || !header.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const expected = "sha256=" + hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
  if (expected.length !== header.length) return false;
  let diff = 0; // comparação em tempo constante
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ header.charCodeAt(i);
  return diff === 0;
}

const BOT_RE = /gpt-engineer-app|lovable/i;
const isLovable = (c: any) =>
  [c?.author?.name, c?.author?.username, c?.author?.email, c?.committer?.name, c?.committer?.username, c?.committer?.email]
    .some((v) => typeof v === "string" && BOT_RE.test(v));

// Arquivos da "porta de entrada" e do backend: mudança aqui merece alerta vermelho
const CRITICAL_RE = new RegExp(
  "^(src/integrations/supabase/|src/contexts/UserContext|src/pages/(Login|Landing|Splash|Voting|Verify|AuthCallback)|" +
  "src/App\\.tsx|src/main\\.tsx|supabase/migrations/|supabase/functions/|supabase/config\\.toml|" +
  "package\\.json|vercel\\.json|vite\\.config|index\\.html)",
  "i",
);

serve(async (req) => {
  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405);
  const raw = await req.text();
  if (!(await validSignature(raw, req.headers.get("x-hub-signature-256")))) {
    return json({ ok: false, error: "assinatura invalida" }, 401);
  }

  const event = req.headers.get("x-github-event");
  if (event === "ping") return json({ ok: true, pong: true });
  if (event !== "push") return json({ ok: true, ignored: event });

  let payload: any;
  try { payload = JSON.parse(raw); } catch { return json({ ok: false, error: "json" }, 400); }

  const branch = String(payload.ref || "").replace("refs/heads/", "");
  const commits: any[] = Array.isArray(payload.commits) ? payload.commits : [];
  const rows = commits.filter(isLovable).map((c) => {
    const files: string[] = [...(c.added || []), ...(c.modified || []), ...(c.removed || [])];
    const critical = files.filter((f) => CRITICAL_RE.test(f));
    return {
      sha: c.id,
      branch,
      author: c.author?.username || c.author?.name || null,
      message: String(c.message || "").slice(0, 500),
      committed_at: c.timestamp || null,
      files,
      critical_files: critical,
      is_critical: critical.length > 0,
      url: c.url || null,
    };
  });

  if (rows.length === 0) return json({ ok: true, lovable_commits: 0 });
  const { error } = await supabase.from("lovable_commit_alerts").upsert(rows, { onConflict: "sha", ignoreDuplicates: true });
  if (error) return json({ ok: false, error: error.message }, 500);
  return json({ ok: true, lovable_commits: rows.length });
});
