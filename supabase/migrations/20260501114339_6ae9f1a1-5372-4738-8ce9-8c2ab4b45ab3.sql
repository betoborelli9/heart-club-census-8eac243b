CREATE TABLE IF NOT EXISTS public.geo_neighborhood_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country text NOT NULL,
  state text,
  city text NOT NULL,
  neighborhood text NOT NULL,
  osm_id bigint,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (country, state, city, neighborhood)
);

ALTER TABLE public.geo_neighborhood_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Geo neighborhoods are readable by everyone" ON public.geo_neighborhood_cache;
CREATE POLICY "Geo neighborhoods are readable by everyone"
ON public.geo_neighborhood_cache
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Authenticated users can cache official neighborhoods" ON public.geo_neighborhood_cache;
CREATE POLICY "Authenticated users can cache official neighborhoods"
ON public.geo_neighborhood_cache
FOR INSERT
TO authenticated
WITH CHECK (
  length(trim(country)) > 0
  AND length(trim(city)) > 0
  AND length(trim(neighborhood)) > 0
);

DROP POLICY IF EXISTS "Authenticated users can refresh official neighborhoods" ON public.geo_neighborhood_cache;
CREATE POLICY "Authenticated users can refresh official neighborhoods"
ON public.geo_neighborhood_cache
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (
  length(trim(country)) > 0
  AND length(trim(city)) > 0
  AND length(trim(neighborhood)) > 0
);

CREATE INDEX IF NOT EXISTS idx_geo_neighborhood_cache_lookup
ON public.geo_neighborhood_cache (country, state, city, neighborhood);

CREATE INDEX IF NOT EXISTS idx_geo_neighborhood_cache_city
ON public.geo_neighborhood_cache (city);

CREATE OR REPLACE FUNCTION public.set_geo_neighborhood_cache_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_geo_neighborhood_cache_updated_at ON public.geo_neighborhood_cache;
CREATE TRIGGER trg_geo_neighborhood_cache_updated_at
BEFORE UPDATE ON public.geo_neighborhood_cache
FOR EACH ROW
EXECUTE FUNCTION public.set_geo_neighborhood_cache_updated_at();

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
  v_locations jsonb;
  v_nomes text[] := ARRAY[
    'Carlos Silva','Ana Souza','João Pereira','Maria Santos','Pedro Lima',
    'Beatriz Costa','Lucas Almeida','Juliana Rocha','Rafael Mendes','Fernanda Dias',
    'Ricardo Gomes','Patrícia Ribeiro','Bruno Carvalho','Camila Nunes','Gustavo Araújo',
    'Larissa Pinto','Felipe Barbosa','Mariana Castro','Thiago Moreira','Aline Cardoso',
    'Eduardo Martins','Vanessa Oliveira','Marcelo Teixeira','Renata Lopes','Diego Fernandes'
  ];
  v_clube text;
  v_loc jsonb;
  v_pais text;
  v_cidade text;
  v_estado text;
  v_continente text;
  v_bairro text;
  v_user uuid;
  v_nome text;
  v_codigo text;
  v_indicador uuid;
  v_existing uuid[];
  v_locations_count integer;
  i integer;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL OR v_email <> 'betoborelli9@gmail.com' THEN
    RAISE EXCEPTION 'Acesso negado: apenas master admin.';
  END IF;

  p_quantidade := LEAST(GREATEST(COALESCE(p_quantidade, 5000), 1), 50000);

  SELECT jsonb_agg(
    jsonb_build_object(
      'cidade', city,
      'estado', COALESCE(state, city),
      'pais', country,
      'continente', CASE
        WHEN lower(country) IN ('brazil', 'brasil', 'argentina', 'uruguay', 'chile') THEN 'América do Sul'
        WHEN lower(country) IN ('usa', 'united states', 'canada', 'mexico') THEN 'América do Norte'
        WHEN lower(country) IN ('spain', 'england', 'germany', 'france', 'italy') THEN 'Europa'
        WHEN lower(country) IN ('japan', 'south korea', 'saudi arabia') THEN 'Ásia'
        WHEN lower(country) IN ('australia') THEN 'Oceania'
        WHEN lower(country) IN ('egypt', 'nigeria', 'south africa') THEN 'África'
        ELSE 'Global'
      END
    )
    ORDER BY CASE WHEN lower(city) IN ('goiânia', 'goiania') THEN 0 ELSE 1 END, city
  ) INTO v_locations
  FROM (
    SELECT DISTINCT country, state, city
    FROM public.geo_neighborhood_cache
    WHERE length(trim(neighborhood)) > 0
  ) cached_locations;

  IF v_locations IS NULL OR jsonb_array_length(v_locations) = 0 THEN
    RAISE EXCEPTION 'Cache de bairros vazio. Abra uma cidade no Mapa de Calor primeiro para baixar/cachear os bairros oficiais do GeoJSON.';
  END IF;

  v_locations_count := jsonb_array_length(v_locations);

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

    IF random() < 0.7 AND EXISTS (
      SELECT 1 FROM public.geo_neighborhood_cache WHERE lower(city) IN ('goiânia', 'goiania')
    ) THEN
      SELECT jsonb_build_object('cidade', city, 'estado', COALESCE(state, city), 'pais', country, 'continente', 'América do Sul')
      INTO v_loc
      FROM public.geo_neighborhood_cache
      WHERE lower(city) IN ('goiânia', 'goiania')
      GROUP BY country, state, city
      ORDER BY random()
      LIMIT 1;
    ELSE
      v_loc := v_locations -> floor(random() * v_locations_count)::int;
    END IF;

    v_cidade := COALESCE(NULLIF(v_loc ->> 'cidade', ''), 'São Paulo');
    v_estado := COALESCE(NULLIF(v_loc ->> 'estado', ''), v_cidade);
    v_pais := COALESCE(NULLIF(v_loc ->> 'pais', ''), 'Brazil');
    v_continente := COALESCE(NULLIF(v_loc ->> 'continente', ''), 'Global');

    SELECT neighborhood INTO v_bairro
    FROM public.geo_neighborhood_cache
    WHERE lower(country) = lower(v_pais)
      AND lower(city) = lower(v_cidade)
      AND COALESCE(lower(state), '') = COALESCE(lower(v_estado), '')
    ORDER BY power(random(), 1.6)
    LIMIT 1;

    IF v_bairro IS NULL THEN
      SELECT neighborhood INTO v_bairro
      FROM public.geo_neighborhood_cache
      WHERE lower(city) = lower(v_cidade)
      ORDER BY power(random(), 1.6)
      LIMIT 1;
    END IF;

    IF v_bairro IS NULL THEN
      CONTINUE;
    END IF;

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
      v_user, v_clube, v_pais, v_estado, v_cidade, v_bairro,
      v_cidade, v_pais, v_continente,
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
    'total_clubes', array_length(v_clubes, 1),
    'localidades_cacheadas', v_locations_count,
    'modo', 'ficticio_bairros_geojson_cache'
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.seed_fake_votes(integer) TO authenticated;