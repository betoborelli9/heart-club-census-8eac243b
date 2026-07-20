-- Endurece 5 funções que estavam sem search_path fixo (proteção padrão
-- recomendada pelo Supabase contra manipulação de schema). Não altera o
-- comportamento das funções, apenas fixa o schema de resolução de nomes.

ALTER FUNCTION public.get_active_competitions_v2(p_team_id integer) SET search_path = public;
ALTER FUNCTION public.get_real_time_competitions(p_team_id integer) SET search_path = public;
ALTER FUNCTION public.get_team_stats_v2(team_id_param uuid, location_type text, location_name text) SET search_path = public;
ALTER FUNCTION public.get_votos_por_territorio(time_nome text, tipo_local text, nome_local text) SET search_path = public;
ALTER FUNCTION public.get_votos_por_territorio(time_id uuid, tipo_local text, nome_local text) SET search_path = public;
ALTER FUNCTION public.normalize_club_name(t text) SET search_path = public;
