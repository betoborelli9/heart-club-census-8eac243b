
CREATE OR REPLACE FUNCTION public.normalize_club_name(t text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT btrim(regexp_replace(
    regexp_replace(
      lower(translate(coalesce(t,''),
        'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
        'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')),
      '\m(futebol|clube|esporte|atletico|associacao|sport|sociedade|fc|ec|sc|ac|cf|cr|cd)\M',
      ' ', 'gi'),
    '\s+', ' ', 'g'));
$$;

CREATE OR REPLACE FUNCTION public.get_votes_count_by_clubs_fuzzy(p_club_names text[])
RETURNS TABLE(clube_nome text, votes bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH req AS (
    SELECT n AS original, public.normalize_club_name(n) AS norm
    FROM unnest(p_club_names) AS n
    WHERE coalesce(n,'') <> ''
  ),
  v AS (
    SELECT vo.clube_nome AS vname, public.normalize_club_name(vo.clube_nome) AS norm
    FROM public.votos vo
    WHERE vo.is_original_vote = true
      AND vo.status_aprovacao = 'aprovado'
  )
  SELECT r.original, count(*)::bigint
  FROM req r
  JOIN v
    ON length(r.norm) > 1
   AND length(v.norm) > 1
   AND ( v.norm = r.norm
      OR position(' ' || v.norm || ' ' in ' ' || r.norm || ' ') > 0
      OR position(' ' || r.norm || ' ' in ' ' || v.norm || ' ') > 0 )
  GROUP BY r.original;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_votes_count_by_clubs_fuzzy(text[]) TO anon, authenticated;
