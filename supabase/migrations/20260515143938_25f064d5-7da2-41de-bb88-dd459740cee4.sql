CREATE OR REPLACE FUNCTION public.get_clubs_full_counts(p_club_names text[])
RETURNS TABLE(clube_nome text, heart_votes bigint, sympathy_votes bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  RETURN QUERY
  WITH req AS (
    SELECT n AS original, public.club_name_tokens(n) AS toks
    FROM unnest(p_club_names) AS n
    WHERE coalesce(n,'') <> ''
  ),
  hearts AS (
    SELECT vo.clube_nome AS vname, public.club_name_tokens(vo.clube_nome) AS toks
    FROM public.votos vo
    WHERE vo.is_original_vote = true
      AND vo.status_aprovacao = 'aprovado'
  ),
  symp AS (
    SELECT s.vname, public.club_name_tokens(s.vname) AS toks
    FROM (
      SELECT unnest(ARRAY[vo.sympathy_1, vo.sympathy_2, vo.sympathy_3, vo.sympathy_4]) AS vname
      FROM public.votos vo
      WHERE vo.status_aprovacao = 'aprovado'
    ) s
    WHERE coalesce(s.vname,'') <> ''
  ),
  heart_matches AS (
    SELECT r.original
    FROM req r JOIN hearts h ON
      array_length(r.toks,1) IS NOT NULL AND array_length(h.toks,1) IS NOT NULL
      AND CASE WHEN array_length(h.toks,1) <= array_length(r.toks,1)
               THEN h.toks <@ r.toks ELSE r.toks <@ h.toks END
  ),
  symp_matches AS (
    SELECT r.original
    FROM req r JOIN symp s ON
      array_length(r.toks,1) IS NOT NULL AND array_length(s.toks,1) IS NOT NULL
      AND CASE WHEN array_length(s.toks,1) <= array_length(r.toks,1)
               THEN s.toks <@ r.toks ELSE r.toks <@ s.toks END
  )
  SELECT r.original AS clube_nome,
         (SELECT count(*)::bigint FROM heart_matches m WHERE m.original = r.original) AS heart_votes,
         (SELECT count(*)::bigint FROM symp_matches  m WHERE m.original = r.original) AS sympathy_votes
  FROM req r;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_clubs_full_counts(text[]) TO anon, authenticated;