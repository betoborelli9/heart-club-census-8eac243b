CREATE OR REPLACE FUNCTION public.purge_fake_votes()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_email text;
  v_removidos integer;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL OR v_email <> 'betoborelli9@gmail.com' THEN
    RAISE EXCEPTION 'Acesso negado: apenas master admin.';
  END IF;

  DELETE FROM public.votos_ficticios_meta
  WHERE user_id IN (SELECT user_id FROM public.votos WHERE status_integridade = 'ficticio');

  WITH del AS (
    DELETE FROM public.votos
    WHERE status_integridade = 'ficticio'
    RETURNING 1
  )
  SELECT count(*) INTO v_removidos FROM del;

  RETURN json_build_object('removidos', COALESCE(v_removidos, 0));
END;
$function$;

CREATE OR REPLACE FUNCTION public.purge_invalid_fake_votes()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_email text;
  v_removidos integer;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL OR v_email <> 'betoborelli9@gmail.com' THEN
    RAISE EXCEPTION 'Acesso negado: apenas master admin.';
  END IF;

  DELETE FROM public.votos_ficticios_meta
  WHERE user_id IN (
    SELECT v.user_id
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
            AND COALESCE(lower(trim(g.state)), '') = COALESCE(lower(trim(v.estado)), '')
            AND lower(trim(g.neighborhood)) = lower(trim(v.bairro))
        )
      )
  );

  WITH del AS (
    DELETE FROM public.votos v
    WHERE v.status_integridade = 'ficticio'
      AND (
        v.bairro IS NULL
        OR length(trim(v.bairro)) = 0
        OR NOT EXISTS (
          SELECT 1
          FROM public.geo_neighborhood_cache g
          WHERE lower(trim(g.country)) = lower(trim(v.pais))
            AND lower(trim(g.city)) = lower(trim(COALESCE(NULLIF(v.voto_cidade, ''), v.cidade)))
            AND COALESCE(lower(trim(g.state)), '') = COALESCE(lower(trim(v.estado)), '')
            AND lower(trim(g.neighborhood)) = lower(trim(v.bairro))
        )
      )
    RETURNING 1
  )
  SELECT count(*) INTO v_removidos FROM del;

  RETURN json_build_object('removidos', COALESCE(v_removidos, 0));
END;
$function$;

CREATE OR REPLACE FUNCTION public.seed_fake_votes(p_quantidade integer DEFAULT 5000)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_email text;
  v_inseridos integer := 0;
  v_clubes text[];
  v_nomes text[] := ARRAY[
    'Carlos Silva','Ana Souza','João Pereira','Maria Santos','Pedro Lima',
    'Beatriz Costa','Lucas Almeida','Juliana Rocha','Rafael Mendes','Fernanda Dias',
    'Ricardo Gomes','Patrícia Ribeiro','Bruno Carvalho','Camila Nunes','Gustavo Araújo',
    'Larissa Pinto','Felipe Barbosa','Mariana Castro','Thiago Moreira','Aline Cardoso',
    'Eduardo Martins','Vanessa Oliveira','Marcelo Teixeira','Renata Lopes','Diego Fernandes'
  ];
  v_geo record;
  v_clube text;
  v_continente text;
  v_user uuid;
  v_nome text;
  v_codigo text;
  v_indicador uuid;
  v_existing uuid[];
  i integer;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL OR v_email <> 'betoborelli9@gmail.com' THEN
    RAISE EXCEPTION 'Acesso negado: apenas master admin.';
  END IF;

  p_quantidade := LEAST(GREATEST(COALESCE(p_quantidade, 5000), 1), 50000);

  IF NOT EXISTS (SELECT 1 FROM public.geo_neighborhood_cache WHERE length(trim(neighborhood)) > 0) THEN
    RAISE EXCEPTION 'Cache de bairros vazio. Abra uma cidade no Mapa de Calor primeiro para baixar/cachear os bairros oficiais do GeoJSON.';
  END IF;

  SELECT array_agg(nome ORDER BY nome) INTO v_clubes
  FROM public.clubes_cache
  WHERE nome IS NOT NULL AND length(trim(nome)) > 0;

  IF v_clubes IS NULL OR array_length(v_clubes, 1) = 0 THEN
    RAISE EXCEPTION 'clubes_cache está vazio.';
  END IF;

  SELECT array_agg(user_id) INTO v_existing
  FROM (
    SELECT user_id
    FROM public.votos_ficticios_meta
    ORDER BY created_at DESC
    LIMIT 500
  ) s;

  FOR i IN 1..p_quantidade LOOP
    v_clube := v_clubes[1 + floor(random() * array_length(v_clubes, 1))::int];

    SELECT country, state, city, neighborhood
    INTO v_geo
    FROM public.geo_neighborhood_cache
    WHERE length(trim(neighborhood)) > 0
    ORDER BY
      CASE WHEN lower(city) IN ('goiânia', 'goiania') THEN power(random(), 3.5) ELSE 1 + random() END,
      random()
    LIMIT 1;

    IF v_geo.neighborhood IS NULL THEN
      CONTINUE;
    END IF;

    v_continente := CASE
      WHEN lower(v_geo.country) IN ('brazil', 'brasil', 'argentina', 'uruguay', 'chile') THEN 'América do Sul'
      WHEN lower(v_geo.country) IN ('usa', 'united states', 'canada', 'mexico') THEN 'América do Norte'
      WHEN lower(v_geo.country) IN ('spain', 'england', 'germany', 'france', 'italy') THEN 'Europa'
      WHEN lower(v_geo.country) IN ('japan', 'south korea', 'saudi arabia') THEN 'Ásia'
      WHEN lower(v_geo.country) IN ('australia') THEN 'Oceania'
      WHEN lower(v_geo.country) IN ('egypt', 'nigeria', 'south africa') THEN 'África'
      ELSE 'Global'
    END;

    v_user := gen_random_uuid();
    v_nome := v_nomes[1 + floor(random() * array_length(v_nomes, 1))::int] || ' ' || upper(substr(v_user::text, 1, 4));
    v_codigo := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

    v_indicador := NULL;
    IF v_existing IS NOT NULL AND array_length(v_existing, 1) > 0 AND random() < 0.3 THEN
      v_indicador := v_existing[1 + floor(random() * array_length(v_existing, 1))::int];
    END IF;

    INSERT INTO public.votos(
      user_id, clube_nome, pais, estado, cidade, bairro,
      voto_cidade, voto_pais, voto_continente,
      is_original_vote, is_fraud_attempt, is_suspicious, status_integridade
    ) VALUES (
      v_user, v_clube, v_geo.country, COALESCE(v_geo.state, v_geo.city), v_geo.city, v_geo.neighborhood,
      v_geo.city, v_geo.country, v_continente,
      true, false, false, 'ficticio'
    );

    INSERT INTO public.votos_ficticios_meta(user_id, nome_exibicao, codigo_indicacao, indicado_por)
    VALUES (v_user, v_nome, v_codigo, v_indicador);

    IF i % 100 = 0 THEN
      v_existing := array_append(COALESCE(v_existing, ARRAY[]::uuid[]), v_user);
    END IF;

    v_inseridos := v_inseridos + 1;
  END LOOP;

  RETURN json_build_object(
    'inseridos', v_inseridos,
    'bairros_cacheados', (SELECT count(*) FROM public.geo_neighborhood_cache),
    'modo', 'somente_bairros_reais_geo_neighborhood_cache'
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.purge_fake_votes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.purge_invalid_fake_votes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_fake_votes(integer) TO authenticated;