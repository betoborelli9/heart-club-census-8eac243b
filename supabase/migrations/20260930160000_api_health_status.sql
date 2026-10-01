-- Monitoramento de saude das APIs externas de que o Heart Club depende
-- (API-Football primeiro; arquitetura aberta pra adicionar outras depois).
-- 1 linha por servico, atualizada por um cron diario. So admin/master le.
CREATE TABLE public.api_health_status (
  service text PRIMARY KEY,
  healthy boolean NOT NULL DEFAULT true,
  details jsonb,
  checked_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.api_health_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all client access to api_health_status"
  ON public.api_health_status FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.admin_get_api_health()
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
    SELECT service, healthy, details, checked_at FROM public.api_health_status ORDER BY service
  ) t;

  RETURN result;
END;
$$;
