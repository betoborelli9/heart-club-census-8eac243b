CREATE OR REPLACE FUNCTION public.get_top_clubs_by_region(
  p_level text,
  p_value text,
  p_limit int DEFAULT 10
)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE result json;
BEGIN
  IF p_level = 'country' THEN
    SELECT json_agg(row_to_json(t)) INTO result FROM (
      SELECT clube_nome as club, count(*) as votes
      FROM public.votos
      WHERE is_original_vote = true
        AND COALESCE(NULLIF(voto_pais, ''), NULLIF(pais, '')) = p_value
      GROUP BY clube_nome ORDER BY votes DESC LIMIT p_limit
    ) t;
  ELSIF p_level = 'state' THEN
    SELECT json_agg(row_to_json(t)) INTO result FROM (
      SELECT clube_nome as club, count(*) as votes
      FROM public.votos
      WHERE is_original_vote = true AND estado = p_value
      GROUP BY clube_nome ORDER BY votes DESC LIMIT p_limit
    ) t;
  ELSIF p_level = 'city' THEN
    SELECT json_agg(row_to_json(t)) INTO result FROM (
      SELECT clube_nome as club, count(*) as votes
      FROM public.votos
      WHERE is_original_vote = true
        AND COALESCE(NULLIF(voto_cidade, ''), NULLIF(cidade, '')) = p_value
      GROUP BY clube_nome ORDER BY votes DESC LIMIT p_limit
    ) t;
  END IF;
  RETURN COALESCE(result, '[]'::json);
END;
$$;