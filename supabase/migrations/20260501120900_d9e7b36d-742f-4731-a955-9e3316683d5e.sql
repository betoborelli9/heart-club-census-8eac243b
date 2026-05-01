
-- Speed up neighborhood lookups
CREATE INDEX IF NOT EXISTS idx_geo_cache_lookup
  ON public.geo_neighborhood_cache (
    lower(trim(country)),
    lower(trim(city)),
    lower(trim(neighborhood))
  );

CREATE INDEX IF NOT EXISTS idx_votos_ficticio_bairro
  ON public.votos (status_integridade, bairro)
  WHERE status_integridade = 'ficticio';

-- Rewrite purge to be set-based and fast
CREATE OR REPLACE FUNCTION public.purge_invalid_fake_votes()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_email text;
  v_removidos integer := 0;
  v_meta_removidos integer := 0;
BEGIN
  -- Long timeout for this batch operation
  PERFORM set_config('statement_timeout', '120000', true);

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL OR v_email <> 'betoborelli9@gmail.com' THEN
    RAISE EXCEPTION 'Acesso negado: apenas master admin.';
  END IF;

  -- Stage invalid fake vote ids in a temp table using a single LEFT JOIN
  CREATE TEMP TABLE _invalid_fake_votes ON COMMIT DROP AS
  SELECT v.id, v.user_id
  FROM public.votos v
  LEFT JOIN public.geo_neighborhood_cache g
    ON lower(trim(g.country)) = lower(trim(v.pais))
   AND lower(trim(g.city)) = lower(trim(COALESCE(NULLIF(v.voto_cidade, ''), v.cidade)))
   AND lower(trim(g.neighborhood)) = lower(trim(v.bairro))
  WHERE v.status_integridade = 'ficticio'
    AND (
      v.bairro IS NULL
      OR length(trim(v.bairro)) = 0
      OR g.id IS NULL
    );

  WITH del_meta AS (
    DELETE FROM public.votos_ficticios_meta m
    USING _invalid_fake_votes i
    WHERE m.user_id = i.user_id
    RETURNING 1
  )
  SELECT count(*) INTO v_meta_removidos FROM del_meta;

  WITH del AS (
    DELETE FROM public.votos v
    USING _invalid_fake_votes i
    WHERE v.id = i.id
    RETURNING 1
  )
  SELECT count(*) INTO v_removidos FROM del;

  RETURN json_build_object('removidos', v_removidos, 'meta_removidos', v_meta_removidos);
END;
$function$;
