-- Recria função robusta de seed
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
  v_cidades_br text[][] := ARRAY[
    ARRAY['São Paulo','SP','Brazil','América do Sul'],
    ARRAY['Rio de Janeiro','RJ','Brazil','América do Sul'],
    ARRAY['Belo Horizonte','MG','Brazil','América do Sul'],
    ARRAY['Goiânia','GO','Brazil','América do Sul'],
    ARRAY['Salvador','BA','Brazil','América do Sul'],
    ARRAY['Porto Alegre','RS','Brazil','América do Sul'],
    ARRAY['Curitiba','PR','Brazil','América do Sul'],
    ARRAY['Recife','PE','Brazil','América do Sul'],
    ARRAY['Fortaleza','CE','Brazil','América do Sul'],
    ARRAY['Manaus','AM','Brazil','América do Sul'],
    ARRAY['Brasília','DF','Brazil','América do Sul'],
    ARRAY['Florianópolis','SC','Brazil','América do Sul'],
    ARRAY['Vitória','ES','Brazil','América do Sul'],
    ARRAY['Natal','RN','Brazil','América do Sul'],
    ARRAY['Belém','PA','Brazil','América do Sul']
  ];
  v_cidades_ext text[][] := ARRAY[
    ARRAY['Madrid','Comunidad de Madrid','Spain','Europa'],
    ARRAY['Barcelona','Cataluña','Spain','Europa'],
    ARRAY['London','Greater London','England','Europa'],
    ARRAY['Manchester','Greater Manchester','England','Europa'],
    ARRAY['Munich','Bavaria','Germany','Europa'],
    ARRAY['Dortmund','North Rhine-Westphalia','Germany','Europa'],
    ARRAY['Paris','Île-de-France','France','Europa'],
    ARRAY['Milan','Lombardy','Italy','Europa'],
    ARRAY['Turin','Piedmont','Italy','Europa'],
    ARRAY['Buenos Aires','CABA','Argentina','América do Sul'],
    ARRAY['New York','NY','USA','América do Norte'],
    ARRAY['Los Angeles','CA','USA','América do Norte'],
    ARRAY['Tokyo','Tokyo','Japan','Ásia'],
    ARRAY['Seoul','Seoul','South Korea','Ásia'],
    ARRAY['Sydney','NSW','Australia','Oceania'],
    ARRAY['Cairo','Cairo','Egypt','África']
  ];
  v_nomes text[] := ARRAY[
    'Carlos Silva','Ana Souza','João Pereira','Maria Santos','Pedro Lima',
    'Beatriz Costa','Lucas Almeida','Juliana Rocha','Rafael Mendes','Fernanda Dias',
    'Ricardo Gomes','Patrícia Ribeiro','Bruno Carvalho','Camila Nunes','Gustavo Araújo',
    'Larissa Pinto','Felipe Barbosa','Mariana Castro','Thiago Moreira','Aline Cardoso'
  ];
  v_clube text;
  v_loc text[];
  v_pais text;
  v_cidade text;
  v_estado text;
  v_continente text;
  v_user uuid;
  v_nome text;
  v_codigo text;
  i integer;
BEGIN
  -- Autorização: apenas master admin
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL OR v_email <> 'betoborelli9@gmail.com' THEN
    RAISE EXCEPTION 'Acesso negado: apenas master admin.';
  END IF;

  -- Coleta nomes de clubes do clubes_cache
  SELECT array_agg(nome) INTO v_clubes FROM clubes_cache WHERE nome IS NOT NULL AND length(trim(nome)) > 0;
  IF v_clubes IS NULL OR array_length(v_clubes,1) = 0 THEN
    RAISE EXCEPTION 'clubes_cache está vazio.';
  END IF;

  FOR i IN 1..p_quantidade LOOP
    v_clube := v_clubes[1 + floor(random()*array_length(v_clubes,1))::int];
    v_user := gen_random_uuid();
    v_nome := v_nomes[1 + floor(random()*array_length(v_nomes,1))::int] || ' ' || substr(v_user::text,1,4);
    v_codigo := upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));

    IF random() < 0.7 THEN
      v_loc := v_cidades_br[1 + floor(random()*array_length(v_cidades_br,1))::int];
    ELSE
      v_loc := v_cidades_ext[1 + floor(random()*array_length(v_cidades_ext,1))::int];
    END IF;

    v_cidade := COALESCE(NULLIF(v_loc[1],''), 'Desconhecida');
    v_estado := COALESCE(NULLIF(v_loc[2],''), v_cidade);
    v_pais := COALESCE(NULLIF(v_loc[3],''), 'Brazil');
    v_continente := COALESCE(NULLIF(v_loc[4],''), 'América do Sul');

    -- Cria profile fictício para suportar embaixadores futuros
    INSERT INTO profiles(id, nome_exibicao, cidade, estado, pais, codigo_indicacao)
    VALUES (v_user, v_nome, v_cidade, v_estado, v_pais, v_codigo)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO votos(
      user_id, clube_nome, pais, estado, cidade,
      voto_cidade, voto_pais, voto_continente,
      is_original_vote, is_fraud_attempt, is_suspicious,
      status_integridade
    ) VALUES (
      v_user, v_clube, v_pais, v_estado, v_cidade,
      v_cidade, v_pais, v_continente,
      false, false, false,
      'ficticio'
    );
    v_inseridos := v_inseridos + 1;
  END LOOP;

  RETURN json_build_object('inseridos', v_inseridos, 'total_clubes', array_length(v_clubes,1));
END;
$function$;

-- Atualiza purge para limpar profiles fictícios também
CREATE OR REPLACE FUNCTION public.purge_fake_votes()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_email text;
  v_removidos integer;
  v_user_ids uuid[];
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL OR v_email <> 'betoborelli9@gmail.com' THEN
    RAISE EXCEPTION 'Acesso negado: apenas master admin.';
  END IF;

  SELECT array_agg(user_id) INTO v_user_ids FROM votos WHERE status_integridade = 'ficticio';

  WITH del AS (
    DELETE FROM votos WHERE status_integridade = 'ficticio' RETURNING 1
  )
  SELECT count(*) INTO v_removidos FROM del;

  -- Remove profiles fictícios (que não têm correspondência em auth.users)
  IF v_user_ids IS NOT NULL THEN
    DELETE FROM profiles 
    WHERE id = ANY(v_user_ids) 
    AND id NOT IN (SELECT id FROM auth.users);
  END IF;

  RETURN json_build_object('removidos', v_removidos);
END;
$function$;