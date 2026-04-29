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
  v_locations jsonb := jsonb_build_array(
    jsonb_build_object('cidade','São Paulo','estado','SP','pais','Brazil','continente','América do Sul'),
    jsonb_build_object('cidade','Rio de Janeiro','estado','RJ','pais','Brazil','continente','América do Sul'),
    jsonb_build_object('cidade','Belo Horizonte','estado','MG','pais','Brazil','continente','América do Sul'),
    jsonb_build_object('cidade','Goiânia','estado','GO','pais','Brazil','continente','América do Sul'),
    jsonb_build_object('cidade','Salvador','estado','BA','pais','Brazil','continente','América do Sul'),
    jsonb_build_object('cidade','Porto Alegre','estado','RS','pais','Brazil','continente','América do Sul'),
    jsonb_build_object('cidade','Curitiba','estado','PR','pais','Brazil','continente','América do Sul'),
    jsonb_build_object('cidade','Recife','estado','PE','pais','Brazil','continente','América do Sul'),
    jsonb_build_object('cidade','Fortaleza','estado','CE','pais','Brazil','continente','América do Sul'),
    jsonb_build_object('cidade','Manaus','estado','AM','pais','Brazil','continente','América do Sul'),
    jsonb_build_object('cidade','Brasília','estado','DF','pais','Brazil','continente','América do Sul'),
    jsonb_build_object('cidade','Florianópolis','estado','SC','pais','Brazil','continente','América do Sul'),
    jsonb_build_object('cidade','Vitória','estado','ES','pais','Brazil','continente','América do Sul'),
    jsonb_build_object('cidade','Natal','estado','RN','pais','Brazil','continente','América do Sul'),
    jsonb_build_object('cidade','Belém','estado','PA','pais','Brazil','continente','América do Sul'),
    jsonb_build_object('cidade','Madrid','estado','Comunidad de Madrid','pais','Spain','continente','Europa'),
    jsonb_build_object('cidade','Barcelona','estado','Cataluña','pais','Spain','continente','Europa'),
    jsonb_build_object('cidade','London','estado','Greater London','pais','England','continente','Europa'),
    jsonb_build_object('cidade','Manchester','estado','Greater Manchester','pais','England','continente','Europa'),
    jsonb_build_object('cidade','Munich','estado','Bavaria','pais','Germany','continente','Europa'),
    jsonb_build_object('cidade','Dortmund','estado','North Rhine-Westphalia','pais','Germany','continente','Europa'),
    jsonb_build_object('cidade','Paris','estado','Île-de-France','pais','France','continente','Europa'),
    jsonb_build_object('cidade','Milan','estado','Lombardy','pais','Italy','continente','Europa'),
    jsonb_build_object('cidade','Turin','estado','Piedmont','pais','Italy','continente','Europa'),
    jsonb_build_object('cidade','Buenos Aires','estado','CABA','pais','Argentina','continente','América do Sul'),
    jsonb_build_object('cidade','Montevideo','estado','Montevideo','pais','Uruguay','continente','América do Sul'),
    jsonb_build_object('cidade','Santiago','estado','Región Metropolitana','pais','Chile','continente','América do Sul'),
    jsonb_build_object('cidade','New York','estado','NY','pais','USA','continente','América do Norte'),
    jsonb_build_object('cidade','Los Angeles','estado','CA','pais','USA','continente','América do Norte'),
    jsonb_build_object('cidade','Toronto','estado','Ontario','pais','Canada','continente','América do Norte'),
    jsonb_build_object('cidade','Mexico City','estado','CDMX','pais','Mexico','continente','América do Norte'),
    jsonb_build_object('cidade','Tokyo','estado','Tokyo','pais','Japan','continente','Ásia'),
    jsonb_build_object('cidade','Seoul','estado','Seoul','pais','South Korea','continente','Ásia'),
    jsonb_build_object('cidade','Riyadh','estado','Riyadh','pais','Saudi Arabia','continente','Ásia'),
    jsonb_build_object('cidade','Sydney','estado','NSW','pais','Australia','continente','Oceania'),
    jsonb_build_object('cidade','Cairo','estado','Cairo','pais','Egypt','continente','África'),
    jsonb_build_object('cidade','Lagos','estado','Lagos','pais','Nigeria','continente','África'),
    jsonb_build_object('cidade','Cape Town','estado','Western Cape','pais','South Africa','continente','África')
  );
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
    v_loc := v_locations -> floor(random() * v_locations_count)::int;

    v_cidade := COALESCE(NULLIF(v_loc ->> 'cidade', ''), 'São Paulo');
    v_estado := COALESCE(NULLIF(v_loc ->> 'estado', ''), v_cidade);
    v_pais := COALESCE(NULLIF(v_loc ->> 'pais', ''), 'Brazil');
    v_continente := COALESCE(NULLIF(v_loc ->> 'continente', ''), 'América do Sul');

    v_user := gen_random_uuid();
    v_nome := v_nomes[1 + floor(random() * array_length(v_nomes, 1))::int] || ' ' || upper(substr(v_user::text, 1, 4));
    v_codigo := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

    v_indicador := NULL;
    IF v_existing IS NOT NULL AND array_length(v_existing, 1) > 0 AND random() < 0.3 THEN
      v_indicador := v_existing[1 + floor(random() * array_length(v_existing, 1))::int];
    END IF;

    INSERT INTO public.votos(
      user_id,
      clube_nome,
      pais,
      estado,
      cidade,
      voto_cidade,
      voto_pais,
      voto_continente,
      is_original_vote,
      is_fraud_attempt,
      is_suspicious,
      status_integridade
    ) VALUES (
      v_user,
      v_clube,
      v_pais,
      v_estado,
      v_cidade,
      v_cidade,
      v_pais,
      v_continente,
      true,
      false,
      false,
      'ficticio'
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
    'localidades_disponiveis', v_locations_count,
    'modo', 'ficticio_diverso'
  );
END;
$function$;