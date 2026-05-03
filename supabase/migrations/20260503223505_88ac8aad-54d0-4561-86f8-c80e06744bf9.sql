
ALTER TABLE public.votos ADD COLUMN IF NOT EXISTS device_model text;
CREATE INDEX IF NOT EXISTS idx_votos_device_model ON public.votos(device_model) WHERE device_model IS NOT NULL;

CREATE OR REPLACE FUNCTION public.admin_get_socioeconomic_profile(
  p_club text DEFAULT NULL,
  p_state text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  WITH base AS (
    SELECT v.*, p.profissao, p.classe_social, p.faixa_etaria, p.genero
    FROM public.votos v
    LEFT JOIN public.profiles p ON p.id = v.user_id
    WHERE v.is_original_vote = true
      AND (p_club IS NULL OR v.clube_nome = p_club)
      AND (p_state IS NULL OR v.estado = p_state)
  )
  SELECT json_build_object(
    'total_votes', (SELECT count(*) FROM base),
    'audited_real', (SELECT count(*) FROM base WHERE is_fraud_attempt = false),
    'suspicious', (SELECT count(*) FROM base WHERE is_fraud_attempt = true OR is_suspicious = true),
    'by_profession', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT COALESCE(NULLIF(profissao,''), 'Não informado') AS label, count(*) AS value
        FROM base GROUP BY 1 ORDER BY value DESC LIMIT 25
      ) t
    ),
    'by_class', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT COALESCE(NULLIF(classe_social,''), 'N/A') AS label, count(*) AS value
        FROM base GROUP BY 1 ORDER BY label
      ) t
    ),
    'by_device', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT COALESCE(NULLIF(device_model,''), 'Desconhecido') AS label, count(*) AS value
        FROM base GROUP BY 1 ORDER BY value DESC LIMIT 20
      ) t
    ),
    'device_brand', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT
          CASE
            WHEN device_model ILIKE 'iPhone%' OR device_model ILIKE '%iPad%' OR device_model ILIKE '%iOS%' THEN 'iOS'
            WHEN device_model ILIKE '%Android%' OR device_model ILIKE 'Galaxy%' OR device_model ILIKE 'Samsung%'
              OR device_model ILIKE 'Xiaomi%' OR device_model ILIKE 'Motorola%' OR device_model ILIKE 'Pixel%' THEN 'Android'
            ELSE 'Outro'
          END AS label,
          count(*) AS value
        FROM base WHERE device_model IS NOT NULL
        GROUP BY 1 ORDER BY value DESC
      ) t
    ),
    'top_clubs_by_class', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT clube_nome AS club,
          COALESCE(NULLIF(classe_social,''), 'N/A') AS class,
          count(*) AS value
        FROM base GROUP BY 1,2 ORDER BY value DESC LIMIT 60
      ) t
    )
  ) INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_flag_suspicious_devices()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  flagged integer := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  WITH dup AS (
    SELECT v.device_model
    FROM public.votos v
    JOIN auth.users u ON u.id = v.user_id
    WHERE v.device_model IS NOT NULL AND length(trim(v.device_model)) > 0
    GROUP BY v.device_model
    HAVING count(DISTINCT u.email) > 1
  ),
  upd AS (
    UPDATE public.votos
       SET is_suspicious = true
     WHERE device_model IN (SELECT device_model FROM dup)
       AND COALESCE(is_suspicious, false) = false
    RETURNING 1
  )
  SELECT count(*) INTO flagged FROM upd;
  RETURN COALESCE(flagged, 0);
END;
$$;
