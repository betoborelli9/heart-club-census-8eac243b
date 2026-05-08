
ALTER TABLE public.votos
  ADD COLUMN IF NOT EXISTS status_aprovacao text NOT NULL DEFAULT 'aprovado';

CREATE INDEX IF NOT EXISTS idx_votos_status_aprovacao ON public.votos(status_aprovacao);

-- Promote master admin
UPDATE public.profiles
   SET role = 'admin'
 WHERE id = (SELECT id FROM auth.users WHERE email = 'betoborelli9@gmail.com');

-- Update admin_approve_vote to set status_aprovacao
CREATE OR REPLACE FUNCTION public.admin_approve_vote(p_voto_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  UPDATE public.votos
     SET is_fraud_attempt = false,
         is_suspicious = false,
         is_original_vote = true,
         potential_duplicate_user = false,
         status_integridade = 'aprovado',
         status_aprovacao = 'aprovado'
   WHERE id = p_voto_id;
END;
$function$;

-- Master reset (only own votes, only master)
CREATE OR REPLACE FUNCTION public.master_reset_my_vote()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_email text;
  v_count integer := 0;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL OR v_email <> 'betoborelli9@gmail.com' THEN
    RAISE EXCEPTION 'Acesso negado: apenas master admin.';
  END IF;

  DELETE FROM public.votos_tracking
   WHERE voto_id IN (SELECT id FROM public.votos WHERE user_id = auth.uid());

  WITH del AS (
    DELETE FROM public.votos WHERE user_id = auth.uid() RETURNING 1
  ) SELECT count(*) INTO v_count FROM del;

  RETURN json_build_object('removidos', v_count);
END;
$function$;

-- Update public read RPCs to exclude status_aprovacao = 'pendente'
CREATE OR REPLACE FUNCTION public.get_club_vote_summary(p_club_name text)
 RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE result json;
BEGIN
  SELECT json_build_object(
    'total_votes', (
      SELECT count(*) FROM public.votos
      WHERE clube_nome = p_club_name AND is_original_vote = true AND status_aprovacao = 'aprovado'
    ),
    'sympathizers', (
      SELECT count(*) FROM public.votos
      WHERE clube_nome = p_club_name AND is_original_vote = false AND status_aprovacao = 'aprovado'
    ),
    'cities', COALESCE((
      SELECT json_agg(row_to_json(t)) FROM (
        SELECT COALESCE(NULLIF(voto_cidade, ''), NULLIF(cidade, ''), 'Não informado') as city, count(*) as votes
        FROM public.votos
        WHERE clube_nome = p_club_name AND is_original_vote = true AND status_aprovacao = 'aprovado'
        GROUP BY 1 ORDER BY votes DESC LIMIT 10
      ) t
    ), '[]'::json),
    'rivals', COALESCE((
      SELECT json_agg(row_to_json(t)) FROM (
        SELECT clube_nome as club, count(*) as votes
        FROM public.votos
        WHERE is_original_vote = true AND status_aprovacao = 'aprovado' AND clube_nome <> p_club_name
        GROUP BY clube_nome ORDER BY votes DESC LIMIT 10
      ) t
    ), '[]'::json)
  ) INTO result;
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_club_vote_ranking(p_limit integer DEFAULT 30)
 RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE result json;
BEGIN
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO result FROM (
    SELECT clube_nome as club, count(*) as votes
    FROM public.votos
    WHERE is_original_vote = true AND status_aprovacao = 'aprovado'
    GROUP BY clube_nome ORDER BY votes DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 100)
  ) t;
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_heatmap_neighborhoods(p_club_name text, p_city text)
 RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE result json;
BEGIN
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO result FROM (
    SELECT COALESCE(NULLIF(bairro, ''), 'Não informado') AS neighborhood, count(*) AS votes
    FROM public.votos
    WHERE clube_nome = p_club_name
      AND is_original_vote = true AND status_aprovacao = 'aprovado'
      AND COALESCE(NULLIF(voto_cidade,''), NULLIF(cidade,'')) = p_city
      AND bairro IS NOT NULL AND length(trim(bairro)) > 0
    GROUP BY 1 ORDER BY votes DESC
  ) t;
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_heatmap_data(p_club_name text, p_level text DEFAULT 'country', p_filter_value text DEFAULT NULL)
 RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  result json;
  uf_to_name jsonb := '{"AC":"Acre","AL":"Alagoas","AP":"Amapá","AM":"Amazonas","BA":"Bahia","CE":"Ceará","DF":"Distrito Federal","ES":"Espírito Santo","GO":"Goiás","MA":"Maranhão","MT":"Mato Grosso","MS":"Mato Grosso do Sul","MG":"Minas Gerais","PA":"Pará","PB":"Paraíba","PR":"Paraná","PE":"Pernambuco","PI":"Piauí","RJ":"Rio de Janeiro","RN":"Rio Grande do Norte","RS":"Rio Grande do Sul","RO":"Rondônia","RR":"Roraima","SC":"Santa Catarina","SP":"São Paulo","SE":"Sergipe","TO":"Tocantins"}'::jsonb;
  name_to_uf jsonb := '{"Acre":"AC","Alagoas":"AL","Amapá":"AP","Amazonas":"AM","Bahia":"BA","Ceará":"CE","Distrito Federal":"DF","Espírito Santo":"ES","Goiás":"GO","Maranhão":"MA","Mato Grosso":"MT","Mato Grosso do Sul":"MS","Minas Gerais":"MG","Pará":"PA","Paraíba":"PB","Paraná":"PR","Pernambuco":"PE","Piauí":"PI","Rio de Janeiro":"RJ","Rio Grande do Norte":"RN","Rio Grande do Sul":"RS","Rondônia":"RO","Roraima":"RR","Santa Catarina":"SC","São Paulo":"SP","Sergipe":"SE","Tocantins":"TO"}'::jsonb;
  uf_filter text;
