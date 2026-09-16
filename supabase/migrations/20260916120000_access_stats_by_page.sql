-- Adiciona ranking de acessos por PAGINA (site+app) aos 30 dias, pra
-- Beto decidir onde vender espaco publicitario com base no trafego real.
CREATE OR REPLACE FUNCTION public.admin_get_access_stats()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ) AND (SELECT email FROM auth.users WHERE id = auth.uid()) <> 'betoborelli9@gmail.com' THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  SELECT json_build_object(
    'total_today', (SELECT count(*) FROM public.access_log WHERE created_at > date_trunc('day', now())),
    'total_7d', (SELECT count(*) FROM public.access_log WHERE created_at > now() - interval '7 days'),
    'total_30d', (SELECT count(*) FROM public.access_log WHERE created_at > now() - interval '30 days'),
    'total_all', (SELECT count(*) FROM public.access_log),
    'unique_today', (SELECT count(DISTINCT visitor_id) FROM public.access_log WHERE created_at > date_trunc('day', now())),
    'unique_7d', (SELECT count(DISTINCT visitor_id) FROM public.access_log WHERE created_at > now() - interval '7 days'),
    'unique_30d', (SELECT count(DISTINCT visitor_id) FROM public.access_log WHERE created_at > now() - interval '30 days'),
    'unique_all', (SELECT count(DISTINCT visitor_id) FROM public.access_log),
    'by_platform_30d', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT platform, count(*) AS total
        FROM public.access_log
        WHERE created_at > now() - interval '30 days'
        GROUP BY 1 ORDER BY total DESC
      ) t
    ),
    'by_club_30d', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT club_viewed, count(*) AS total, count(DISTINCT visitor_id) AS unicos
        FROM public.access_log
        WHERE created_at > now() - interval '30 days' AND club_viewed IS NOT NULL
        GROUP BY 1 ORDER BY total DESC LIMIT 30
      ) t
    ),
    'by_page_30d', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT
          path,
          count(*) AS total,
          count(DISTINCT visitor_id) AS unicos,
          count(*) FILTER (WHERE platform = 'web') AS via_site,
          count(*) FILTER (WHERE platform = 'android_twa') AS via_app
        FROM public.access_log
        WHERE created_at > now() - interval '30 days' AND path IS NOT NULL
        GROUP BY 1 ORDER BY total DESC LIMIT 30
      ) t
    ),
    'daily_30d', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT date_trunc('day', created_at)::date AS dia, count(*) AS total, count(DISTINCT visitor_id) AS unicos
        FROM public.access_log
        WHERE created_at > now() - interval '30 days'
        GROUP BY 1 ORDER BY 1
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$$;
