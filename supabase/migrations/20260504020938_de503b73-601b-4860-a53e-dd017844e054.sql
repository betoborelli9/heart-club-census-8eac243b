CREATE OR REPLACE FUNCTION public.admin_approve_vote(p_voto_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  UPDATE public.votos
     SET is_fraud_attempt = false,
         is_suspicious = false,
         is_original_vote = true,
         potential_duplicate_user = false,
         status_integridade = 'aprovado'
   WHERE id = p_voto_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_vote(p_voto_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  DELETE FROM public.votos_tracking WHERE voto_id = p_voto_id;
  DELETE FROM public.votos WHERE id = p_voto_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_approve_vote(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_vote(uuid) TO authenticated;