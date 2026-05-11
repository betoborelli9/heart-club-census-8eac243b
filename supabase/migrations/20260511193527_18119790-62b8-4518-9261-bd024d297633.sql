CREATE OR REPLACE FUNCTION public.is_admin_or_master(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = _user_id
      AND p.role = 'admin'
  )
  OR EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = _user_id
      AND lower(u.email) = 'betoborelli9@gmail.com'
  );
$$;

CREATE OR REPLACE FUNCTION public.admin_approve_vote(p_voto_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin_or_master(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  UPDATE public.votos
     SET is_fraud_attempt = false,
         is_suspicious = false,
         is_original_vote = true,
         potential_duplicate_user = false,
         status_integridade = 'aprovado',
         status_aprovacao = 'aprovado'
   WHERE id = p_voto_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_delete_vote(p_voto_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin_or_master(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  DELETE FROM public.votos_tracking WHERE voto_id = p_voto_id;
  DELETE FROM public.votos WHERE id = p_voto_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_votes_with_tracking()
 RETURNS TABLE(voto_id uuid, clube_nome text, user_email text, user_nome text, ip_address text, cep text, cidade text, estado text, is_suspicious boolean, status_aprovacao text, motivo_suspicao text, created_at timestamp with time zone, fraud_score integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin_or_master(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      v.id,
      v.clube_nome,
      u.email AS auth_email,
      p.nome_exibicao,
      COALESCE(NULLIF(v.ip_address, ''), NULLIF(vt.ip_address, '')) AS resolved_ip,
      NULLIF(vt.fingerprint, '') AS resolved_fingerprint,
      NULLIF(v.device_model, '') AS resolved_device,
      v.cep,
      v.cidade,
      v.estado,
      COALESCE(v.is_suspicious, false) AS stored_suspicious,
      COALESCE(v.status_aprovacao, 'aprovado') AS stored_status,
      v.motivo_suspicao,
      v.created_at
    FROM public.votos v
    LEFT JOIN public.votos_tracking vt ON vt.voto_id = v.id
    LEFT JOIN auth.users u ON v.user_id = u.id
    LEFT JOIN public.profiles p ON v.user_id = p.id
  ),
  scored AS (
    SELECT
      b.*,
      count(*) FILTER (WHERE b.resolved_ip IS NOT NULL) OVER (PARTITION BY b.resolved_ip) AS ip_count,
      count(*) FILTER (WHERE b.resolved_fingerprint IS NOT NULL) OVER (PARTITION BY b.resolved_fingerprint) AS fingerprint_count,
      count(*) FILTER (WHERE b.resolved_device IS NOT NULL) OVER (PARTITION BY b.resolved_device) AS device_count
    FROM base b
  ),
  final AS (
    SELECT
      s.*,
      (
        CASE WHEN COALESCE(s.ip_count, 0) > 1 THEN 40 ELSE 0 END +
        CASE WHEN COALESCE(s.fingerprint_count, 0) > 1 THEN 50 ELSE 0 END +
        CASE WHEN COALESCE(s.device_count, 0) > 1 THEN 30 ELSE 0 END +
        CASE WHEN s.stored_suspicious THEN 20 ELSE 0 END
      )::integer AS computed_score
    FROM scored s
  )
  SELECT
    f.id AS voto_id,
    f.clube_nome::text,
    f.auth_email::text AS user_email,
    f.nome_exibicao::text AS user_nome,
    f.resolved_ip::text AS ip_address,
    f.cep::text,
    f.cidade::text,
    f.estado::text,
    (f.stored_suspicious OR f.computed_score >= 40) AS is_suspicious,
    CASE
      WHEN f.stored_status = 'recusado' THEN 'recusado'
      WHEN (f.stored_suspicious OR f.computed_score >= 40) THEN 'suspeito'
      ELSE 'aprovado'
    END::text AS status_aprovacao,
    CASE
      WHEN f.stored_status = 'recusado' THEN COALESCE(f.motivo_suspicao, 'VOTO RECUSADO PELO ADMINISTRADOR')
      WHEN f.stored_suspicious OR f.computed_score >= 40 THEN trim(BOTH ' + ' FROM concat_ws(' + ',
        CASE WHEN COALESCE(f.ip_count, 0) > 1 THEN 'MESMO IP DETECTADO (' || f.ip_count || 'x)' END,
        CASE WHEN COALESCE(f.fingerprint_count, 0) > 1 THEN 'MESMO DISPOSITIVO/FINGERPRINT (' || f.fingerprint_count || 'x)' END,
        CASE WHEN COALESCE(f.device_count, 0) > 1 THEN 'MESMO MODELO DE DISPOSITIVO (' || f.device_count || 'x)' END,
        CASE WHEN f.stored_suspicious AND f.motivo_suspicao IS NOT NULL THEN f.motivo_suspicao END,
        'SCORE ' || f.computed_score
      ))
      ELSE f.motivo_suspicao
    END::text AS motivo_suspicao,
    f.created_at,
    f.computed_score AS fraud_score
  FROM final f
  ORDER BY f.created_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_vote_sympathies(p_voto_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result json;
BEGIN
  IF NOT public.is_admin_or_master(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  SELECT json_build_object(
    'sympathy_1', sympathy_1,
    'sympathy_2', sympathy_2,
    'sympathy_3', sympathy_3,
    'sympathy_4', sympathy_4
  ) INTO result
  FROM public.votos
  WHERE id = p_voto_id;

  RETURN COALESCE(result, '{}'::json);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_geo_options(p_continent text DEFAULT NULL::text, p_country text DEFAULT NULL::text, p_state text DEFAULT NULL::text, p_city text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result json;
BEGIN
  IF NOT public.is_admin_or_master(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  SELECT json_build_object(
    'continents', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT COALESCE(NULLIF(voto_continente,''), 'N/A') AS name, count(*) AS votes
        FROM public.votos WHERE is_original_vote = true
        GROUP BY 1 ORDER BY votes DESC
      ) t
    ),
    'countries', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT COALESCE(NULLIF(voto_pais,''), NULLIF(pais,''), 'N/A') AS name, count(*) AS votes
        FROM public.votos
        WHERE is_original_vote = true
          AND (p_continent IS NULL OR voto_continente = p_continent)
        GROUP BY 1 ORDER BY votes DESC LIMIT 250
      ) t
    ),
    'states', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT COALESCE(NULLIF(estado,''), 'N/A') AS name, count(*) AS votes
        FROM public.votos
        WHERE is_original_vote = true
          AND (p_continent IS NULL OR voto_continente = p_continent)
          AND (p_country IS NULL OR COALESCE(NULLIF(voto_pais,''), NULLIF(pais,'')) = p_country)
        GROUP BY 1 ORDER BY votes DESC LIMIT 200
      ) t
    ),
    'cities', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT COALESCE(NULLIF(voto_cidade,''), NULLIF(cidade,''), 'N/A') AS name, count(*) AS votes
        FROM public.votos
        WHERE is_original_vote = true
          AND (p_continent IS NULL OR voto_continente = p_continent)
          AND (p_country IS NULL OR COALESCE(NULLIF(voto_pais,''), NULLIF(pais,'')) = p_country)
          AND (p_state IS NULL OR estado = p_state)
        GROUP BY 1 ORDER BY votes DESC LIMIT 300
      ) t
    ),
    'neighborhoods', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT COALESCE(NULLIF(bairro,''), 'N/A') AS name, count(*) AS votes
        FROM public.votos
        WHERE is_original_vote = true AND bairro IS NOT NULL AND length(trim(bairro))>0
          AND (p_continent IS NULL OR voto_continente = p_continent)
          AND (p_country IS NULL OR COALESCE(NULLIF(voto_pais,''), NULLIF(pais,'')) = p_country)
          AND (p_state IS NULL OR estado = p_state)
          AND (p_city IS NULL OR COALESCE(NULLIF(voto_cidade,''), NULLIF(cidade,'')) = p_city)
        GROUP BY 1 ORDER BY votes DESC LIMIT 500
      ) t
    )
  ) INTO result;
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_global_bi_stats(p_continent text DEFAULT NULL::text, p_country text DEFAULT NULL::text, p_state text DEFAULT NULL::text, p_city text DEFAULT NULL::text, p_neighborhood text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result json;
BEGIN
  IF NOT public.is_admin_or_master(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  WITH filtered AS (
    SELECT v.*
    FROM public.votos v
    WHERE v.is_original_vote = true
      AND (p_continent IS NULL OR v.voto_continente = p_continent)
      AND (p_country IS NULL OR COALESCE(NULLIF(v.voto_pais,''), NULLIF(v.pais,'')) = p_country)
      AND (p_state IS NULL OR v.estado = p_state)
      AND (p_city IS NULL OR COALESCE(NULLIF(v.voto_cidade,''), NULLIF(v.cidade,'')) = p_city)
      AND (p_neighborhood IS NULL OR v.bairro = p_neighborhood)
  )
  SELECT json_build_object(
    'total_votes', (SELECT count(*) FROM filtered),
    'total_users', (SELECT count(DISTINCT user_id) FROM filtered),
    'fraud_attempts', (SELECT count(*) FROM public.votos WHERE is_fraud_attempt = true),
    'by_age', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT COALESCE(p.faixa_etaria, 'N/A') AS label, count(*) AS value
        FROM filtered f JOIN public.profiles p ON p.id = f.user_id
        WHERE p.faixa_etaria IS NOT NULL
        GROUP BY 1 ORDER BY value DESC
      ) t
    ),
    'by_gender', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT COALESCE(p.genero, 'N/A') AS label, count(*) AS value
        FROM filtered f JOIN public.profiles p ON p.id = f.user_id
        WHERE p.genero IS NOT NULL
        GROUP BY 1 ORDER BY value DESC
      ) t
    ),
    'by_continent', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT COALESCE(NULLIF(voto_continente,''), 'N/A') AS label, count(*) AS value
        FROM filtered GROUP BY 1 ORDER BY value DESC LIMIT 10
      ) t
    ),
    'by_country', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT COALESCE(NULLIF(voto_pais,''), NULLIF(pais,''), 'N/A') AS label, count(*) AS value
        FROM filtered GROUP BY 1 ORDER BY value DESC LIMIT 30
      ) t
    ),
    'by_state', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT COALESCE(NULLIF(estado,''), 'N/A') AS label, count(*) AS value
        FROM filtered GROUP BY 1 ORDER BY value DESC LIMIT 30
      ) t
    ),
    'by_city', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT COALESCE(NULLIF(voto_cidade,''), NULLIF(cidade,''), 'N/A') AS label, count(*) AS value
        FROM filtered GROUP BY 1 ORDER BY value DESC LIMIT 30
      ) t
    ),
    'by_club', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT clube_nome AS label, count(*) AS value
        FROM filtered GROUP BY 1 ORDER BY value DESC LIMIT 30
      ) t
    )
  ) INTO result;
  RETURN result;
END;
$function$;