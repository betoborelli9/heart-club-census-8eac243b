DROP FUNCTION IF EXISTS public.admin_get_votes_with_tracking();

CREATE OR REPLACE FUNCTION public.admin_get_votes_with_tracking()
 RETURNS TABLE(voto_id uuid, clube_nome text, user_email text, user_nome text, ip_address text, cep text, bairro text, cidade text, estado text, is_suspicious boolean, status_aprovacao text, motivo_suspicao text, created_at timestamp with time zone, fraud_score integer, sympathy_1 text, sympathy_2 text, sympathy_3 text, sympathy_4 text, referral_source text, referral_ambassador_name text, referral_code text)
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
      v.user_id,
      v.clube_nome,
      u.email AS auth_email,
      p.nome_exibicao,
      COALESCE(NULLIF(v.ip_address, ''), NULLIF(vt.ip_address, '')) AS resolved_ip,
      COALESCE(NULLIF(v.fingerprint, ''), NULLIF(vt.fingerprint, '')) AS resolved_fingerprint,
      NULLIF(v.device_model, '') AS resolved_device,
      v.cep,
      COALESCE(NULLIF(v.bairro, ''), NULLIF(p.bairro, '')) AS bairro,
      v.cidade,
      v.estado,
      COALESCE(v.is_suspicious, false) AS stored_suspicious,
      COALESCE(v.status_aprovacao, 'aprovado') AS stored_status,
      v.status_integridade,
      v.motivo_suspicao,
      v.created_at,
      v.sympathy_1,
      v.sympathy_2,
      v.sympathy_3,
      v.sympathy_4
    FROM public.votos v
    LEFT JOIN public.votos_tracking vt ON vt.voto_id = v.id
    LEFT JOIN auth.users u ON v.user_id = u.id
    LEFT JOIN public.profiles p ON v.user_id = p.id
    WHERE v.status_integridade IS DISTINCT FROM 'ficticio'
  ),
  scored AS (
    SELECT
      b.*,
      count(*) FILTER (WHERE b.resolved_ip IS NOT NULL) OVER (PARTITION BY b.resolved_ip) AS ip_count,
      count(*) FILTER (WHERE b.resolved_fingerprint IS NOT NULL) OVER (PARTITION BY b.resolved_fingerprint) AS fingerprint_count,
      count(*) FILTER (WHERE b.resolved_device IS NOT NULL) OVER (PARTITION BY b.resolved_device) AS device_count,
      count(*) FILTER (WHERE b.resolved_ip IS NOT NULL) OVER (PARTITION BY lower(trim(b.clube_nome)), b.resolved_ip) AS club_ip_count,
      count(*) FILTER (WHERE b.resolved_fingerprint IS NOT NULL) OVER (PARTITION BY lower(trim(b.clube_nome)), b.resolved_fingerprint) AS club_fingerprint_count
    FROM base b
  ),
  final AS (
    SELECT
      s.*,
      (
        CASE WHEN COALESCE(s.ip_count, 0) > 1 THEN 40 ELSE 0 END +
        CASE WHEN COALESCE(s.fingerprint_count, 0) > 1 THEN 50 ELSE 0 END +
        CASE WHEN COALESCE(s.device_count, 0) > 1 THEN 30 ELSE 0 END +
        CASE WHEN COALESCE(s.club_ip_count, 0) > 1 THEN 60 ELSE 0 END +
        CASE WHEN COALESCE(s.club_fingerprint_count, 0) > 1 THEN 80 ELSE 0 END +
        CASE WHEN s.stored_suspicious THEN 20 ELSE 0 END
      )::integer AS computed_score
    FROM scored s
  )
  SELECT
    f.id AS voto_id,
    f.clube_nome::text,
    f.auth_email::text,
    f.nome_exibicao::text,
    f.resolved_ip::text,
    f.cep::text,
    f.bairro::text,
    f.cidade::text,
    f.estado::text,
    CASE
      WHEN f.stored_status = 'recusado' THEN true
      WHEN f.status_integridade = 'aprovado' AND NOT f.stored_suspicious THEN false
      ELSE (f.stored_suspicious OR f.computed_score >= 40)
    END,
    CASE
      WHEN f.stored_status = 'recusado' THEN 'recusado'
      WHEN f.status_integridade = 'aprovado' AND NOT f.stored_suspicious THEN 'aprovado'
      WHEN (f.stored_suspicious OR f.computed_score >= 40) THEN 'suspeito'
      ELSE 'aprovado'
    END::text,
    CASE
      WHEN f.stored_status = 'recusado' THEN COALESCE(f.motivo_suspicao, 'VOTO RECUSADO PELO ADMINISTRADOR')
      WHEN f.status_integridade = 'aprovado' AND NOT f.stored_suspicious THEN NULL
      WHEN f.stored_suspicious OR f.computed_score >= 40 THEN trim(BOTH ' + ' FROM concat_ws(' + ',
        CASE WHEN COALESCE(f.ip_count, 0) > 1 THEN 'MESMO IP DETECTADO (' || f.ip_count || 'x)' END,
        CASE WHEN COALESCE(f.fingerprint_count, 0) > 1 THEN 'MESMO DISPOSITIVO/FINGERPRINT (' || f.fingerprint_count || 'x)' END,
        CASE WHEN COALESCE(f.device_count, 0) > 1 THEN 'MESMO MODELO DE DISPOSITIVO (' || f.device_count || 'x)' END,
        CASE WHEN COALESCE(f.club_ip_count, 0) > 1 THEN 'MESMO CLUBE NO MESMO IP (' || f.club_ip_count || 'x)' END,
        CASE WHEN COALESCE(f.club_fingerprint_count, 0) > 1 THEN 'MESMO CLUBE NO MESMO DISPOSITIVO (' || f.club_fingerprint_count || 'x)' END,
        CASE WHEN f.stored_suspicious AND f.motivo_suspicao IS NOT NULL THEN f.motivo_suspicao END,
        'SCORE ' || LEAST(f.computed_score, 100)
      ))
      ELSE f.motivo_suspicao
    END::text,
    f.created_at,
    LEAST(f.computed_score, 100),
    f.sympathy_1::text,
    f.sympathy_2::text,
    f.sympathy_3::text,
    f.sympathy_4::text,
    CASE WHEN ind.embaixador_id IS NOT NULL THEN 'embaixador' ELSE 'organico' END::text AS referral_source,
    pe.nome_exibicao::text AS referral_ambassador_name,
    ind.codigo_usado::text AS referral_code
  FROM final f
  LEFT JOIN public.indicacoes ind ON ind.indicado_id = f.user_id
  LEFT JOIN public.profiles pe ON pe.id = ind.embaixador_id
  ORDER BY f.created_at DESC;
END;
$function$;