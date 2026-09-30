-- Corrige 14 funcoes administrativas que so aceitavam profiles.role='admin',
-- sem a excecao pro e-mail master (betoborelli9@gmail.com) -- que e como
-- o Beto realmente acessa o /admin hoje (profiles.role dele nunca foi
-- setado como 'admin'). Isso deixava varias abas do Admin retornando
-- "Access denied" pra ele silenciosamente. Troca a checagem inline pela
-- funcao auxiliar ja existente public.is_admin_or_master(), que ja cobre
-- os dois casos.

CREATE OR REPLACE FUNCTION public.admin_clean_fraud_by_fingerprint()
 RETURNS TABLE(deleted_count integer, marked_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _deleted integer := 0;
  _marked integer := 0;
  _fp record;
BEGIN
  IF NOT public.is_admin_or_master(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  FOR _fp IN
    SELECT vt.fingerprint as fp, array_agg(vt.voto_id ORDER BY v.created_at ASC) as vote_ids
    FROM public.votos_tracking vt
    JOIN public.votos v ON v.id = vt.voto_id
    WHERE vt.fingerprint IS NOT NULL AND vt.fingerprint != ''
    GROUP BY vt.fingerprint
    HAVING count(*) > 1
  LOOP
    UPDATE public.votos
    SET is_original_vote = true, is_fraud_attempt = true
    WHERE id = _fp.vote_ids[1];
    _marked := _marked + 1;

    DELETE FROM public.votos_tracking WHERE voto_id = ANY(_fp.vote_ids[2:]);
    DELETE FROM public.votos WHERE id = ANY(_fp.vote_ids[2:]);
    _deleted := _deleted + array_length(_fp.vote_ids, 1) - 1;
  END LOOP;

  RETURN QUERY SELECT _deleted, _marked;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_detect_vote_clusters()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  flagged integer := 0;
  clusters integer := 0;
BEGIN
  IF NOT public.is_admin_or_master(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  WITH grouped AS (
    SELECT vt.ip_address, v.bairro, p.profissao,
           md5(coalesce(vt.ip_address,'') || '|' || coalesce(v.bairro,'') || '|' || coalesce(p.profissao,'')) AS cid,
           array_agg(v.id) AS ids,
           count(*) AS qtd
    FROM public.votos v
    JOIN public.votos_tracking vt ON vt.voto_id = v.id
    LEFT JOIN public.profiles p ON p.id = v.user_id
    WHERE vt.ip_address IS NOT NULL
      AND v.bairro IS NOT NULL
      AND p.profissao IS NOT NULL
    GROUP BY vt.ip_address, v.bairro, p.profissao
    HAVING count(*) >= 2
  ),
  upd AS (
    UPDATE public.votos v
       SET potential_duplicate_user = true,
           cluster_id = g.cid,
           is_suspicious = true
      FROM grouped g
     WHERE v.id = ANY(g.ids)
    RETURNING v.id, g.cid
  )
  SELECT count(*), count(DISTINCT cid) INTO flagged, clusters FROM upd;

  RETURN json_build_object('flagged', COALESCE(flagged,0), 'clusters', COALESCE(clusters,0));
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_flag_isp_clusters(p_threshold integer DEFAULT 5)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  flagged integer := 0;
BEGIN
  IF NOT public.is_admin_or_master(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  WITH grouped AS (
    SELECT isp, bairro, array_agg(id) AS ids
    FROM public.votos
    WHERE isp IS NOT NULL AND bairro IS NOT NULL
    GROUP BY isp, bairro
    HAVING count(*) >= p_threshold
  ),
  upd AS (
    UPDATE public.votos v SET is_suspicious = true, potential_duplicate_user = true
    FROM grouped g WHERE v.id = ANY(g.ids)
    RETURNING v.id
  )
  SELECT count(*) INTO flagged FROM upd;

  RETURN json_build_object('flagged', COALESCE(flagged,0));
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_flag_suspicious_devices()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  flagged integer := 0;
BEGIN
  IF NOT public.is_admin_or_master(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  WITH dup AS (
    SELECT v.device_model
    FROM public.votos v
    JOIN auth.users u ON u.id = v.user_id
    WHERE v.device_model IS NOT NULL AND length(trim(v.device_model)) > 0
    GROUP BY v.device_model
    HAVING count(DISTINCT u.email) > 1
  ),
  upd AS (
    UPDATE public.votos
       SET is_suspicious = true
     WHERE device_model IN (SELECT device_model FROM dup)
       AND COALESCE(is_suspicious, false) = false
    RETURNING 1
  )
  SELECT count(*) INTO flagged FROM upd;
  RETURN COALESCE(flagged, 0);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_affinity_ecosystem(p_club text, p_limit integer DEFAULT 15)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result json;
  total integer;
BEGIN
  IF NOT public.is_admin_or_master(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  SELECT count(*) INTO total
  FROM public.votos
  WHERE is_original_vote = true AND clube_nome = p_club;

  WITH unrolled AS (
    SELECT s AS club FROM public.votos v,
      LATERAL (VALUES (v.sympathy_1),(v.sympathy_2),(v.sympathy_3),(v.sympathy_4)) AS x(s)
    WHERE v.is_original_vote = true AND v.clube_nome = p_club
      AND s IS NOT NULL AND length(trim(s)) > 0
  )
  SELECT json_build_object(
    'club', p_club,
    'total_fans', total,
    'affinities', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT club, count(*) AS value,
          round((count(*)::numeric / NULLIF(total, 0)) * 100, 1) AS pct
        FROM unrolled
        GROUP BY club
        ORDER BY value DESC
        LIMIT LEAST(GREATEST(p_limit, 1), 50)
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_audit_summary()
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
    'total_votes', (SELECT count(*) FROM public.votos WHERE is_original_vote = true),
    'suspicious', (SELECT count(*) FROM public.votos WHERE potential_duplicate_user = true OR is_suspicious = true),
    'clusters', (SELECT count(DISTINCT cluster_id) FROM public.votos WHERE cluster_id IS NOT NULL),
    'unique_estimated', (
      SELECT count(*) FROM public.votos
      WHERE is_original_vote = true AND COALESCE(potential_duplicate_user,false) = false
    ),
    'trash_count', (SELECT count(*) FROM public.votos_lixeira),
    'scatter', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT cluster_id, count(*) AS size,
               COALESCE(NULLIF(bairro,''),'N/A') AS bairro,
               COALESCE(NULLIF(isp,''),'N/A') AS isp
        FROM public.votos
        WHERE cluster_id IS NOT NULL
        GROUP BY cluster_id, bairro, isp
        ORDER BY size DESC LIMIT 200
      ) t
    ),
    'isp_breakdown', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT COALESCE(NULLIF(isp,''),'Desconhecido') AS isp, count(*) AS value
        FROM public.votos WHERE isp IS NOT NULL
        GROUP BY 1 ORDER BY value DESC LIMIT 20
      ) t
    )
  ) INTO result;
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_bi_stats()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result json;
BEGIN
  IF NOT public.is_admin_or_master(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  SELECT json_build_object(
    'total_votes', (SELECT count(*) FROM public.votos WHERE is_original_vote = true),
    'total_users', (SELECT count(*) FROM public.profiles),
    'fraud_attempts', (SELECT count(*) FROM public.votos WHERE is_fraud_attempt = true),
    'by_age', (
      SELECT json_agg(row_to_json(t)) FROM (
        SELECT p.faixa_etaria as label, count(*) as value
        FROM public.profiles p
        WHERE p.faixa_etaria IS NOT NULL
        GROUP BY p.faixa_etaria ORDER BY value DESC
      ) t
    ),
    'by_country', (
      SELECT json_agg(row_to_json(t)) FROM (
        SELECT v.pais as label, count(*) as value
        FROM public.votos v WHERE v.is_original_vote = true
        GROUP BY v.pais ORDER BY value DESC LIMIT 20
      ) t
    ),
    'by_state', (
      SELECT json_agg(row_to_json(t)) FROM (
        SELECT v.estado as label, count(*) as value
        FROM public.votos v WHERE v.is_original_vote = true
        GROUP BY v.estado ORDER BY value DESC LIMIT 20
      ) t
    ),
    'by_city', (
      SELECT json_agg(row_to_json(t)) FROM (
        SELECT v.cidade as label, count(*) as value
        FROM public.votos v WHERE v.is_original_vote = true
        GROUP BY v.cidade ORDER BY value DESC LIMIT 20
      ) t
    ),
    'by_club', (
      SELECT json_agg(row_to_json(t)) FROM (
        SELECT v.clube_nome as label, count(*) as value
        FROM public.votos v WHERE v.is_original_vote = true
        GROUP BY v.clube_nome ORDER BY value DESC LIMIT 30
      ) t
    ),
    'by_gender', (
      SELECT json_agg(row_to_json(t)) FROM (
        SELECT p.genero as label, count(*) as value
        FROM public.profiles p
        WHERE p.genero IS NOT NULL
        GROUP BY p.genero ORDER BY value DESC
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_club_neighborhood_ranking(p_club_name text, p_state text DEFAULT NULL::text, p_limit integer DEFAULT 50)
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

  WITH base AS (
    SELECT
      COALESCE(NULLIF(estado,''), 'N/A') AS estado,
      COALESCE(NULLIF(voto_cidade,''), NULLIF(cidade,''), 'N/A') AS cidade,
      COALESCE(NULLIF(bairro,''), 'N/A') AS bairro,
      clube_nome,
      count(*) AS votes
    FROM public.votos
    WHERE is_original_vote = true
      AND bairro IS NOT NULL AND length(trim(bairro)) > 0
      AND (p_state IS NULL OR estado = p_state)
    GROUP BY 1,2,3,4
  ),
  totals AS (
    SELECT estado, cidade, bairro, sum(votes) AS total,
           max(votes) AS leader_votes
    FROM base GROUP BY 1,2,3
  ),
  leaders AS (
    SELECT b.estado, b.cidade, b.bairro, b.clube_nome AS leader
    FROM base b
    JOIN totals t USING (estado, cidade, bairro)
    WHERE b.votes = t.leader_votes
  ),
  club_rows AS (
    SELECT b.estado, b.cidade, b.bairro, b.votes AS club_votes,
           t.total, t.leader_votes,
           (SELECT leader FROM leaders l
              WHERE l.estado=b.estado AND l.cidade=b.cidade AND l.bairro=b.bairro
              LIMIT 1) AS leader
    FROM base b
    JOIN totals t USING (estado, cidade, bairro)
    WHERE b.clube_nome = p_club_name
  )
  SELECT COALESCE(json_agg(row_to_json(x)), '[]'::json) INTO result FROM (
    SELECT estado, cidade, bairro, club_votes, total AS total_votes, leader,
           (leader = p_club_name) AS is_leader,
           round((club_votes::numeric / NULLIF(total,0)) * 100, 1) AS share_pct
    FROM club_rows
    ORDER BY club_votes DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 200)
  ) x;
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_executive_summary(p_days integer DEFAULT 30)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result json;
  total_now integer;
  total_prev integer;
  users_now integer;
  users_prev integer;
BEGIN
  IF NOT public.is_admin_or_master(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  SELECT count(*) INTO total_now FROM public.votos
   WHERE is_original_vote = true AND created_at > now() - (p_days || ' days')::interval;
  SELECT count(*) INTO total_prev FROM public.votos
   WHERE is_original_vote = true
     AND created_at > now() - (2 * p_days || ' days')::interval
     AND created_at <= now() - (p_days || ' days')::interval;
  SELECT count(*) INTO users_now FROM public.profiles
   WHERE id IN (SELECT user_id FROM public.votos WHERE created_at > now() - (p_days || ' days')::interval);
  SELECT count(*) INTO users_prev FROM public.profiles
   WHERE id IN (SELECT user_id FROM public.votos
                WHERE created_at > now() - (2 * p_days || ' days')::interval
                  AND created_at <= now() - (p_days || ' days')::interval);

  SELECT json_build_object(
    'period_days', p_days,
    'votes_total', (SELECT count(*) FROM public.votos WHERE is_original_vote = true),
    'votes_period', total_now,
    'votes_growth_pct', CASE WHEN total_prev > 0 THEN round(((total_now - total_prev)::numeric / total_prev) * 100, 1) ELSE NULL END,
    'users_total', (SELECT count(*) FROM public.profiles),
    'users_period', users_now,
    'users_growth_pct', CASE WHEN users_prev > 0 THEN round(((users_now - users_prev)::numeric / users_prev) * 100, 1) ELSE NULL END,
    'fraud_attempts', (SELECT count(*) FROM public.votos WHERE is_fraud_attempt = true),
    'partner_clicks_period', (SELECT count(*) FROM public.partner_clicks WHERE created_at > now() - (p_days || ' days')::interval),
    'top_neighborhoods', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT COALESCE(NULLIF(voto_cidade,''), NULLIF(cidade,''), 'N/A') AS cidade,
               COALESCE(NULLIF(bairro,''), 'N/A') AS bairro,
               count(*) AS votes
        FROM public.votos
        WHERE is_original_vote = true AND bairro IS NOT NULL AND length(trim(bairro))>0
        GROUP BY 1,2 ORDER BY votes DESC LIMIT 20
      ) t
    ),
    'by_age', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT COALESCE(faixa_etaria, 'N/A') AS label, count(*) AS value
        FROM public.profiles WHERE faixa_etaria IS NOT NULL
        GROUP BY 1 ORDER BY value DESC
      ) t
    ),
    'by_gender', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT COALESCE(genero, 'N/A') AS label, count(*) AS value
        FROM public.profiles WHERE genero IS NOT NULL
        GROUP BY 1 ORDER BY value DESC
      ) t
    ),
    'partner_performance', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT partner_name, count(*) AS clicks
        FROM public.partner_clicks
        WHERE created_at > now() - (p_days || ' days')::interval
        GROUP BY 1 ORDER BY clicks DESC LIMIT 10
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_neighborhood_dominance(p_limit integer DEFAULT 100)
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

  WITH base AS (
    SELECT
      COALESCE(NULLIF(estado,''), 'N/A') AS estado,
      COALESCE(NULLIF(voto_cidade,''), NULLIF(cidade,''), 'N/A') AS cidade,
      COALESCE(NULLIF(bairro,''), 'N/A') AS bairro,
      clube_nome,
      count(*) AS votes
    FROM public.votos
    WHERE is_original_vote = true AND bairro IS NOT NULL AND length(trim(bairro)) > 0
    GROUP BY 1,2,3,4
  ),
  totals AS (
    SELECT estado, cidade, bairro, sum(votes) AS total
    FROM base GROUP BY 1,2,3
  ),
  ranked AS (
    SELECT b.estado, b.cidade, b.bairro, b.clube_nome, b.votes, t.total,
           row_number() OVER (PARTITION BY b.estado, b.cidade, b.bairro ORDER BY b.votes DESC) AS rn
    FROM base b JOIN totals t USING (estado, cidade, bairro)
  )
  SELECT COALESCE(json_agg(row_to_json(x)), '[]'::json) INTO result FROM (
    SELECT estado, cidade, bairro, clube_nome AS leader, votes AS leader_votes,
           total AS total_votes,
           round((votes::numeric / NULLIF(total,0)) * 100, 1) AS dominance_pct
    FROM ranked WHERE rn = 1
    ORDER BY total DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 500)
  ) x;
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_partner_revenue_heatmap(p_days integer DEFAULT 30)
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

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO result FROM (
    SELECT
      COALESCE(NULLIF(cidade,''), 'N/A') AS cidade,
      COALESCE(NULLIF(bairro,''), 'N/A') AS bairro,
      COALESCE(NULLIF(estado,''), 'N/A') AS estado,
      partner_name,
      count(*) AS clicks,
      avg(lat) AS lat,
      avg(lng) AS lng
    FROM public.partner_clicks
    WHERE created_at > now() - (p_days || ' days')::interval
    GROUP BY 1,2,3,4
    ORDER BY clicks DESC
    LIMIT 500
  ) t;
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_socioeconomic_profile(p_club text DEFAULT NULL::text, p_state text DEFAULT NULL::text)
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

  WITH base AS (
    SELECT v.*, p.profissao, p.classe_social, p.faixa_etaria, p.genero
    FROM public.votos v
    LEFT JOIN public.profiles p ON p.id = v.user_id
    WHERE v.is_original_vote = true
      AND (p_club IS NULL OR v.clube_nome = p_club)
      AND (p_state IS NULL OR v.estado = p_state)
  )
  SELECT json_build_object(
    'total_votes', (SELECT count(*) FROM base),
    'audited_real', (SELECT count(*) FROM base WHERE is_fraud_attempt = false),
    'suspicious', (SELECT count(*) FROM base WHERE is_fraud_attempt = true OR is_suspicious = true),
    'by_profession', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT COALESCE(NULLIF(profissao,''), 'Não informado') AS label, count(*) AS value
        FROM base GROUP BY 1 ORDER BY value DESC LIMIT 25
      ) t
    ),
    'by_class', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT COALESCE(NULLIF(classe_social,''), 'N/A') AS label, count(*) AS value
        FROM base GROUP BY 1 ORDER BY label
      ) t
    ),
    'by_device', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT COALESCE(NULLIF(device_model,''), 'Desconhecido') AS label, count(*) AS value
        FROM base GROUP BY 1 ORDER BY value DESC LIMIT 20
      ) t
    ),
    'device_brand', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT
          CASE
            WHEN device_model ILIKE 'iPhone%' OR device_model ILIKE '%iPad%' OR device_model ILIKE '%iOS%' THEN 'iOS'
            WHEN device_model ILIKE '%Android%' OR device_model ILIKE 'Galaxy%' OR device_model ILIKE 'Samsung%'
              OR device_model ILIKE 'Xiaomi%' OR device_model ILIKE 'Motorola%' OR device_model ILIKE 'Pixel%' THEN 'Android'
            ELSE 'Outro'
          END AS label,
          count(*) AS value
        FROM base WHERE device_model IS NOT NULL
        GROUP BY 1 ORDER BY value DESC
      ) t
    ),
    'top_clubs_by_class', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT clube_nome AS club,
          COALESCE(NULLIF(classe_social,''), 'N/A') AS class,
          count(*) AS value
        FROM base GROUP BY 1,2 ORDER BY value DESC LIMIT 60
      ) t
    )
  ) INTO result;
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_sympathy_votes()
 RETURNS TABLE(voto_id uuid, user_id uuid, clube_coracao text, clube_simpatia text, slot integer, pais text, estado text, cidade text, created_at timestamp with time zone, fingerprint text, user_email text, user_nome text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin_or_master(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT
    v.id AS voto_id,
    v.user_id,
    v.clube_nome AS clube_coracao,
    s.club AS clube_simpatia,
    s.slot,
    v.pais, v.estado, v.cidade,
    v.created_at,
    vt.fingerprint,
    u.email::text AS user_email,
    p.nome_exibicao AS user_nome
  FROM public.votos v
  CROSS JOIN LATERAL (
    VALUES
      (v.sympathy_1, 1),
      (v.sympathy_2, 2),
      (v.sympathy_3, 3),
      (v.sympathy_4, 4)
  ) AS s(club, slot)
  LEFT JOIN public.votos_tracking vt ON vt.voto_id = v.id
  LEFT JOIN auth.users u ON u.id = v.user_id
  LEFT JOIN public.profiles p ON p.id = v.user_id
  WHERE s.club IS NOT NULL AND length(trim(s.club)) > 0
  ORDER BY v.created_at DESC, s.slot ASC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_purge_suspicious_to_trash()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  moved integer := 0;
BEGIN
  IF NOT public.is_admin_or_master(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  WITH ins AS (
    INSERT INTO public.votos_lixeira (original_voto_id, user_id, clube_nome, cidade, estado, pais, bairro, isp, cluster_id, reason, payload)
    SELECT v.id, v.user_id, v.clube_nome, v.cidade, v.estado, v.pais, v.bairro, v.isp, v.cluster_id,
           'cluster_or_duplicate', to_jsonb(v.*)
    FROM public.votos v
    WHERE v.potential_duplicate_user = true
    RETURNING original_voto_id
  ),
  del_track AS (
    DELETE FROM public.votos_tracking WHERE voto_id IN (SELECT original_voto_id FROM ins) RETURNING 1
  ),
  del AS (
    DELETE FROM public.votos WHERE id IN (SELECT original_voto_id FROM ins) RETURNING 1
  )
  SELECT count(*) INTO moved FROM del;

  RETURN json_build_object('moved', COALESCE(moved,0));
END;
$function$;
