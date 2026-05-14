
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION public.get_votes_count_by_clubs_fuzzy(p_club_names text[])
RETURNS TABLE(clube_nome text, votes bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  RETURN QUERY
  WITH req AS (
    SELECT n AS original, lower(unaccent(n)) AS norm
    FROM unnest(p_club_names) AS n
    WHERE coalesce(n,'') <> ''
  ),
  v AS (
    SELECT vo.clube_nome AS vname, lower(unaccent(vo.clube_nome)) AS norm
    FROM public.votos vo
    WHERE vo.is_original_vote = true
      AND vo.status_aprovacao = 'aprovado'
  ),
  matches AS (
    SELECT r.original,
           similarity(r.norm, v.norm) AS sim,
           (v.norm % r.norm) AS trg_match,
           (position(r.norm in v.norm) > 0
            OR position(v.norm in r.norm) > 0) AS sub_match
    FROM req r
    JOIN v ON
         similarity(r.norm, v.norm) >= 0.45
      OR (v.norm % r.norm)
      OR position(r.norm in v.norm) > 0
      OR position(v.norm in r.norm) > 0
  )
  SELECT m.original, count(*)::bigint
  FROM matches m
  GROUP BY m.original;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_votes_count_by_clubs_fuzzy(text[]) TO anon, authenticated;
