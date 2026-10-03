-- REGISTRO DE CONVITES: guarda QUEM usou o botao de compartilhar o link de
-- embaixador, quando e por qual canal. NAO guarda para quem foi enviado
-- (isso fica so no celular do embaixador). So o administrador consulta.
CREATE TABLE IF NOT EXISTS public.share_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  channel text NOT NULL,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS share_events_user_idx ON public.share_events (user_id, created_at DESC);

ALTER TABLE public.share_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny all client access to share_events" ON public.share_events;
CREATE POLICY "Deny all client access to share_events"
  ON public.share_events FOR ALL
  TO anon, authenticated
  USING (false) WITH CHECK (false);

-- O site chama isto quando o torcedor aperta um botao de compartilhar.
CREATE OR REPLACE FUNCTION public.log_share_event(p_channel text, p_source text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  -- Freio simples contra enchente de registros (30 por minuto por pessoa).
  IF (SELECT count(*) FROM public.share_events
       WHERE user_id = v_uid AND created_at > now() - interval '1 minute') >= 30 THEN
    RETURN;
  END IF;

  INSERT INTO public.share_events (user_id, channel, source)
  VALUES (v_uid, left(COALESCE(p_channel, 'outro'), 20), left(p_source, 40));
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_share_event(text, text) TO authenticated;

-- Resumo para o Admin: quem compartilhou, quantas vezes, por onde, e quantas
-- pessoas realmente entraram pelo link dele.
CREATE OR REPLACE FUNCTION public.admin_get_share_summary()
RETURNS TABLE(
  user_id uuid,
  nome text,
  email text,
  clube_nome text,
  total bigint,
  whatsapp bigint,
  telegram bigint,
  nativo bigint,
  copiado bigint,
  instagram bigint,
  ultimo_envio timestamptz,
  cadastros bigint
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
  WITH s AS (
    SELECT e.user_id,
           count(*) AS total,
           count(*) FILTER (WHERE e.channel = 'whatsapp') AS whatsapp,
           count(*) FILTER (WHERE e.channel = 'telegram') AS telegram,
           count(*) FILTER (WHERE e.channel = 'native') AS nativo,
           count(*) FILTER (WHERE e.channel = 'copy') AS copiado,
           count(*) FILTER (WHERE e.channel = 'instagram') AS instagram,
           max(e.created_at) AS ultimo
      FROM public.share_events e
     GROUP BY e.user_id
  ),
  r AS (
    SELECT i.embaixador_id AS user_id, count(*) AS cadastros
      FROM public.indicacoes i
     WHERE i.indicado_id IS NOT NULL
     GROUP BY i.embaixador_id
  )
  SELECT
    COALESCE(s.user_id, r.user_id)::uuid,
    COALESCE(NULLIF(trim(p.nome_exibicao), ''), 'Torcedor')::text,
    u.email::text,
    v.clube_nome::text,
    COALESCE(s.total, 0)::bigint,
    COALESCE(s.whatsapp, 0)::bigint,
    COALESCE(s.telegram, 0)::bigint,
    COALESCE(s.nativo, 0)::bigint,
    COALESCE(s.copiado, 0)::bigint,
    COALESCE(s.instagram, 0)::bigint,
    s.ultimo::timestamptz,
    COALESCE(r.cadastros, 0)::bigint
  FROM s
  FULL JOIN r ON r.user_id = s.user_id
  LEFT JOIN public.profiles p ON p.id = COALESCE(s.user_id, r.user_id)
  LEFT JOIN auth.users u ON u.id = COALESCE(s.user_id, r.user_id)
  LEFT JOIN public.votos v ON v.user_id = COALESCE(s.user_id, r.user_id) AND v.is_original_vote = true
  ORDER BY COALESCE(s.total, 0) DESC, COALESCE(r.cadastros, 0) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_share_summary() TO authenticated;
