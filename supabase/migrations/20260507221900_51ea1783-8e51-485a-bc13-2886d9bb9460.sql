
-- Reescreve seed_fake_votes em modo BULK (INSERT…SELECT) escopado a uma cidade,
-- usando bairros reais do geo_neighborhood_cache. Resolve o statement timeout.

DROP FUNCTION IF EXISTS public.seed_fake_votes(integer);
DROP FUNCTION IF EXISTS public.seed_fake_votes(integer, text, text, text);

CREATE OR REPLACE FUNCTION public.seed_fake_votes(
  p_quantidade integer DEFAULT 1000,
  p_city text DEFAULT 'Goiânia',
  p_state text DEFAULT 'Goiás',
  p_country text DEFAULT 'Brazil'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_email text;
  v_inseridos integer := 0;
  v_clubes text[];
  v_bairros text[];
  v_estado_uf text;
  uf_map jsonb := '{
    "Acre":"AC","Alagoas":"AL","Amapá":"AP","Amazonas":"AM","Bahia":"BA","Ceará":"CE",
    "Distrito Federal":"DF","Espírito Santo":"ES","Goiás":"GO","Maranhão":"MA","Mato Grosso":"MT",
    "Mato Grosso do Sul":"MS","Minas Gerais":"MG","Pará":"PA","Paraíba":"PB","Paraná":"PR",
    "Pernambuco":"PE","Piauí":"PI","Rio de Janeiro":"RJ","Rio Grande do Norte":"RN",
    "Rio Grande do Sul":"RS","Rondônia":"RO","Roraima":"RR","Santa Catarina":"SC",
    "São Paulo":"SP","Sergipe":"SE","Tocantins":"TO"
  }'::jsonb;
  v_inserted_ids uuid[];
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL OR v_email <> 'betoborelli9@gmail.com' THEN
    RAISE EXCEPTION 'Acesso negado: apenas master admin.';
  END IF;

  p_quantidade := LEAST(GREATEST(COALESCE(p_quantidade, 1000), 1), 10000);
  v_estado_uf := COALESCE(uf_map->>p_state, p_state);

  -- Clubes brasileiros do cache (sem alterar clubes_cache)
  SELECT array_agg(nome) INTO v_clubes
  FROM public.clubes_cache
  WHERE nome IS NOT NULL
    AND length(trim(nome)) > 0
    AND (pais ILIKE 'Brazil' OR pais ILIKE 'Brasil' OR pais = 'BR');

  IF v_clubes IS NULL OR array_length(v_clubes, 1) = 0 THEN
    -- Fallback: usa qualquer clube do cache
    SELECT array_agg(nome) INTO v_clubes FROM public.clubes_cache WHERE nome IS NOT NULL;
  END IF;

  IF v_clubes IS NULL OR array_length(v_clubes, 1) = 0 THEN
    RAISE EXCEPTION 'clubes_cache está vazio.';
  END IF;

  -- Bairros oficiais (geo_neighborhood_cache) da cidade alvo
  SELECT array_agg(DISTINCT neighborhood) INTO v_bairros
  FROM public.geo_neighborhood_cache
  WHERE lower(unaccent(city)) = lower(unaccent(p_city));

  IF v_bairros IS NULL OR array_length(v_bairros, 1) = 0 THEN
    RAISE EXCEPTION 'Nenhum bairro oficial cadastrado para %. Sincronize a malha primeiro.', p_city;
  END IF;

  -- BULK INSERT (uma única operação set-based — sem timeout)
  WITH gerados AS (
    SELECT
      gen_random_uuid() AS uid,
      v_clubes[1 + floor(random() * array_length(v_clubes, 1))::int] AS clube,
      v_bairros[1 + floor(random() * array_length(v_bairros, 1))::int] AS bairro
    FROM generate_series(1, p_quantidade)
  ),
  ins AS (
    INSERT INTO public.votos(
      user_id, clube_nome, pais, estado, cidade, bairro,
      voto_cidade, voto_pais, voto_continente,
      is_original_vote, is_fraud_attempt, is_suspicious, status_integridade
    )
    SELECT
      uid, clube, p_country, v_estado_uf, p_city, bairro,
      p_city, p_country, 'América do Sul',
      true, false, false, 'ficticio'
    FROM gerados
    RETURNING user_id
  )
  SELECT array_agg(user_id) INTO v_inserted_ids FROM ins;

  v_inseridos := COALESCE(array_length(v_inserted_ids, 1), 0);

  -- Meta também em bulk
  INSERT INTO public.votos_ficticios_meta(user_id, nome_exibicao, codigo_indicacao)
  SELECT
    uid,
    'Fictício ' || upper(substr(uid::text, 1, 6)),
    upper(substr(replace(uid::text, '-', ''), 1, 6))
  FROM unnest(v_inserted_ids) AS uid;

  RETURN json_build_object(
    'inseridos', v_inseridos,
    'cidade', p_city,
    'estado', v_estado_uf,
    'pais', p_country,
    'bairros_usados', array_length(v_bairros, 1),
    'clubes_usados', array_length(v_clubes, 1)
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.seed_fake_votes(integer, text, text, text) TO authenticated;
