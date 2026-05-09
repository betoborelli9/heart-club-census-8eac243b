DROP FUNCTION IF EXISTS public.admin_get_votes_with_tracking();

CREATE OR REPLACE FUNCTION public.admin_get_votes_with_tracking()
RETURNS TABLE(
  voto_id uuid,
  clube_nome text,
  user_email text,
  user_nome text,
  ip_address text,
  cep text,
  cidade text,
  estado text,
  is_suspicious boolean,
  status_aprovacao text,
  motivo_suspicao text,
  created_at timestamp with time zone,
  fraud_score integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  ) THEN
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