-- Alerta de commits da Lovable (04/10/2026).
-- O GitHub avisa a funcao github-commit-webhook; ela grava aqui SO os commits feitos pela Lovable.
-- Quem le: apenas admin/master (RLS + RPCs). Torcedor nunca ve.

CREATE TABLE IF NOT EXISTS public.lovable_commit_alerts (
  sha             text PRIMARY KEY,
  branch          text,
  author          text,
  message         text,
  committed_at    timestamptz,
  files           jsonb       NOT NULL DEFAULT '[]'::jsonb,
  critical_files  jsonb       NOT NULL DEFAULT '[]'::jsonb,
  is_critical     boolean     NOT NULL DEFAULT false,
  url             text,
  received_at     timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid
);

ALTER TABLE public.lovable_commit_alerts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lovable_commit_alerts FROM anon, authenticated;

-- Lista os alertas ainda nao vistos (so admin/master)
CREATE OR REPLACE FUNCTION public.admin_get_lovable_alerts()
RETURNS SETOF public.lovable_commit_alerts
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_or_master(auth.uid()) THEN
    RAISE EXCEPTION 'acesso restrito' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT * FROM public.lovable_commit_alerts
    WHERE acknowledged_at IS NULL
    ORDER BY committed_at DESC NULLS LAST
    LIMIT 50;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_get_lovable_alerts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_lovable_alerts() TO authenticated;

-- Botao "Ja vi" (so admin/master)
CREATE OR REPLACE FUNCTION public.admin_ack_lovable_alert(p_sha text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE n integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_or_master(auth.uid()) THEN
    RAISE EXCEPTION 'acesso restrito' USING ERRCODE = '42501';
  END IF;
  UPDATE public.lovable_commit_alerts
     SET acknowledged_at = now(), acknowledged_by = auth.uid()
   WHERE acknowledged_at IS NULL AND (p_sha IS NULL OR sha = p_sha);
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_ack_lovable_alert(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_ack_lovable_alert(text) TO authenticated;

NOTIFY pgrst, 'reload schema';
