-- CHAVINHAS POR FORMULARIO: o Beto liga/desliga, no Admin, quando cada card
-- de formulario passa a aparecer para os torcedores. Todas nascem DESLIGADAS:
-- enquanto desligada, o site se comporta exatamente como antes.
CREATE TABLE IF NOT EXISTS public.feature_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  label text NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Ninguem le/escreve a tabela direto: tudo passa pelas funcoes abaixo.
DROP POLICY IF EXISTS "Deny all client access to feature_flags" ON public.feature_flags;
CREATE POLICY "Deny all client access to feature_flags"
  ON public.feature_flags FOR ALL
  TO anon, authenticated
  USING (false) WITH CHECK (false);

INSERT INTO public.feature_flags (key, enabled, label, description) VALUES
  ('form_termos', false, 'Termos e Privacidade', 'Card de aceite dos Termos de Uso e da Política de Privacidade (LGPD)'),
  ('form_territorio', false, 'Território', 'Card explicando por que pedimos onde o torcedor mora; libera o Mapa de Calor'),
  ('form_socio', false, 'Renda e profissão', 'Card do perfil socioeconômico; libera Ranking e Estatísticas'),
  ('form_embaixador', false, 'Censo do Embaixador', 'Card do WhatsApp e da profissão na área de embaixador')
ON CONFLICT (key) DO NOTHING;

-- O site (qualquer pessoa) so precisa saber "esta ligado?". Nada sensivel aqui.
CREATE OR REPLACE FUNCTION public.get_feature_flags()
RETURNS TABLE(key text, enabled boolean, label text, description text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.key, f.enabled, f.label, f.description FROM public.feature_flags f ORDER BY f.key;
$$;

GRANT EXECUTE ON FUNCTION public.get_feature_flags() TO anon, authenticated;

-- So admin/master liga ou desliga.
CREATE OR REPLACE FUNCTION public.admin_set_feature_flag(p_key text, p_enabled boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_or_master(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  UPDATE public.feature_flags
     SET enabled = p_enabled, updated_at = now()
   WHERE key = p_key;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Chavinha inexistente: %', p_key;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_feature_flag(text, boolean) TO authenticated;
