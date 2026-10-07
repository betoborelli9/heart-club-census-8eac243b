-- RELATORIO DE VISITAS POR PAGINA: so o Beto/admin ve (vai em PDF que ele envia aos parceiros).
-- O parceiro NAO tem acesso a esta funcao (so is_admin_or_master).
CREATE OR REPLACE FUNCTION public.admin_get_page_visits(p_days int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d int := greatest(1, least(coalesce(p_days, 30), 365));
  r jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_or_master(auth.uid()) THEN
    RAISE EXCEPTION 'acesso restrito' USING ERRCODE = '42501';
  END IF;

  WITH base AS (
    SELECT visitor_id, platform, created_at,
           coalesce(nullif(regexp_replace(coalesce(path, '/'), '[?#].*$', ''), ''), '/') AS pagina
    FROM public.access_log
    WHERE created_at > now() - make_interval(days => d)
  ),
  pag AS (
    SELECT pagina, count(*)::int AS visitas, count(DISTINCT visitor_id)::int AS unicos
    FROM base GROUP BY pagina ORDER BY visitas DESC, pagina LIMIT 25
  ),
  dia AS (
    SELECT created_at::date AS dia, count(*)::int AS visitas, count(DISTINCT visitor_id)::int AS unicos
    FROM base GROUP BY 1 ORDER BY 1
  ),
  plat AS (
    SELECT platform, count(*)::int AS visitas FROM base GROUP BY 1 ORDER BY 2 DESC
  )
  SELECT jsonb_build_object(
    'gerado_em', now(),
    'dias', d,
    'total', (SELECT count(*)::int FROM base),
    'unicos', (SELECT count(DISTINCT visitor_id)::int FROM base),
    'por_pagina', (SELECT coalesce(jsonb_agg(to_jsonb(pag)), '[]'::jsonb) FROM pag),
    'por_dia', (SELECT coalesce(jsonb_agg(to_jsonb(dia)), '[]'::jsonb) FROM dia),
    'por_plataforma', (SELECT coalesce(jsonb_agg(to_jsonb(plat)), '[]'::jsonb) FROM plat)
  ) INTO r;

  RETURN r;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_get_page_visits(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_page_visits(int) TO authenticated;

NOTIFY pgrst, 'reload schema';
