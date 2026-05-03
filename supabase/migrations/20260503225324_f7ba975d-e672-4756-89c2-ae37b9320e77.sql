
ALTER TABLE public.votos
  ADD COLUMN IF NOT EXISTS sympathy_1 text,
  ADD COLUMN IF NOT EXISTS sympathy_2 text,
  ADD COLUMN IF NOT EXISTS sympathy_3 text,
  ADD COLUMN IF NOT EXISTS sympathy_4 text;

CREATE INDEX IF NOT EXISTS idx_votos_sympathy_1 ON public.votos(sympathy_1) WHERE sympathy_1 IS NOT NULL;

CREATE OR REPLACE FUNCTION public.admin_get_affinity_ecosystem(
  p_club text,
  p_limit integer DEFAULT 15
)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  total integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  SELECT count(*) INTO total
  FROM public.votos
  WHERE is_original_vote = true AND clube_nome = p_club;

  WITH unrolled AS (
    SELECT s AS club FROM public.votos v,
      LATERAL (VALUES (v.sympathy_1),(v.sympathy_2),(v.sympathy_3),(v.sympathy_4)) AS x(s)
    WHERE v.is_original_vote = true AND v.clube_nome = p_club
      AND s IS NOT NULL AND length(trim(s)) > 0
  )
  SELECT json_build_object(
    'club', p_club,
    'total_fans', total,
    'affinities', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT club, count(*) AS value,
          round((count(*)::numeric / NULLIF(total, 0)) * 100, 1) AS pct
        FROM unrolled
        GROUP BY club
        ORDER BY value DESC
        LIMIT LEAST(GREATEST(p_limit, 1), 50)
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$$;
