
-- Add fraud detection columns to votos
ALTER TABLE public.votos 
  ADD COLUMN IF NOT EXISTS is_fraud_attempt boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_original_vote boolean NOT NULL DEFAULT true;

-- Security definer function: admin reads all votes WITH tracking data (bypasses PII vault)
CREATE OR REPLACE FUNCTION public.admin_get_votes_with_tracking()
RETURNS TABLE(
  voto_id uuid,
  user_id uuid,
  clube_nome text,
  pais text,
  estado text,
  cidade text,
  created_at timestamptz,
  is_fraud_attempt boolean,
  is_original_vote boolean,
  fingerprint text,
  ip_address text,
  is_suspicious boolean,
  user_email text,
  user_nome text,
  user_nascimento date,
  user_genero text,
  user_profissao text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    v.id as voto_id,
    v.user_id,
    v.clube_nome,
    v.pais,
    v.estado,
    v.cidade,
    v.created_at,
    v.is_fraud_attempt,
    v.is_original_vote,
    vt.fingerprint,
    vt.ip_address,
    vt.is_suspicious,
    u.email::text as user_email,
    p.nome_exibicao as user_nome,
    p.data_nascimento as user_nascimento,
    p.genero as user_genero,
    p.profissao as user_profissao
  FROM public.votos v
  LEFT JOIN public.votos_tracking vt ON vt.voto_id = v.id
  LEFT JOIN auth.users u ON u.id = v.user_id
  LEFT JOIN public.profiles p ON p.id = v.user_id
  ORDER BY v.created_at DESC;
END;
$$;

-- Security definer function: clean fraud duplicates
CREATE OR REPLACE FUNCTION public.admin_clean_fraud_by_fingerprint()
RETURNS TABLE(deleted_count integer, marked_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _deleted integer := 0;
  _marked integer := 0;
  _fp record;
BEGIN
  -- Check caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  -- Find fingerprints with multiple votes
  FOR _fp IN 
    SELECT vt.fingerprint as fp, array_agg(vt.voto_id ORDER BY v.created_at ASC) as vote_ids
    FROM public.votos_tracking vt
    JOIN public.votos v ON v.id = vt.voto_id
    WHERE vt.fingerprint IS NOT NULL AND vt.fingerprint != ''
    GROUP BY vt.fingerprint
    HAVING count(*) > 1
  LOOP
    -- Mark the first vote as original, flag the user as fraud attempt
    UPDATE public.votos 
    SET is_original_vote = true, is_fraud_attempt = true
    WHERE id = _fp.vote_ids[1];
    _marked := _marked + 1;

    -- Delete all subsequent duplicate votes
    DELETE FROM public.votos_tracking WHERE voto_id = ANY(_fp.vote_ids[2:]);
    DELETE FROM public.votos WHERE id = ANY(_fp.vote_ids[2:]);
    _deleted := _deleted + array_length(_fp.vote_ids, 1) - 1;
  END LOOP;

  RETURN QUERY SELECT _deleted, _marked;
END;
$$;

-- Security definer function: get BI stats
CREATE OR REPLACE FUNCTION public.admin_get_bi_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
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
$$;
