
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
  IF p_level = 'country' THEN
    SELECT json_agg(row_to_json(t)) INTO result FROM (
      SELECT pais as region, count(*) as votes
      FROM votos WHERE clube_nome = p_club_name AND is_original_vote = true
      GROUP BY pais ORDER BY votes DESC
    ) t;
  ELSIF p_level = 'state' THEN
    SELECT json_agg(row_to_json(t)) INTO result FROM (
      SELECT estado as region, count(*) as votes
      FROM votos WHERE clube_nome = p_club_name AND is_original_vote = true
      AND (p_filter_value IS NULL OR pais = p_filter_value)
      GROUP BY estado ORDER BY votes DESC
    ) t;
  ELSIF p_level = 'city' THEN
    SELECT json_agg(row_to_json(t)) INTO result FROM (
      SELECT cidade as region, count(*) as votes
      FROM votos WHERE clube_nome = p_club_name AND is_original_vote = true
      AND (p_filter_value IS NULL OR estado = p_filter_value)
      GROUP BY cidade ORDER BY votes DESC
    ) t;
  ELSIF p_level = 'total' THEN
    SELECT json_build_object('total', count(*)) INTO result
    FROM votos WHERE clube_nome = p_club_name AND is_original_vote = true;
  END IF;
  
  RETURN COALESCE(result, '[]'::json);
END;
$$;
