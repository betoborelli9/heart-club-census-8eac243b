
CREATE OR REPLACE FUNCTION public.club_name_tokens(t text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public', 'extensions'
AS $$
  SELECT ARRAY(
    SELECT tok
    FROM unnest(regexp_split_to_array(lower(unaccent(coalesce(t,''))), '[^a-z0-9]+')) AS tok
    WHERE length(tok) >= 4
  );
$$;

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
    SELECT n AS original, public.club_name_tokens(n) AS toks
    FROM unnest(p_club_names) AS n
    WHERE coalesce(n,'') <> ''
  ),
  v AS (
    SELECT vo.clube_nome AS vname, public.club_name_tokens(vo.clube_nome) AS toks
    FROM public.votos vo
    WHERE vo.is_original_vote = true
      AND vo.status_aprovacao = 'aprovado'
  ),
  matches AS (
    SELECT r.original
    FROM req r
    JOIN v ON
      array_length(r.toks,1) IS NOT NULL
      AND array_length(v.toks,1) IS NOT NULL
      AND CASE
            WHEN array_length(v.toks,1) <= array_length(r.toks,1)
              THEN v.toks <@ r.toks
            ELSE r.toks <@ v.toks
          END
  )
  SELECT m.original, count(*)::bigint
  FROM matches m
  GROUP BY m.original;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_votes_count_by_clubs_fuzzy(text[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.club_name_tokens(text) TO anon, authenticated;
