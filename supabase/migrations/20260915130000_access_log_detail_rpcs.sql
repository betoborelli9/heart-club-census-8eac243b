-- RPCs de detalhe de acesso: planilha (nome, data/hora, pagina) e ranking
-- de torcedores mais ativos com paginas ja visitadas.

CREATE OR REPLACE FUNCTION public.admin_get_access_detail(p_limit integer DEFAULT 500)
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

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO result FROM (
    SELECT
      COALESCE(p.nome_exibicao, 'Visitante anônimo') AS nome,
      u.email,
      a.club_viewed,
      a.platform,
      a.path,
      a.created_at
    FROM public.access_log a
    LEFT JOIN auth.users u ON u.id = a.user_id
    LEFT JOIN public.profiles p ON p.id = a.user_id
    ORDER BY a.created_at DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 2000)
  ) t;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_access_by_user()
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

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO result FROM (
    SELECT
      a.user_id,
      COALESCE(p.nome_exibicao, u.email, 'Torcedor') AS nome,
      u.email,
      count(*) AS total_accesses,
      COALESCE(json_agg(DISTINCT a.path), '[]'::json) AS paginas_visitadas,
      min(a.created_at) AS primeiro_acesso,
      max(a.created_at) AS ultimo_acesso
    FROM public.access_log a
    LEFT JOIN auth.users u ON u.id = a.user_id
    LEFT JOIN public.profiles p ON p.id = a.user_id
    WHERE a.user_id IS NOT NULL
    GROUP BY a.user_id, p.nome_exibicao, u.email
    ORDER BY count(*) DESC
    LIMIT 200
  ) t;

  RETURN result;
END;
$$;
