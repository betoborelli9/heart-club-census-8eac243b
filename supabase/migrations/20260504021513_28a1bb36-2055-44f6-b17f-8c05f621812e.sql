ALTER TABLE public.indicacoes ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS indicacoes_indicado_id_unique
ON public.indicacoes (indicado_id)
WHERE indicado_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS indicacoes_embaixador_id_idx
ON public.indicacoes (embaixador_id);

CREATE INDEX IF NOT EXISTS indicacoes_codigo_usado_idx
ON public.indicacoes (codigo_usado);

DROP POLICY IF EXISTS "Embaixador le suas indicacoes" ON public.indicacoes;
CREATE POLICY "Embaixador le suas indicacoes"
ON public.indicacoes
FOR SELECT
TO authenticated
USING (embaixador_id = auth.uid());

DROP POLICY IF EXISTS "Indicado le propria indicacao" ON public.indicacoes;
CREATE POLICY "Indicado le propria indicacao"
ON public.indicacoes
FOR SELECT
TO authenticated
USING (indicado_id = auth.uid());

CREATE OR REPLACE FUNCTION public.register_referral_from_code(p_codigo text, p_indicado_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_codigo text := nullif(trim(p_codigo), '');
  v_embaixador_id uuid;
BEGIN
  IF p_indicado_id IS NULL OR v_codigo IS NULL THEN
    RETURN false;
  END IF;

  SELECT id INTO v_embaixador_id
  FROM public.profiles
  WHERE upper(codigo_indicacao) = upper(v_codigo)
  LIMIT 1;

  IF v_embaixador_id IS NULL THEN
    BEGIN
      v_embaixador_id := v_codigo::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      v_embaixador_id := NULL;
    END;
  END IF;

  IF v_embaixador_id IS NULL OR v_embaixador_id = p_indicado_id THEN
    RETURN false;
  END IF;

  INSERT INTO public.indicacoes (embaixador_id, indicado_id, codigo_usado)
  VALUES (v_embaixador_id, p_indicado_id, v_codigo)
  ON CONFLICT (indicado_id) WHERE indicado_id IS NOT NULL
  DO UPDATE SET
    embaixador_id = excluded.embaixador_id,
    codigo_usado = excluded.codigo_usado;

  UPDATE public.ambassador_levels al
  SET referral_count = c.total,
      updated_at = now()
  FROM (
    SELECT count(*)::integer AS total
    FROM public.indicacoes
    WHERE embaixador_id = v_embaixador_id
  ) c
  WHERE al.user_id = v_embaixador_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_ambassador_referrals()
RETURNS TABLE (
  indicacao_id uuid,
  indicado_id uuid,
  nome text,
  cidade text,
  estado text,
  clube_nome text,
  bairro text,
  voto_id uuid,
  voto_created_at timestamptz,
  indicacao_created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.id AS indicacao_id,
    i.indicado_id,
    COALESCE(p.nome_exibicao, 'Novo membro') AS nome,
    p.cidade,
    p.estado,
    v.clube_nome,
    v.bairro,
    v.id AS voto_id,
    v.created_at AS voto_created_at,
    i.created_at AS indicacao_created_at
  FROM public.indicacoes i
  LEFT JOIN public.profiles p ON p.id = i.indicado_id
  LEFT JOIN public.votos v ON v.user_id = i.indicado_id AND v.is_original_vote = true
  WHERE i.embaixador_id = auth.uid()
  ORDER BY COALESCE(v.created_at, i.created_at) DESC;
$$;

INSERT INTO public.indicacoes (embaixador_id, indicado_id, codigo_usado)
SELECT 'f28d18e4-a595-40a7-b334-0a420138853a'::uuid, p.id, 'F50EAB'
FROM public.profiles p
WHERE p.id IN (
  'd26beaa2-6c7e-484c-969e-a957d44d49dc',
  '2c07349a-29aa-40be-9ce9-5e2de1bab58a',
  '8b971d1b-0ece-4e5c-8af6-4581214878e0',
  '6e042aa2-77e0-4697-a6d3-0edd0d7cdfb1',
  '0c97f52c-277d-4350-8d53-0e202c7eddb9'
)
ON CONFLICT (indicado_id) WHERE indicado_id IS NOT NULL
DO UPDATE SET
  embaixador_id = excluded.embaixador_id,
  codigo_usado = excluded.codigo_usado;

INSERT INTO public.ambassador_levels (user_id, scope_type, scope_value, level, referral_count)
VALUES ('f28d18e4-a595-40a7-b334-0a420138853a'::uuid, 'city', 'Goiânia', 'bronze', 5)
ON CONFLICT (user_id, scope_type)
DO UPDATE SET referral_count = 5, updated_at = now();