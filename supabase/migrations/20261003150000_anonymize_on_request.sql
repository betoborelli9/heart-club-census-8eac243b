-- REGRA DO BETO: voto efetuado e definitivo ("votou, esta votado pra sempre").
-- SO se o torcedor SOLICITAR, os dados pessoais dele sao ocultados -- o voto
-- continua contando no censo, sem nome e sem ligacao com a pessoa.
-- Quem decide e executa e o administrador.

-- 1) O pedido do torcedor agora descreve "ocultar dados" (nao "excluir").
CREATE OR REPLACE FUNCTION public.request_account_deletion()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  UPDATE public.profiles
     SET deletion_requested_at = COALESCE(deletion_requested_at, now()),
         deletion_status = COALESCE(NULLIF(deletion_status, 'anonymized'), 'pending')
   WHERE id = v_uid;

  RETURN json_build_object(
    'ok', true,
    'requested_at', now(),
    'message', 'Solicitação registrada. Seus dados pessoais serão ocultados em até 15 dias e o seu voto continuará contando, sem o seu nome.'
  );
END;
$$;

-- 2) Lista dos pedidos aguardando o administrador (so admin).
CREATE OR REPLACE FUNCTION public.admin_get_deletion_requests()
RETURNS TABLE(
  user_id uuid,
  nome text,
  email text,
  clube_nome text,
  pediu_em timestamptz,
  situacao text
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
    p.deletion_requested_at::timestamptz,
    COALESCE(p.deletion_status, 'pending')::text
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  LEFT JOIN public.votos v ON v.user_id = p.id AND v.is_original_vote = true
  WHERE p.deletion_requested_at IS NOT NULL
  ORDER BY (COALESCE(p.deletion_status, 'pending') = 'anonymized'), p.deletion_requested_at DESC;
END;
$$;

-- 3) Oculta os dados pessoais e MANTEM o voto (so admin).
--    Fica: clube, simpatias, cidade/estado/pais, genero, faixa etaria,
--    profissao e classe (estatistica, sem identificar).
--    Some: nome, nascimento, telefone, localizacao exata, bairro, CEP, IP,
--    identificacao do aparelho e e-mail guardado no voto.
--    O login (conta) permanece, para que a mesma pessoa nao consiga votar de novo.
CREATE OR REPLACE FUNCTION public.admin_anonymize_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_or_master(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  UPDATE public.profiles
     SET nome_exibicao = 'Torcedor anônimo',
         username = NULL,
         data_nascimento = NULL,
         telefone = NULL,
         cep = NULL,
         bairro = NULL,
         latitude = NULL,
         longitude = NULL,
         device_hardware = NULL,
         metadata = '{}'::jsonb,
         deletion_status = 'anonymized'
   WHERE id = p_user_id;

  UPDATE public.votos
     SET email = NULL,
         ip_address = NULL,
         fingerprint = NULL,
         voto_ip = NULL,
         isp = NULL,
         cep = NULL,
         numero = NULL,
         complemento = NULL,
         bairro = NULL,
         voto_bairro_gps = NULL,
         voto_cidade_gps = NULL,
         latitude = NULL,
         longitude = NULL,
         voto_lat = NULL,
         voto_lng = NULL,
         device_model = NULL
   WHERE user_id = p_user_id;

  UPDATE public.votos_tracking
     SET fingerprint = NULL,
         ip_address = NULL
   WHERE voto_id IN (SELECT id FROM public.votos WHERE user_id = p_user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_account_deletion() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_deletion_requests() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_anonymize_user(uuid) TO authenticated;
