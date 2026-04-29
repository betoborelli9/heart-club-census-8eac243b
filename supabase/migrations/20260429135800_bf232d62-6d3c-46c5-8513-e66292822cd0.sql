-- Tabela auxiliar para metadados de votos fictícios (nomes, códigos de indicação)
CREATE TABLE IF NOT EXISTS public.votos_ficticios_meta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome_exibicao text NOT NULL,
  codigo_indicacao text NOT NULL,
  indicado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vfm_user ON public.votos_ficticios_meta(user_id);
CREATE INDEX IF NOT EXISTS idx_vfm_indicado_por ON public.votos_ficticios_meta(indicado_por);

ALTER TABLE public.votos_ficticios_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master admin reads fake meta"
ON public.votos_ficticios_meta FOR SELECT
TO authenticated
USING ((SELECT email FROM auth.users WHERE id = auth.uid()) = 'betoborelli9@gmail.com');

-- Recria seed sem tocar em profiles
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
  v_indicador uuid;
  v_existing uuid[];
  i integer;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL OR v_email <> 'betoborelli9@gmail.com' THEN
    RAISE EXCEPTION 'Acesso negado: apenas master admin.';
  END IF;

  SELECT array_agg(nome) INTO v_clubes FROM clubes_cache WHERE nome IS NOT NULL AND length(trim(nome)) > 0;
  IF v_clubes IS NULL OR array_length(v_clubes,1) = 0 THEN
    RAISE EXCEPTION 'clubes_cache está vazio.';
  END IF;

  -- Pega usuários fictícios existentes para servirem de "indicadores"
  SELECT array_agg(user_id) INTO v_existing FROM votos_ficticios_meta LIMIT 500;

  FOR i IN 1..p_quantidade LOOP
    v_clube := v_clubes[1 + floor(random()*array_length(v_clubes,1))::int];
    v_user := gen_random_uuid();
    v_nome := v_nomes[1 + floor(random()*array_length(v_nomes,1))::int] || ' ' || substr(v_user::text,1,4);
    v_codigo := upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));

    -- 30% dos votos são "indicados" por outro fictício existente
    v_indicador := NULL;
    IF v_existing IS NOT NULL AND array_length(v_existing,1) > 0 AND random() < 0.3 THEN
      v_indicador := v_existing[1 + floor(random()*array_length(v_existing,1))::int];
    END IF;

    IF random() < 0.7 THEN
      v_loc := v_cidades_br[1 + floor(random()*array_length(v_cidades_br,1))::int];
    ELSE
      v_loc := v_cidades_ext[1 + floor(random()*array_length(v_cidades_ext,1))::int];
    END IF;

    v_cidade := COALESCE(NULLIF(v_loc[1],''), 'Desconhecida');
    v_estado := COALESCE(NULLIF(v_loc[2],''), v_cidade);
    v_pais := COALESCE(NULLIF(v_loc[3],''), 'Brazil');
    v_continente := COALESCE(NULLIF(v_loc[4],''), 'América do Sul');

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

    INSERT INTO votos_ficticios_meta(user_id, nome_exibicao, codigo_indicacao, indicado_por)
    VALUES (v_user, v_nome, v_codigo, v_indicador);

    -- Atualiza pool de indicadores periodicamente
    IF i % 100 = 0 THEN
      v_existing := array_append(COALESCE(v_existing, ARRAY[]::uuid[]), v_user);
    END IF;

    v_inseridos := v_inseridos + 1;
  END LOOP;

  RETURN json_build_object('inseridos', v_inseridos, 'total_clubes', array_length(v_clubes,1));
END;
$function$;

-- Purge limpa votos e meta
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

  DELETE FROM votos_ficticios_meta 
  WHERE user_id IN (SELECT user_id FROM votos WHERE status_integridade = 'ficticio');

  WITH del AS (
    DELETE FROM votos WHERE status_integridade = 'ficticio' RETURNING 1
  )
  SELECT count(*) INTO v_removidos FROM del;

  RETURN json_build_object('removidos', v_removidos);
END;
$function$;