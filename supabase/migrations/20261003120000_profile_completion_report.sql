-- Relatorio de preenchimento dos formularios -- SO ADMIN/MASTER (nome e e-mail
-- de torcedor: nunca entra em relatorio de parceiro). Base da campanha de
-- e-mail pedindo pra completar o cadastro.
--
-- Formularios considerados (cada "falta_*" = true significa que falta):
--   basico      nascimento + genero
--   termos      aceite dos Termos/Privacidade (terms_accepted_at)
--   territorio  confirmacao de onde mora (address_confirmed) -- libera o Mapa de Calor
--   renda       faixa de renda (classe_social)                -- perfil socioeconomico
--   profissao   area profissional                              -- perfil socioeconomico
--   embaixador  WhatsApp/telefone (so informativo, nao entra em "incompleto")

-- 1) Corrige a funcao antiga: o e-mail do auth.users e varchar(255) e a
--    funcao declarava text, o que dava erro ("structure of query does not match").
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
    p.id::uuid,
    COALESCE(p.nome_exibicao, 'Torcedor')::text,
    u.email::text,
    v.clube_nome::text,
    (p.data_nascimento IS NULL),
    (p.genero IS NULL),
    (p.profissao IS NULL),
    v.created_at::timestamptz
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  JOIN public.votos v ON v.user_id = p.id AND v.is_original_vote = true
  WHERE p.data_nascimento IS NULL OR p.genero IS NULL OR p.profissao IS NULL
  ORDER BY v.created_at DESC;
END;
$$;

-- 2) Relatorio completo: TODOS os torcedores que votaram, com o que falta de cada formulario.
CREATE OR REPLACE FUNCTION public.admin_get_profile_completion()
RETURNS TABLE(
  user_id uuid,
  nome text,
  email text,
  clube_nome text,
  votou_em timestamptz,
  falta_basico boolean,
  falta_termos boolean,
  falta_territorio boolean,
  falta_renda boolean,
  falta_profissao boolean,
  falta_embaixador boolean
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
    p.id::uuid,
    COALESCE(NULLIF(trim(p.nome_exibicao), ''), 'Torcedor')::text,
    u.email::text,
    v.clube_nome::text,
    v.created_at::timestamptz,
    (p.data_nascimento IS NULL OR p.genero IS NULL),
    (p.terms_accepted_at IS NULL),
    (p.address_confirmed IS NOT TRUE),
    (p.classe_social IS NULL),
    (p.profissao IS NULL OR trim(p.profissao) = ''),
    (p.telefone IS NULL OR trim(p.telefone) = '')
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  JOIN public.votos v ON v.user_id = p.id AND v.is_original_vote = true
  ORDER BY v.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_incomplete_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_profile_completion() TO authenticated;

-- 3) Filtro "so quem nao completou" do robo de e-mail passa a usar a mesma
--    definicao do relatorio (basico, termos, territorio, renda ou profissao).
--    Resto da funcao identico ao que ja estava no ar.
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
        OR p.data_nascimento IS NULL OR p.genero IS NULL
        OR p.terms_accepted_at IS NULL
        OR p.address_confirmed IS NOT TRUE
        OR p.classe_social IS NULL
        OR p.profissao IS NULL OR trim(p.profissao) = ''
      )
    ORDER BY p.nome_exibicao
  ) t;

  RETURN result;
END;
$$;
