
-- 1) Corrigir purge_fake_votes: NUNCA truncar; apagar somente fictícios em lotes
CREATE OR REPLACE FUNCTION public.purge_fake_votes()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_email text;
  v_limit integer := 2000;
  v_removidos integer := 0;
  v_meta_removidos integer := 0;
  v_remaining integer := 0;
BEGIN
  PERFORM set_config('statement_timeout', '20000', true);

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL OR v_email <> 'betoborelli9@gmail.com' THEN
    RAISE EXCEPTION 'Acesso negado: apenas master admin.';
  END IF;

  CREATE TEMP TABLE _fake_votes_batch (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL
  ) ON COMMIT DROP;

  -- Selecionar SOMENTE votos fictícios
  INSERT INTO _fake_votes_batch (id, user_id)
  SELECT v.id, v.user_id
  FROM public.votos v
  WHERE v.status_integridade = 'ficticio'
  ORDER BY v.id
  LIMIT v_limit;

  -- Limpar tracking dos fictícios (se houver)
  DELETE FROM public.votos_tracking t
  USING _fake_votes_batch b
  WHERE t.voto_id = b.id;

  -- Limpar meta dos fictícios
  WITH del_meta AS (
    DELETE FROM public.votos_ficticios_meta m
    USING _fake_votes_batch b
    WHERE m.user_id = b.user_id
    RETURNING 1
  )
  SELECT count(*) INTO v_meta_removidos FROM del_meta;

  -- Apagar APENAS fictícios (votos reais nunca são tocados)
  WITH del AS (
    DELETE FROM public.votos v
    USING _fake_votes_batch b
    WHERE v.id = b.id
      AND v.status_integridade = 'ficticio'
    RETURNING 1
  )
  SELECT count(*) INTO v_removidos FROM del;

  IF v_removidos = v_limit THEN
    SELECT 1 INTO v_remaining
    FROM public.votos
    WHERE status_integridade = 'ficticio'
    LIMIT 1;
  END IF;

  RETURN json_build_object(
    'removidos', v_removidos,
    'meta_removidos', v_meta_removidos,
    'has_more', COALESCE(v_remaining, 0) > 0,
    'modo', 'soft_delete_ficticios'
  );
END;
$function$;

-- 2) Nova RPC: seed multi-região (várias cidades/bairros já cacheados no Brasil)
CREATE OR REPLACE FUNCTION public.seed_fake_votes_multi(p_quantidade integer DEFAULT 1000)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_email text;
  v_inseridos integer := 0;
  v_cidades_count integer := 0;
  v_inserted_ids uuid[];
BEGIN
  PERFORM set_config('statement_timeout', '30000', true);

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL OR v_email <> 'betoborelli9@gmail.com' THEN
    RAISE EXCEPTION 'Acesso negado: apenas master admin.';
  END IF;

  p_quantidade := LEAST(GREATEST(COALESCE(p_quantidade, 1000), 1), 10000);

  -- Cidades brasileiras disponíveis no cache oficial de bairros
  SELECT count(DISTINCT city) INTO v_cidades_count
  FROM public.geo_neighborhood_cache
  WHERE lower(country) IN ('brazil','brasil','br');

  IF v_cidades_count = 0 THEN
    RAISE EXCEPTION 'Nenhuma cidade brasileira no geo_neighborhood_cache. Sincronize bairros primeiro.';
  END IF;

  -- Verificar clubes
  IF NOT EXISTS (SELECT 1 FROM public.clubes_cache WHERE nome IS NOT NULL) THEN
    RAISE EXCEPTION 'clubes_cache vazio.';
  END IF;

  -- Bulk insert: para cada vôto, pega um bairro/cidade aleatório (Brasil) e
  -- escolhe um clube regional do mesmo estado (fallback: qualquer clube BR)
  WITH br_geo AS (
    SELECT g.city, g.state, g.neighborhood, g.country
    FROM public.geo_neighborhood_cache g
    WHERE lower(g.country) IN ('brazil','brasil','br')
      AND g.neighborhood IS NOT NULL
      AND length(trim(g.neighborhood)) > 0
  ),
  geo_indexed AS (
    SELECT row_number() OVER () AS rn, city, state, neighborhood, country,
           count(*) OVER () AS total
    FROM br_geo
  ),
  br_clubs AS (
    SELECT nome, cidade
    FROM public.clubes_cache
    WHERE nome IS NOT NULL
      AND (pais ILIKE 'Brazil' OR pais ILIKE 'Brasil' OR pais = 'BR')
  ),
  br_clubs_indexed AS (
    SELECT row_number() OVER () AS rn, nome, cidade,
           count(*) OVER () AS total
    FROM br_clubs
  ),
  series AS (
    SELECT generate_series(1, p_quantidade) AS i
  ),
  picks AS (
    SELECT
      gen_random_uuid() AS uid,
      g.city, g.state, g.neighborhood, g.country
    FROM series s
    JOIN geo_indexed g
      ON g.rn = 1 + floor(random() * g.total)::int
  ),
  picks_with_club AS (
    SELECT
      p.uid, p.city, p.state, p.neighborhood, p.country,
      COALESCE(
        -- Tenta clube regional (mesma cidade)
        (SELECT nome FROM br_clubs
         WHERE cidade IS NOT NULL
           AND lower(unaccent(cidade)) = lower(unaccent(p.city))
         ORDER BY random() LIMIT 1),
        -- Fallback: qualquer clube BR
        (SELECT nome FROM br_clubs_indexed
         WHERE rn = 1 + floor(random() * total)::int
         LIMIT 1)
      ) AS clube
    FROM picks p
  ),
  ins AS (
    INSERT INTO public.votos(
      user_id, clube_nome, pais, estado, cidade, bairro,
      voto_cidade, voto_pais, voto_continente,
      is_original_vote, is_fraud_attempt, is_suspicious, status_integridade
    )
    SELECT
      uid, clube, 'Brazil', state, city, neighborhood,
      city, 'Brazil', 'América do Sul',
      true, false, false, 'ficticio'
    FROM picks_with_club
    WHERE clube IS NOT NULL
    RETURNING user_id
  )
  SELECT array_agg(user_id) INTO v_inserted_ids FROM ins;

  v_inseridos := COALESCE(array_length(v_inserted_ids, 1), 0);

  INSERT INTO public.votos_ficticios_meta(user_id, nome_exibicao, codigo_indicacao)
  SELECT
    uid,
    'Fictício ' || upper(substr(uid::text, 1, 6)),
    upper(substr(replace(uid::text, '-', ''), 1, 6))
  FROM unnest(v_inserted_ids) AS uid;

  RETURN json_build_object(
    'inseridos', v_inseridos,
    'cidades_disponiveis', v_cidades_count,
    'modo', 'multi_regiao_brasil'
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.seed_fake_votes_multi(integer) TO authenticated;
