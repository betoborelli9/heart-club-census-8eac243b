CREATE OR REPLACE FUNCTION public.get_sympathy_ranking(p_limit integer DEFAULT 30)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
BEGIN
  WITH unrolled AS (
    SELECT s AS club FROM public.votos v,
      LATERAL (VALUES (v.sympathy_1),(v.sympathy_2),(v.sympathy_3),(v.sympathy_4)) AS x(s)
    WHERE s IS NOT NULL AND length(trim(s)) > 0
  )
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO result FROM (
    SELECT club, count(*) AS votes
    FROM unrolled
    GROUP BY club
    ORDER BY votes DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 100)
  ) t;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_sympathy_ranking(integer) TO anon, authenticated;