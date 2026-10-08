-- ONDE ASSISTIR: canais de TV/streaming de cada jogo (card do próximo jogo).
-- Preenchido 2x por dia pela função `fixture-watch` (IA com pesquisa na web, só jogos dos próximos dias)
-- e pode ser corrigido à mão pelo Beto (fonte = 'admin'; a IA nunca sobrescreve o que o Beto definiu).
CREATE TABLE IF NOT EXISTS public.fixture_watch (
  fixture_id bigint PRIMARY KEY,
  canais text[] NOT NULL DEFAULT '{}',
  fonte text NOT NULL DEFAULT 'ia' CHECK (fonte IN ('ia', 'admin')),
  buscado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fixture_watch ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa pode LER (são só nomes de canais). Ninguém escreve direto: só a função (service role) e o admin pela RPC.
DROP POLICY IF EXISTS "fixture_watch leitura publica" ON public.fixture_watch;
CREATE POLICY "fixture_watch leitura publica" ON public.fixture_watch FOR SELECT TO anon, authenticated USING (true);

-- Admin/Master define os canais à mão (lista vazia = "a confirmar").
CREATE OR REPLACE FUNCTION public.admin_set_fixture_watch(p_fixture bigint, p_canais text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_or_master(auth.uid()) THEN
    RAISE EXCEPTION 'acesso restrito' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.fixture_watch (fixture_id, canais, fonte, buscado_em)
  VALUES (p_fixture, coalesce(p_canais, '{}'), 'admin', now())
  ON CONFLICT (fixture_id) DO UPDATE SET canais = excluded.canais, fonte = 'admin', buscado_em = now();
END;
$$;
REVOKE ALL ON FUNCTION public.admin_set_fixture_watch(bigint, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_fixture_watch(bigint, text[]) TO authenticated;

-- 2x por dia: 07h30 e 18h BRT (10h30 e 21h UTC). A função só pesquisa jogos dos próximos 8 dias e pula os já buscados há menos de 20h.
SELECT cron.schedule(
  'fixture-watch-twice-daily',
  '30 10,21 * * *',
  $$
  SELECT net.http_post(
    url:='https://tmttlchkqjtbusfdwyrx.supabase.co/functions/v1/fixture-watch',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtdHRsY2hrcWp0YnVzZmR3eXJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDcwNDUsImV4cCI6MjA4NzY4MzA0NX0.sW94fnT4_3O24aTLi9WEMTNekzlI7t1B-1aK6w4wJP0"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);

NOTIFY pgrst, 'reload schema';