BEGIN
  IF p_level = 'continent' THEN
    SELECT json_agg(row_to_json(t)) INTO result FROM (
      SELECT COALESCE(NULLIF(voto_continente, ''), 'Não informado') as region, count(*) as votes
      FROM public.votos WHERE clube_nome = p_club_name AND is_original_vote = true AND status_aprovacao = 'aprovado'
      GROUP BY 1 ORDER BY votes DESC
    ) t;
  ELSIF p_level = 'country' THEN
    SELECT json_agg(row_to_json(t)) INTO result FROM (
      SELECT CASE WHEN COALESCE(NULLIF(voto_pais,''), NULLIF(pais,'')) IN ('BR','Br','br') THEN 'Brazil'
                  ELSE COALESCE(NULLIF(voto_pais,''), NULLIF(pais,''), 'Não informado') END AS region,
             count(*) AS votes
      FROM public.votos WHERE clube_nome = p_club_name AND is_original_vote = true AND status_aprovacao = 'aprovado'
      GROUP BY 1 ORDER BY votes DESC
    ) t;
  ELSIF p_level = 'state' THEN
    SELECT json_agg(row_to_json(t)) INTO result FROM (
      SELECT COALESCE(uf_to_name->>estado, NULLIF(estado,''), 'Não informado') AS region, count(*) AS votes
      FROM public.votos
      WHERE clube_nome = p_club_name AND is_original_vote = true AND status_aprovacao = 'aprovado'
        AND (p_filter_value IS NULL OR COALESCE(NULLIF(voto_pais,''), NULLIF(pais,'')) = p_filter_value
             OR (p_filter_value = 'Brazil' AND COALESCE(NULLIF(voto_pais,''), NULLIF(pais,'')) IN ('BR','Brazil')))
      GROUP BY 1 ORDER BY votes DESC
    ) t;
  ELSIF p_level = 'city' THEN
    uf_filter := name_to_uf->>p_filter_value;
    SELECT json_agg(row_to_json(t)) INTO result FROM (
      SELECT COALESCE(NULLIF(voto_cidade,''), NULLIF(cidade,''), 'Não informado') AS region, count(*) AS votes
      FROM public.votos
      WHERE clube_nome = p_club_name AND is_original_vote = true AND status_aprovacao = 'aprovado'
        AND (p_filter_value IS NULL OR estado = p_filter_value
             OR (uf_filter IS NOT NULL AND estado = uf_filter)
             OR COALESCE(NULLIF(voto_pais,''), NULLIF(pais,'')) = p_filter_value)
      GROUP BY 1 ORDER BY votes DESC
    ) t;
  ELSIF p_level = 'total' THEN
    SELECT json_build_object('total', count(*)) INTO result
    FROM public.votos WHERE clube_nome = p_club_name AND is_original_vote = true AND status_aprovacao = 'aprovado';
  END IF;
  RETURN COALESCE(result, '[]'::json);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_top_clubs_by_region(p_level text, p_value text, p_limit integer DEFAULT 10)
 RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE result json;
BEGIN
  IF p_level = 'country' THEN
    SELECT json_agg(row_to_json(t)) INTO result FROM (
      SELECT clube_nome as club, count(*) as votes FROM public.votos
      WHERE is_original_vote = true AND status_aprovacao = 'aprovado'
        AND COALESCE(NULLIF(voto_pais, ''), NULLIF(pais, '')) = p_value
      GROUP BY clube_nome ORDER BY votes DESC LIMIT p_limit
    ) t;
  ELSIF p_level = 'state' THEN
    SELECT json_agg(row_to_json(t)) INTO result FROM (
      SELECT clube_nome as club, count(*) as votes FROM public.votos
      WHERE is_original_vote = true AND status_aprovacao = 'aprovado' AND estado = p_value
      GROUP BY clube_nome ORDER BY votes DESC LIMIT p_limit
    ) t;
  ELSIF p_level = 'city' THEN
    SELECT json_agg(row_to_json(t)) INTO result FROM (
      SELECT clube_nome as club, count(*) as votes FROM public.votos
      WHERE is_original_vote = true AND status_aprovacao = 'aprovado'
        AND COALESCE(NULLIF(voto_cidade, ''), NULLIF(cidade, '')) = p_value
      GROUP BY clube_nome ORDER BY votes DESC LIMIT p_limit
    ) t;
  END IF;
  RETURN COALESCE(result, '[]'::json);
END;
$function$;
