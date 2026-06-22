ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS privacy_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS terms_version text,
  ADD COLUMN IF NOT EXISTS deletion_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_status text;

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
         deletion_status = 'pending'
   WHERE id = v_uid;

  RETURN json_build_object(
    'ok', true,
    'requested_at', now(),
    'message', 'Solicitação registrada. Seus dados serão excluídos em até 15 dias conforme LGPD.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_account_deletion() TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_terms(p_version text)
RETURNS void
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
     SET terms_accepted_at = now(),
         privacy_accepted_at = now(),
         terms_version = COALESCE(p_version, '1.0')
   WHERE id = v_uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_terms(text) TO authenticated;