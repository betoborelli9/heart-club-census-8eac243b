-- Marca um envio de campanha como aberto (chamada pela edge function
-- track-email-open via service role). SECURITY DEFINER pra rodar mesmo
-- sem policy de UPDATE liberada pra client -- so quem invoca essa funcao
-- especifica, com id valido, consegue alterar a linha.
CREATE OR REPLACE FUNCTION public.track_email_open(p_id text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.email_campaign_sends
  SET opened_at = COALESCE(opened_at, now()), open_count = open_count + 1
  WHERE id = p_id;
$$;
