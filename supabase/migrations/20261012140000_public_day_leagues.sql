-- LISTA DE CAMPEONATOS DO DIA (para a aba "Jogos"): quantos jogos e quantos ao vivo cada campeonato tem numa janela.
-- Só lê league_fixtures (placares públicos). Janela limitada a 3 dias para ninguém pedir o banco inteiro.
CREATE OR REPLACE FUNCTION public.public_day_leagues(p_from timestamptz, p_to timestamptz)
RETURNS TABLE (league_id int, league_name text, league_logo text, country text, jogos int, ao_vivo int)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT f.league_id,
         max(f.league_name) AS league_name,
         max(f.league_logo) AS league_logo,
         max(f.country) AS country,
         count(*)::int AS jogos,
         (count(*) FILTER (WHERE f.status IN ('1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE')))::int AS ao_vivo
    FROM public.league_fixtures f
   WHERE f.kickoff >= p_from
     AND f.kickoff < least(p_to, p_from + interval '3 days')
   GROUP BY f.league_id
   ORDER BY 6 DESC, 5 DESC, 3;
$$;
GRANT EXECUTE ON FUNCTION public.public_day_leagues(timestamptz, timestamptz) TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
