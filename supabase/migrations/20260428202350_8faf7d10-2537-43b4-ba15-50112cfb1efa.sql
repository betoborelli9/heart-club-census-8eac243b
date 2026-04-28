CREATE OR REPLACE FUNCTION public.get_heatmap_data(
  p_club_name text,
  p_level text DEFAULT 'country',
  p_filter_value text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
BEGIN
  IF p_level = 'continent' THEN
    SELECT json_agg(row_to_json(t)) INTO result FROM (
      SELECT COALESCE(NULLIF(voto_continente, ''), 'Não informado') as region, count(*) as votes
      FROM public.votos
      WHERE clube_nome = p_club_name AND is_original_vote = true
      GROUP BY COALESCE(NULLIF(voto_continente, ''), 'Não informado')
      ORDER BY votes DESC
    ) t;
  ELSIF p_level = 'country' THEN
    SELECT json_agg(row_to_json(t)) INTO result FROM (
      SELECT COALESCE(NULLIF(voto_pais, ''), NULLIF(pais, ''), 'Não informado') as region, count(*) as votes
      FROM public.votos
      WHERE clube_nome = p_club_name AND is_original_vote = true
      AND (p_filter_value IS NULL OR voto_continente = p_filter_value)
      GROUP BY COALESCE(NULLIF(voto_pais, ''), NULLIF(pais, ''), 'Não informado')
      ORDER BY votes DESC
    ) t;
  ELSIF p_level = 'state' THEN
    SELECT json_agg(row_to_json(t)) INTO result FROM (
      SELECT COALESCE(NULLIF(estado, ''), 'Não informado') as region, count(*) as votes
      FROM public.votos
      WHERE clube_nome = p_club_name AND is_original_vote = true
      AND (p_filter_value IS NULL OR COALESCE(NULLIF(voto_pais, ''), NULLIF(pais, '')) = p_filter_value)
      GROUP BY COALESCE(NULLIF(estado, ''), 'Não informado')
      ORDER BY votes DESC
    ) t;
  ELSIF p_level = 'city' THEN
    SELECT json_agg(row_to_json(t)) INTO result FROM (
      SELECT COALESCE(NULLIF(voto_cidade, ''), NULLIF(cidade, ''), 'Não informado') as region, count(*) as votes
      FROM public.votos
      WHERE clube_nome = p_club_name AND is_original_vote = true
      AND (p_filter_value IS NULL OR estado = p_filter_value OR COALESCE(NULLIF(voto_pais, ''), NULLIF(pais, '')) = p_filter_value)
      GROUP BY COALESCE(NULLIF(voto_cidade, ''), NULLIF(cidade, ''), 'Não informado')
      ORDER BY votes DESC
    ) t;
  ELSIF p_level = 'total' THEN
    SELECT json_build_object('total', count(*)) INTO result
    FROM public.votos
    WHERE clube_nome = p_club_name AND is_original_vote = true;
  END IF;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_club_vote_summary(p_club_name text)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'total_votes', (
      SELECT count(*) FROM public.votos
      WHERE clube_nome = p_club_name AND is_original_vote = true
    ),
    'sympathizers', (
      SELECT count(*) FROM public.votos
      WHERE clube_nome = p_club_name AND is_original_vote = false
    ),
    'cities', COALESCE((
      SELECT json_agg(row_to_json(t)) FROM (
        SELECT COALESCE(NULLIF(voto_cidade, ''), NULLIF(cidade, ''), 'Não informado') as city, count(*) as votes
        FROM public.votos
        WHERE clube_nome = p_club_name AND is_original_vote = true
        GROUP BY COALESCE(NULLIF(voto_cidade, ''), NULLIF(cidade, ''), 'Não informado')
        ORDER BY votes DESC
        LIMIT 10
      ) t
    ), '[]'::json),
    'rivals', COALESCE((
      SELECT json_agg(row_to_json(t)) FROM (
        SELECT clube_nome as club, count(*) as votes
        FROM public.votos
        WHERE is_original_vote = true AND clube_nome <> p_club_name
        GROUP BY clube_nome
        ORDER BY votes DESC
        LIMIT 10
      ) t
    ), '[]'::json)
  ) INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_club_vote_ranking(p_limit integer DEFAULT 30)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
BEGIN
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO result
  FROM (
    SELECT clube_nome as club, count(*) as votes
    FROM public.votos
    WHERE is_original_vote = true
    GROUP BY clube_nome
    ORDER BY votes DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 100)
  ) t;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_heatmap_data(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_club_vote_summary(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_club_vote_ranking(integer) TO anon, authenticated;