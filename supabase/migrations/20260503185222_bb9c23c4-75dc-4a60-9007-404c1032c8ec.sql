
CREATE OR REPLACE FUNCTION public.get_ranking_with_growth(p_level text, p_value text DEFAULT NULL, p_limit integer DEFAULT 50)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
BEGIN
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO result FROM (
    SELECT
      v.clube_nome AS club,
      count(*) AS votes,
      count(*) FILTER (WHERE v.created_at > now() - interval '24 hours') AS growth_24h,
      count(*) FILTER (WHERE v.created_at > now() - interval '7 days') AS growth_7d
    FROM public.votos v
    WHERE v.is_original_vote = true
      AND (
        p_level = 'global'
        OR (p_level = 'country' AND COALESCE(NULLIF(v.voto_pais,''), NULLIF(v.pais,'')) = p_value)
        OR (p_level = 'state' AND v.estado = p_value)
        OR (p_level = 'city' AND COALESCE(NULLIF(v.voto_cidade,''), NULLIF(v.cidade,'')) = p_value)
        OR (p_level = 'neighborhood' AND v.bairro = p_value)
      )
    GROUP BY v.clube_nome
    ORDER BY votes DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 200)
  ) t;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_distinct_regions(p_level text, p_parent text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
BEGIN
  IF p_level = 'country' THEN
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO result FROM (
      SELECT COALESCE(NULLIF(voto_pais,''), NULLIF(pais,'')) AS name, count(*) AS votes
      FROM public.votos WHERE is_original_vote = true
      GROUP BY 1 HAVING COALESCE(NULLIF(voto_pais,''), NULLIF(pais,'')) IS NOT NULL
      ORDER BY votes DESC LIMIT 100
    ) t;
  ELSIF p_level = 'state' THEN
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO result FROM (
      SELECT estado AS name, count(*) AS votes FROM public.votos
      WHERE is_original_vote = true AND estado IS NOT NULL
        AND (p_parent IS NULL OR COALESCE(NULLIF(voto_pais,''), NULLIF(pais,'')) = p_parent)
      GROUP BY 1 ORDER BY votes DESC LIMIT 100
    ) t;
  ELSIF p_level = 'city' THEN
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO result FROM (
      SELECT COALESCE(NULLIF(voto_cidade,''), NULLIF(cidade,'')) AS name, count(*) AS votes
      FROM public.votos
      WHERE is_original_vote = true
        AND (p_parent IS NULL OR estado = p_parent)
      GROUP BY 1 HAVING COALESCE(NULLIF(voto_cidade,''), NULLIF(cidade,'')) IS NOT NULL
      ORDER BY votes DESC LIMIT 200
    ) t;
  ELSIF p_level = 'neighborhood' THEN
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO result FROM (
      SELECT bairro AS name, count(*) AS votes FROM public.votos
      WHERE is_original_vote = true AND bairro IS NOT NULL AND length(trim(bairro)) > 0
        AND (p_parent IS NULL OR COALESCE(NULLIF(voto_cidade,''), NULLIF(cidade,'')) = p_parent)
      GROUP BY 1 ORDER BY votes DESC LIMIT 200
    ) t;
  END IF;
  RETURN COALESCE(result, '[]'::json);
END;
$$;
