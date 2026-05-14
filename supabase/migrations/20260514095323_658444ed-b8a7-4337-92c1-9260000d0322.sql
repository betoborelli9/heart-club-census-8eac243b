CREATE OR REPLACE FUNCTION public.get_votes_count_by_clubs(p_club_names text[])
RETURNS TABLE(clube_nome text, votes bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT v.clube_nome, count(*)::bigint
  FROM public.votos v
  WHERE v.clube_nome = ANY(p_club_names)
    AND v.is_original_vote = true
    AND v.status_aprovacao = 'aprovado'
  GROUP BY v.clube_nome;
$$;

GRANT EXECUTE ON FUNCTION public.get_votes_count_by_clubs(text[]) TO anon, authenticated;