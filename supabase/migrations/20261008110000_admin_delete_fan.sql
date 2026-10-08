-- APAGAR TORCEDOR POR COMPLETO (só admin/master). Depois disso, se a pessoa voltar com o mesmo Google/e-mail,
-- entra como NOVATA: sem voto, sem perfil, sem histórico — como se nunca tivesse entrado.
-- Proteções: nunca apaga conta de admin/master nem a do próprio administrador que está clicando.
-- O torcedor comum NÃO tem como chamar esta função (só is_admin_or_master).
CREATE OR REPLACE FUNCTION public.admin_delete_fan(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n_votos int := 0;
  n_acessos int := 0;
  email_alvo text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_or_master(auth.uid()) THEN
    RAISE EXCEPTION 'acesso restrito' USING ERRCODE = '42501';
  END IF;
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'torcedor não informado' USING ERRCODE = '22023';
  END IF;
  IF p_user_id = auth.uid() OR public.is_admin_or_master(p_user_id) THEN
    RAISE EXCEPTION 'conta de administrador não pode ser apagada' USING ERRCODE = '42501';
  END IF;

  SELECT email INTO email_alvo FROM auth.users WHERE id = p_user_id;
  IF email_alvo IS NULL AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'torcedor não encontrado' USING ERRCODE = 'P0002';
  END IF;

  -- votos (e o rastro de IP/aparelho deles) + lixeira de votos
  DELETE FROM public.votos_tracking WHERE voto_id IN (SELECT id FROM public.votos WHERE user_id = p_user_id);
  DELETE FROM public.votos WHERE user_id = p_user_id;
  GET DIAGNOSTICS n_votos = ROW_COUNT;
  DELETE FROM public.votos_lixeira WHERE user_id = p_user_id;

  -- histórico e atividade
  DELETE FROM public.access_log WHERE user_id = p_user_id;
  GET DIAGNOSTICS n_acessos = ROW_COUNT;
  DELETE FROM public.share_events WHERE user_id = p_user_id;
  DELETE FROM public.partner_clicks WHERE user_id = p_user_id;
  DELETE FROM public.club_corrections WHERE user_id = p_user_id;
  DELETE FROM public.user_feedback WHERE user_id = p_user_id;
  DELETE FROM public.indicacoes WHERE embaixador_id = p_user_id OR indicado_id = p_user_id;

  -- referências que não podem sumir com a linha (quem sugeriu/validou cores): fica sem autor
  UPDATE public.club_colors SET suggested_by = NULL WHERE suggested_by = p_user_id;
  UPDATE public.club_colors SET validated_by = NULL WHERE validated_by = p_user_id;

  -- a conta: apaga o login e, em cascata, perfil, avisos, assinaturas push, nível de embaixador e pedido de parceiro
  DELETE FROM auth.users WHERE id = p_user_id;

  RETURN jsonb_build_object('ok', true, 'votos_apagados', n_votos, 'acessos_apagados', n_acessos);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_delete_fan(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_fan(uuid) TO authenticated;

-- Atalho usado na tabela de votos do Admin: acha o torcedor pelo voto e apaga tudo dele.
CREATE OR REPLACE FUNCTION public.admin_delete_fan_by_vote(p_voto_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_or_master(auth.uid()) THEN
    RAISE EXCEPTION 'acesso restrito' USING ERRCODE = '42501';
  END IF;
  SELECT user_id INTO uid FROM public.votos WHERE id = p_voto_id;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'este voto não tem conta ligada' USING ERRCODE = 'P0002';
  END IF;
  RETURN public.admin_delete_fan(uid);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_delete_fan_by_vote(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_fan_by_vote(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
