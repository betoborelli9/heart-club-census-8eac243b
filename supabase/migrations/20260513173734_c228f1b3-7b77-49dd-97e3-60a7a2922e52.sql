-- Corrige a auditoria antifraude para votos duplicados que entram como status_aprovacao='aprovado'
-- sem terem sido aprovados manualmente pelo administrador.

CREATE OR REPLACE FUNCTION public.move_vote_tracking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.votos_tracking (voto_id, fingerprint, ip_address, is_suspicious)
  VALUES (NEW.id, NEW.fingerprint, NEW.ip_address, COALESCE(NEW.is_suspicious, false))
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.apply_vote_fraud_audit(p_voto_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  target_vote record;
  same_ip_count integer := 0;
  same_fingerprint_count integer := 0;
  same_user_count integer := 0;
  same_club_ip_count integer := 0;
  same_club_fingerprint_count integer := 0;
  score integer := 0;
  reasons text[] := ARRAY[]::text[];
  final_reason text;
BEGIN
  SELECT
    v.id,
    v.user_id,
    v.clube_nome,
    v.status_aprovacao,
    v.status_integridade,
    COALESCE(NULLIF(v.ip_address, ''), NULLIF(vt.ip_address, '')) AS resolved_ip,
    COALESCE(NULLIF(v.fingerprint, ''), NULLIF(vt.fingerprint, '')) AS resolved_fingerprint
  INTO target_vote
  FROM public.votos v
  LEFT JOIN public.votos_tracking vt ON vt.voto_id = v.id
  WHERE v.id = p_voto_id;

  IF target_vote.id IS NULL THEN
    RETURN;
  END IF;

  -- Aprovação manual do admin tem prioridade: admin_approve_vote grava status_integridade='aprovado'.
  IF target_vote.status_aprovacao = 'recusado' OR target_vote.status_integridade = 'aprovado' THEN
    RETURN;
  END IF;

  IF target_vote.resolved_ip IS NOT NULL THEN
    SELECT count(*) INTO same_ip_count
    FROM public.votos v
    LEFT JOIN public.votos_tracking vt ON vt.voto_id = v.id
    WHERE v.id <> target_vote.id
      AND v.status_integridade IS DISTINCT FROM 'ficticio'
      AND COALESCE(NULLIF(v.ip_address, ''), NULLIF(vt.ip_address, '')) = target_vote.resolved_ip;

    SELECT count(*) INTO same_club_ip_count
    FROM public.votos v
    LEFT JOIN public.votos_tracking vt ON vt.voto_id = v.id
    WHERE v.id <> target_vote.id
      AND v.status_integridade IS DISTINCT FROM 'ficticio'
      AND lower(trim(v.clube_nome)) = lower(trim(target_vote.clube_nome))
      AND COALESCE(NULLIF(v.ip_address, ''), NULLIF(vt.ip_address, '')) = target_vote.resolved_ip;
  END IF;

  IF target_vote.resolved_fingerprint IS NOT NULL THEN
    SELECT count(*) INTO same_fingerprint_count
    FROM public.votos v
    LEFT JOIN public.votos_tracking vt ON vt.voto_id = v.id
    WHERE v.id <> target_vote.id
      AND v.status_integridade IS DISTINCT FROM 'ficticio'
      AND COALESCE(NULLIF(v.fingerprint, ''), NULLIF(vt.fingerprint, '')) = target_vote.resolved_fingerprint;

    SELECT count(*) INTO same_club_fingerprint_count
    FROM public.votos v
    LEFT JOIN public.votos_tracking vt ON vt.voto_id = v.id
    WHERE v.id <> target_vote.id
      AND v.status_integridade IS DISTINCT FROM 'ficticio'
      AND lower(trim(v.clube_nome)) = lower(trim(target_vote.clube_nome))
      AND COALESCE(NULLIF(v.fingerprint, ''), NULLIF(vt.fingerprint, '')) = target_vote.resolved_fingerprint;
  END IF;

  SELECT count(*) INTO same_user_count
  FROM public.votos v
  WHERE v.id <> target_vote.id
    AND v.status_integridade IS DISTINCT FROM 'ficticio'
    AND v.user_id = target_vote.user_id;

  IF same_ip_count > 0 THEN
    score := score + 40;
    reasons := reasons || format('MESMO IP DETECTADO (%sx)', same_ip_count + 1);
  END IF;

  IF same_fingerprint_count > 0 THEN
    score := score + 50;
    reasons := reasons || format('MESMO DISPOSITIVO/FINGERPRINT (%sx)', same_fingerprint_count + 1);
  END IF;

  IF same_user_count > 0 THEN
    score := score + 100;
    reasons := reasons || format('MESMO USUÁRIO VOTOU MAIS DE UMA VEZ (%sx)', same_user_count + 1);
  END IF;

  IF same_club_ip_count > 0 THEN
    score := score + 60;
    reasons := reasons || format('MESMO CLUBE NO MESMO IP (%sx)', same_club_ip_count + 1);
  END IF;

  IF same_club_fingerprint_count > 0 THEN
    score := score + 80;
    reasons := reasons || format('MESMO CLUBE NO MESMO DISPOSITIVO (%sx)', same_club_fingerprint_count + 1);
  END IF;

  IF score > 100 THEN
    score := 100;
  END IF;

  IF score >= 40 THEN
    final_reason := array_to_string(reasons, ' + ') || ' + SCORE ' || score;

    UPDATE public.votos
    SET is_suspicious = true,
        potential_duplicate_user = true,
        status_aprovacao = 'pendente',
        motivo_suspicao = final_reason
    WHERE id = target_vote.id;

    UPDATE public.votos_tracking
    SET is_suspicious = true
    WHERE voto_id = target_vote.id;
  ELSE
    UPDATE public.votos
    SET is_suspicious = false,
        potential_duplicate_user = false,
        status_aprovacao = 'aprovado',
        motivo_suspicao = NULL
    WHERE id = target_vote.id;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_apply_vote_fraud_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.apply_vote_fraud_audit(NEW.id);
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_apply_vote_fraud_audit ON public.votos;
CREATE TRIGGER trg_apply_vote_fraud_audit
  AFTER INSERT ON public.votos
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_apply_vote_fraud_audit();

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
      COALESCE(NULLIF(v.fingerprint, ''), NULLIF(vt.fingerprint, '')) AS resolved_fingerprint,
      NULLIF(v.device_model, '') AS resolved_device,
      v.cep,
      v.cidade,
      v.estado,
      COALESCE(v.is_suspicious, false) AS stored_suspicious,
      COALESCE(v.status_aprovacao, 'aprovado') AS stored_status,
      v.status_integridade,
      v.motivo_suspicao,
      v.created_at
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
    f.auth_email::text AS user_email,
    f.nome_exibicao::text AS user_nome,
    f.resolved_ip::text AS ip_address,
    f.cep::text,
    f.cidade::text,
    f.estado::text,
    CASE
      WHEN f.stored_status = 'recusado' THEN true
      WHEN f.status_integridade = 'aprovado' AND NOT f.stored_suspicious THEN false
      ELSE (f.stored_suspicious OR f.computed_score >= 40)
    END AS is_suspicious,
    CASE
      WHEN f.stored_status = 'recusado' THEN 'recusado'
      WHEN f.status_integridade = 'aprovado' AND NOT f.stored_suspicious THEN 'aprovado'
      WHEN (f.stored_suspicious OR f.computed_score >= 40) THEN 'suspeito'
      ELSE 'aprovado'
    END::text AS status_aprovacao,
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
    END::text AS motivo_suspicao,
    f.created_at,
    LEAST(f.computed_score, 100) AS fraud_score
  FROM final f
  ORDER BY f.created_at DESC;
END;
$function$;

-- Reprocessa votos reais existentes, incluindo os dois Vila Nova com o mesmo IP já gravados.
DO $$
DECLARE
  vote_record record;
BEGIN
  FOR vote_record IN
    SELECT id
    FROM public.votos
    WHERE status_integridade IS DISTINCT FROM 'ficticio'
    ORDER BY created_at ASC
  LOOP
    PERFORM public.apply_vote_fraud_audit(vote_record.id);
  END LOOP;
END $$;