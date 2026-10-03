-- Lista clara de quem ainda não completou o cadastro (nascimento, gênero
-- ou profissão em branco) — base pra campanha de e-mail pedindo pra
-- completar. Nunca bloqueia o voto, só ajuda a convidar depois.
CREATE OR REPLACE FUNCTION public.admin_get_incomplete_profiles()
RETURNS TABLE(
  user_id uuid,
  nome text,
  email text,
  clube_nome text,
  falta_nascimento boolean,
  falta_genero boolean,
  falta_profissao boolean,
  votou_em timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_or_master(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    COALESCE(p.nome_exibicao, 'Torcedor'),
    u.email,
    v.clube_nome,
    (p.data_nascimento IS NULL),
    (p.genero IS NULL),
    (p.profissao IS NULL),
    v.created_at
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  JOIN public.votos v ON v.user_id = p.id AND v.is_original_vote = true
  WHERE p.data_nascimento IS NULL OR p.genero IS NULL OR p.profissao IS NULL
  ORDER BY v.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_incomplete_profiles() TO authenticated;

-- Amplia o segmento de e-mail pra incluir "perfil incompleto" como filtro.
CREATE OR REPLACE FUNCTION public.admin_get_email_segment(
  p_device text DEFAULT NULL,
  p_club text DEFAULT NULL,
  p_incomplete_only boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  IF NOT public.is_admin_or_master(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO result FROM (
    SELECT
      p.id AS user_id,
      COALESCE(p.nome_exibicao, 'Torcedor') AS nome,
      u.email,
      p.device_hardware,
      CASE
        WHEN p.device_hardware ILIKE '%android%' THEN 'android'
        WHEN p.device_hardware ILIKE '%iphone%' OR p.device_hardware ILIKE '%ios %' OR p.device_hardware ILIKE 'ios' THEN 'iphone'
        ELSE 'desktop'
      END AS device,
      v.clube_nome
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    LEFT JOIN public.votos v ON v.user_id = p.id AND v.is_original_vote = true
    WHERE u.email IS NOT NULL
      AND (
        p_device IS NULL
        OR (p_device = 'android' AND p.device_hardware ILIKE '%android%')
        OR (p_device = 'iphone' AND (p.device_hardware ILIKE '%iphone%' OR p.device_hardware ILIKE '%ios %' OR p.device_hardware ILIKE 'ios'))
        OR (p_device = 'desktop' AND (p.device_hardware IS NULL OR (p.device_hardware NOT ILIKE '%android%' AND p.device_hardware NOT ILIKE '%iphone%' AND p.device_hardware NOT ILIKE '%ios%')))
      )
      AND (p_club IS NULL OR v.clube_nome = p_club)
      AND (
        p_incomplete_only IS NOT TRUE
        OR p.data_nascimento IS NULL OR p.genero IS NULL OR p.profissao IS NULL
      )
    ORDER BY p.nome_exibicao
  ) t;

  RETURN result;
END;
$$;
