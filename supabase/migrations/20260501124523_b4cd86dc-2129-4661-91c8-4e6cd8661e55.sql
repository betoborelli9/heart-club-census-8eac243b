-- Prevent purge_invalid_fake_votes from timing out by making it batch-based.
CREATE INDEX IF NOT EXISTS idx_votos_fake_empty_bairro
  ON public.votos (id, user_id)
  WHERE status_integridade = 'ficticio'
    AND (bairro IS NULL OR length(trim(bairro)) = 0);

CREATE INDEX IF NOT EXISTS idx_votos_fake_geo_match
  ON public.votos (
    lower(trim(pais)),
    lower(trim(COALESCE(NULLIF(voto_cidade, ''), cidade))),
    lower(trim(bairro))
  )
  WHERE status_integridade = 'ficticio'
    AND bairro IS NOT NULL
    AND length(trim(bairro)) > 0;

CREATE INDEX IF NOT EXISTS idx_geo_cache_geo_match
  ON public.geo_neighborhood_cache (
    lower(trim(country)),
    lower(trim(city)),
    lower(trim(neighborhood))
  );

CREATE OR REPLACE FUNCTION public.purge_invalid_fake_votes()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_email text;
  v_limit integer := 1000;
  v_removidos integer := 0;
  v_meta_removidos integer := 0;
  v_remaining integer := 0;
BEGIN
  PERFORM set_config('statement_timeout', '15000', true);

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL OR v_email <> 'betoborelli9@gmail.com' THEN
    RAISE EXCEPTION 'Acesso negado: apenas master admin.';
  END IF;

  CREATE TEMP TABLE _invalid_fake_votes_batch (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO _invalid_fake_votes_batch (id, user_id)
  SELECT v.id, v.user_id
  FROM public.votos v
  WHERE v.status_integridade = 'ficticio'
    AND (
      v.bairro IS NULL
      OR length(trim(v.bairro)) = 0
      OR NOT EXISTS (
        SELECT 1
        FROM public.geo_neighborhood_cache g
        WHERE lower(trim(g.country)) = lower(trim(v.pais))
          AND lower(trim(g.city)) = lower(trim(COALESCE(NULLIF(v.voto_cidade, ''), v.cidade)))
          AND lower(trim(g.neighborhood)) = lower(trim(v.bairro))
      )
    )
  ORDER BY v.id
  LIMIT v_limit;

  WITH del_meta AS (
    DELETE FROM public.votos_ficticios_meta m
    USING _invalid_fake_votes_batch i
    WHERE m.user_id = i.user_id
    RETURNING 1
  )
  SELECT count(*) INTO v_meta_removidos FROM del_meta;

  WITH del AS (
    DELETE FROM public.votos v
    USING _invalid_fake_votes_batch i
    WHERE v.id = i.id
    RETURNING 1
  )
  SELECT count(*) INTO v_removidos FROM del;

  IF v_removidos = v_limit THEN
    SELECT count(*) INTO v_remaining
    FROM (
      SELECT v.id
      FROM public.votos v
      WHERE v.status_integridade = 'ficticio'
        AND (
          v.bairro IS NULL
          OR length(trim(v.bairro)) = 0
          OR NOT EXISTS (
            SELECT 1
            FROM public.geo_neighborhood_cache g
            WHERE lower(trim(g.country)) = lower(trim(v.pais))
              AND lower(trim(g.city)) = lower(trim(COALESCE(NULLIF(v.voto_cidade, ''), v.cidade)))
              AND lower(trim(g.neighborhood)) = lower(trim(v.bairro))
          )
        )
      LIMIT 1
    ) remaining_probe;
  END IF;

  RETURN json_build_object(
    'removidos', v_removidos,
    'meta_removidos', v_meta_removidos,
    'has_more', v_remaining > 0,
    'batch_size', v_limit
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.purge_invalid_fake_votes() TO authenticated;