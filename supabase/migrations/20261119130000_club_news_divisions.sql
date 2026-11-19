-- NOTÍCIAS: em que competições (divisões) o clube joga, lido das tabelas de classificação que o site já guarda.
-- Serve para não confundir clubes de mesmo nome: "Botafogo" da Série A (Rio) x "Botafogo" da Série B (Ribeirão Preto).
-- Só o servidor (service role) chama; ninguém de fora acessa.
CREATE OR REPLACE FUNCTION public.club_news_divisions(p_team integer)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(DISTINCT league_name), ARRAY[]::text[])
  FROM public.competition_standings_cache
  WHERE season >= (EXTRACT(year FROM now())::int - 1)
    AND p_team IS NOT NULL
    AND standings_json::text ~ ('"team": \{"id": ' || p_team::text || '[,}]');
$$;

REVOKE ALL ON FUNCTION public.club_news_divisions(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.club_news_divisions(integer) TO service_role;
NOTIFY pgrst, 'reload schema';
