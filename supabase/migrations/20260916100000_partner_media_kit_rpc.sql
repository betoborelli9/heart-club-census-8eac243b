-- RPC: Mídia Kit por clube — número real de torcedores, alcance geográfico
-- e acessos (site+app) dos últimos 30 dias, pronto pra mostrar a patrocinadores.
CREATE OR REPLACE FUNCTION public.admin_get_club_media_kit(p_club text)
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
    'clube', p_club,
    'total_votos', (SELECT count(*) FROM public.votos WHERE clube_nome = p_club AND is_original_vote = true),
    'paises', (SELECT count(DISTINCT voto_pais) FROM public.votos WHERE clube_nome = p_club AND is_original_vote = true),
    'top_estados', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT COALESCE(NULLIF(estado,''), 'N/A') AS estado, count(*) AS total
        FROM public.votos WHERE clube_nome = p_club AND is_original_vote = true
        GROUP BY 1 ORDER BY total DESC LIMIT 5
      ) t
    ),
    'top_cidades', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT COALESCE(NULLIF(voto_cidade,''), NULLIF(cidade,''), 'N/A') AS cidade, count(*) AS total
        FROM public.votos WHERE clube_nome = p_club AND is_original_vote = true
        GROUP BY 1 ORDER BY total DESC LIMIT 5
      ) t
    ),
    'acessos_30d', (SELECT count(*) FROM public.access_log WHERE club_viewed = p_club AND created_at > now() - interval '30 days'),
    'acessos_30d_unicos', (SELECT count(DISTINCT visitor_id) FROM public.access_log WHERE club_viewed = p_club AND created_at > now() - interval '30 days'),
    'acessos_web_30d', (SELECT count(*) FROM public.access_log WHERE club_viewed = p_club AND platform = 'web' AND created_at > now() - interval '30 days'),
    'acessos_app_30d', (SELECT count(*) FROM public.access_log WHERE club_viewed = p_club AND platform = 'android_twa' AND created_at > now() - interval '30 days')
  ) INTO result;

  RETURN result;
END;
$$;
