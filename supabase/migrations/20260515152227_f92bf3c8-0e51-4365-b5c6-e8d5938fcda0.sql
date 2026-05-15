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
  PERFORM set_config('statement_timeout', '60000', true);

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL OR v_email <> 'betoborelli9@gmail.com' THEN
    RAISE EXCEPTION 'Acesso negado: apenas master admin.';
  END IF;

  p_quantidade := LEAST(GREATEST(COALESCE(p_quantidade, 1000), 1), 10000);

  SELECT count(DISTINCT city) INTO v_cidades_count
  FROM public.geo_neighborhood_cache
  WHERE lower(country) IN ('brazil','brasil','br');

  IF v_cidades_count = 0 THEN
    RAISE EXCEPTION 'Nenhuma cidade brasileira no geo_neighborhood_cache. Sincronize bairros primeiro.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.clubes_cache WHERE nome IS NOT NULL) THEN
    RAISE EXCEPTION 'clubes_cache vazio.';
  END IF;

  -- Materializa pools com índices sequenciais
  CREATE TEMP TABLE IF NOT EXISTS _tmp_geo ON COMMIT DROP AS
    SELECT row_number() OVER (ORDER BY random()) AS rn,
           city, state, neighborhood
    FROM public.geo_neighborhood_cache
    WHERE lower(country) IN ('brazil','brasil','br')
      AND neighborhood IS NOT NULL
      AND length(trim(neighborhood)) > 0;

  CREATE TEMP TABLE IF NOT EXISTS _tmp_clubs ON COMMIT DROP AS
    SELECT row_number() OVER (ORDER BY random()) AS rn,
           nome, cidade, lower(unaccent(COALESCE(cidade,''))) AS cidade_norm
    FROM public.clubes_cache
    WHERE nome IS NOT NULL
      AND (pais ILIKE 'Brazil' OR pais ILIKE 'Brasil' OR pais = 'BR');

  -- Seleção por linha usando LATERAL para reavaliar random() em cada iteração
  WITH series AS (
    SELECT generate_series(1, p_quantidade) AS i
  ),
  geo_picks AS (
    SELECT s.i, g.city, g.state, g.neighborhood
    FROM series s
    CROSS JOIN LATERAL (
      SELECT city, state, neighborhood
      FROM _tmp_geo
      OFFSET floor(random() * (SELECT count(*) FROM _tmp_geo))::int
      LIMIT 1
    ) g
  ),
  clube_picks AS (
    SELECT
      gp.*,
      COALESCE(
        (SELECT nome FROM _tmp_clubs
         WHERE cidade_norm = lower(unaccent(gp.city))
         ORDER BY random() LIMIT 1),
        (SELECT nome FROM _tmp_clubs
         OFFSET floor(random() * (SELECT count(*) FROM _tmp_clubs))::int
         LIMIT 1)
      ) AS clube,
      gen_random_uuid() AS uid
    FROM geo_picks gp
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
    FROM clube_picks
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
    'modo', 'multi_regiao_brasil_v2'
  );
END;
$function$;