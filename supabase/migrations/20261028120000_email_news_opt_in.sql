-- Novidades por e-mail (LGPD): caixinha OPCIONAL e DESMARCADA na porta de entrada.
-- O campo começa desligado para todo mundo; só vira "true" quando o torcedor marca a caixinha.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_news_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_news_opt_in_at timestamptz;

-- Grava a escolha do próprio torcedor (mesmo molde de accept_terms).
CREATE OR REPLACE FUNCTION public.set_email_news_opt_in(p_opt_in boolean)
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
     SET email_news_opt_in = COALESCE(p_opt_in, false),
         email_news_opt_in_at = now()
   WHERE id = v_uid;
END;
$$;

REVOKE ALL ON FUNCTION public.set_email_news_opt_in(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_email_news_opt_in(boolean) TO authenticated;
