
-- RPCs administrativas para gerar/limpar votos fictícios.
-- Restritas ao master admin (betoborelli9@gmail.com).
-- Os votos fictícios são marcados com status_integridade='ficticio' e is_original_vote=false,
-- preservando a integridade da lógica de votação real (Voto Sagrado).

CREATE OR REPLACE FUNCTION public.seed_fake_votes(p_quantidade integer DEFAULT 5000)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_inseridos integer := 0;
  v_clubes text[];
  v_continentes text[] := ARRAY['América do Sul','Europa','América do Norte','Ásia','África','Oceania'];
  v_paises_br text[] := ARRAY['Brazil','Brasil'];
  v_cidades_br text[][] := ARRAY[
    ARRAY['São Paulo','SP'],
    ARRAY['Rio de Janeiro','RJ'],
    ARRAY['Belo Horizonte','MG'],
    ARRAY['Goiânia','GO'],
    ARRAY['Salvador','BA'],
    ARRAY['Porto Alegre','RS'],
    ARRAY['Curitiba','PR'],
    ARRAY['Recife','PE'],
    ARRAY['Fortaleza','CE'],
    ARRAY['Manaus','AM'],
    ARRAY['Brasília','DF'],
    ARRAY['Florianópolis','SC'],
    ARRAY['Vitória','ES'],
    ARRAY['Natal','RN'],
    ARRAY['Belém','PA']
  ];
  v_paises_ext text[][] := ARRAY[
    ARRAY['Spain','Madrid','Europa'],
    ARRAY['Spain','Barcelona','Europa'],
    ARRAY['England','London','Europa'],
    ARRAY['England','Manchester','Europa'],
    ARRAY['Germany','Munich','Europa'],
    ARRAY['Germany','Dortmund','Europa'],
    ARRAY['France','Paris','Europa'],
    ARRAY['Italy','Milan','Europa'],
    ARRAY['Italy','Turin','Europa'],
    ARRAY['Argentina','Buenos Aires','América do Sul'],
    ARRAY['USA','New York','América do Norte'],
    ARRAY['USA','Los Angeles','América do Norte'],
    ARRAY['Japan','Tokyo','Ásia'],
    ARRAY['South Korea','Seoul','Ásia'],
    ARRAY['Australia','Sydney','Oceania'],
    ARRAY['Egypt','Cairo','África']
  ];
  v_clube text;
  v_loc text[];
  v_pais text;
  v_cidade text;
  v_estado text;
  v_continente text;
  v_user uuid;
  i integer;
BEGIN
  -- Autorização: apenas master admin
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL OR v_email <> 'betoborelli9@gmail.com' THEN
    RAISE EXCEPTION 'Acesso negado: apenas master admin.';
  END IF;

  -- Coleta nomes de clubes do clubes_cache
  SELECT array_agg(nome) INTO v_clubes FROM clubes_cache WHERE nome IS NOT NULL;
  IF v_clubes IS NULL OR array_length(v_clubes,1) = 0 THEN
    RAISE EXCEPTION 'clubes_cache está vazio.';
  END IF;

  FOR i IN 1..p_quantidade LOOP
    v_clube := v_clubes[1 + floor(random()*array_length(v_clubes,1))::int];
    v_user := gen_random_uuid();

    IF random() < 0.7 THEN
      -- Brasil
      v_loc := v_cidades_br[1 + floor(random()*array_length(v_cidades_br,1))::int];
      v_cidade := v_loc[1];
      v_estado := v_loc[2];
      v_pais := 'Brazil';
      v_continente := 'América do Sul';
    ELSE
      v_loc := v_paises_ext[1 + floor(random()*array_length(v_paises_ext,1))::int];
      v_pais := v_loc[1];
      v_cidade := v_loc[2];
      v_continente := v_loc[3];
      v_estado := v_loc[2];
    END IF;

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
$$;

CREATE OR REPLACE FUNCTION public.purge_fake_votes()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_removidos integer;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL OR v_email <> 'betoborelli9@gmail.com' THEN
    RAISE EXCEPTION 'Acesso negado: apenas master admin.';
  END IF;

  WITH del AS (
    DELETE FROM votos WHERE status_integridade = 'ficticio' RETURNING 1
  )
  SELECT count(*) INTO v_removidos FROM del;

  RETURN json_build_object('removidos', v_removidos);
END;
$$;

CREATE OR REPLACE FUNCTION public.fake_votes_summary()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_total integer;
  v_clubes integer;
  v_paises integer;
  v_cidades integer;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL OR v_email <> 'betoborelli9@gmail.com' THEN
    RAISE EXCEPTION 'Acesso negado: apenas master admin.';
  END IF;

  SELECT count(*), count(DISTINCT clube_nome), count(DISTINCT voto_pais), count(DISTINCT voto_cidade)
    INTO v_total, v_clubes, v_paises, v_cidades
  FROM votos WHERE status_integridade = 'ficticio';

  RETURN json_build_object(
    'total', v_total,
    'clubes', v_clubes,
    'paises', v_paises,
    'cidades', v_cidades
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_fake_votes(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purge_fake_votes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fake_votes_summary() TO authenticated;
