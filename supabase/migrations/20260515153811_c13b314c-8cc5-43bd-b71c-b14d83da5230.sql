CREATE OR REPLACE FUNCTION public.seed_fake_votes_multi(p_quantidade integer DEFAULT 1000)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_inseridos integer := 0;
  v_cidades_count integer := 0;
  v_inserted_ids uuid[];
  v_geo_count integer := 0;
  v_club_count integer := 0;
BEGIN
  PERFORM set_config('statement_timeout', '60000', true);

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL OR v_email <> 'betoborelli9@gmail.com' THEN
    RAISE EXCEPTION 'Acesso negado: apenas master admin.';
  END IF;

  p_quantidade := LEAST(GREATEST(COALESCE(p_quantidade, 1000), 1), 10000);

  SELECT count(DISTINCT city || '|' || state) INTO v_cidades_count
  FROM public.geo_neighborhood_cache
  WHERE lower(country) IN ('brazil','brasil','br')
    AND city IS NOT NULL
    AND state IS NOT NULL
    AND neighborhood IS NOT NULL
    AND length(trim(city)) > 0
    AND length(trim(state)) > 0
    AND length(trim(neighborhood)) > 0;

  IF v_cidades_count = 0 THEN
    RAISE EXCEPTION 'Nenhuma cidade brasileira no geo_neighborhood_cache. Sincronize bairros primeiro.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.clubes_cache WHERE nome IS NOT NULL) THEN
    RAISE EXCEPTION 'clubes_cache vazio.';
  END IF;

  CREATE TEMP TABLE _tmp_geo ON COMMIT DROP AS
    SELECT row_number() OVER (ORDER BY city, state, neighborhood) AS rn,
           city, state, neighborhood
    FROM public.geo_neighborhood_cache
    WHERE lower(country) IN ('brazil','brasil','br')
      AND city IS NOT NULL
      AND state IS NOT NULL
      AND neighborhood IS NOT NULL
      AND length(trim(city)) > 0
      AND length(trim(state)) > 0
      AND length(trim(neighborhood)) > 0;

  CREATE TEMP TABLE _tmp_clubs ON COMMIT DROP AS
    SELECT row_number() OVER (ORDER BY nome) AS rn,
           nome,
           cidade,
           lower(unaccent(trim(split_part(COALESCE(cidade, ''), ',', 1)))) AS cidade_norm
    FROM public.clubes_cache
    WHERE nome IS NOT NULL
      AND (pais ILIKE 'Brazil' OR pais ILIKE 'Brasil' OR pais = 'BR' OR pais IS NULL);

  SELECT count(*) INTO v_geo_count FROM _tmp_geo;
  SELECT count(*) INTO v_club_count FROM _tmp_clubs;

  IF v_geo_count = 0 THEN
    RAISE EXCEPTION 'Nenhum bairro brasileiro válido encontrado.';
  END IF;

  IF v_club_count = 0 THEN
    RAISE EXCEPTION 'Nenhum clube brasileiro válido encontrado.';
  END IF;

  WITH picks AS (
    SELECT
      generate_series(1, p_quantidade) AS i,
      (floor(random() * v_geo_count)::int + 1) AS geo_rn,
      (floor(random() * v_club_count)::int + 1) AS fallback_club_rn,
      gen_random_uuid() AS uid
  ),
  chosen AS (
    SELECT
      p.uid,
      g.city,
      g.state,
      g.neighborhood,
      COALESCE(city_club.nome, fallback_club.nome) AS clube
    FROM picks p
    JOIN _tmp_geo g ON g.rn = p.geo_rn
    LEFT JOIN LATERAL (
      SELECT tc.nome
      FROM _tmp_clubs tc
      WHERE tc.cidade_norm = lower(unaccent(g.city))
      ORDER BY random() + (p.i * 0)
      LIMIT 1
    ) city_club ON true
    LEFT JOIN _tmp_clubs fallback_club ON fallback_club.rn = p.fallback_club_rn
  ),
  ins AS (
    INSERT INTO public.votos(
      user_id, clube_nome, pais, estado, cidade, bairro,
      voto_cidade, voto_pais, voto_continente,
      is_original_vote, is_fraud_attempt, is_suspicious, status_integridade,
      status_aprovacao
    )
    SELECT
      uid, clube, 'Brazil', state, city, neighborhood,
      city, 'Brazil', 'América do Sul',
      true, false, false, 'ficticio',
      'aprovado'
    FROM chosen
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
  FROM unnest(COALESCE(v_inserted_ids, ARRAY[]::uuid[])) AS uid;

  RETURN json_build_object(
    'inseridos', v_inseridos,
    'cidades_disponiveis', v_cidades_count,
    'modo', 'multi_regiao_brasil_v3',
    'geo_pool', v_geo_count,
    'clubes_pool', v_club_count
  );
END;
$$;