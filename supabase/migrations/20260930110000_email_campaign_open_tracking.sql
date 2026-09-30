-- Rastreamento de leitura de e-mails de campanha: 1 linha por envio,
-- marcada como aberta quando o pixel invisivel carrega no cliente de e-mail.
CREATE TABLE public.email_campaign_sends (
  id text PRIMARY KEY,
  email text NOT NULL,
  nome text,
  subject text NOT NULL,
  sent_by uuid,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  opened_at timestamp with time zone,
  open_count integer NOT NULL DEFAULT 0
);

CREATE INDEX idx_email_campaign_sends_sent_at ON public.email_campaign_sends(sent_at DESC);

ALTER TABLE public.email_campaign_sends ENABLE ROW LEVEL SECURITY;

-- Sem policy de INSERT/SELECT pra client (anon/authenticated): so as
-- edge functions (service role) escrevem/leem essa tabela diretamente,
-- exceto a RPC abaixo que expoe leitura so pra admin/master.
CREATE POLICY "Deny all client access to email_campaign_sends"
  ON public.email_campaign_sends FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.admin_get_email_campaign_history(p_limit integer DEFAULT 200)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ) AND (SELECT email FROM auth.users WHERE id = auth.uid()) <> 'betoborelli9@gmail.com' THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO result FROM (
    SELECT id, email, nome, subject, sent_at, opened_at, open_count
    FROM public.email_campaign_sends
    ORDER BY sent_at DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 1000)
  ) t;

  RETURN result;
END;
$$;
