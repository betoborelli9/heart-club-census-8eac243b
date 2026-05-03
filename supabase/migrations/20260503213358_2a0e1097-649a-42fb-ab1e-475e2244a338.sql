-- Add country_code (ISO) column for fast global filtering
ALTER TABLE public.votos ADD COLUMN IF NOT EXISTS country_code text;

-- Performance indexes for global BI queries
CREATE INDEX IF NOT EXISTS idx_votos_country_code ON public.votos(country_code) WHERE is_original_vote = true;
CREATE INDEX IF NOT EXISTS idx_votos_continent ON public.votos(voto_continente) WHERE is_original_vote = true;
CREATE INDEX IF NOT EXISTS idx_votos_geo_hierarchy ON public.votos(voto_continente, country_code, estado, cidade) WHERE is_original_vote = true;
CREATE INDEX IF NOT EXISTS idx_votos_clube_original ON public.votos(clube_nome) WHERE is_original_vote = true;

-- RPC: hierarchical geo options for cascading filter
CREATE OR REPLACE FUNCTION public.admin_get_geo_options(
  p_continent text DEFAULT NULL,
  p_country text DEFAULT NULL,
  p_state text DEFAULT NULL,
  p_city text DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  SELECT json_build_object(
    'continents', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT COALESCE(NULLIF(voto_continente,''), 'N/A') AS name, count(*) AS votes
        FROM public.votos WHERE is_original_vote = true
        GROUP BY 1 ORDER BY votes DESC
      ) t
    ),
    'countries', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT COALESCE(NULLIF(voto_pais,''), NULLIF(pais,''), 'N/A') AS name, count(*) AS votes
        FROM public.votos
        WHERE is_original_vote = true
          AND (p_continent IS NULL OR voto_continente = p_continent)
        GROUP BY 1 ORDER BY votes DESC LIMIT 250
      ) t
    ),
    'states', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT COALESCE(NULLIF(estado,''), 'N/A') AS name, count(*) AS votes
        FROM public.votos
        WHERE is_original_vote = true
          AND (p_continent IS NULL OR voto_continente = p_continent)
          AND (p_country IS NULL OR COALESCE(NULLIF(voto_pais,''), NULLIF(pais,'')) = p_country)
        GROUP BY 1 ORDER BY votes DESC LIMIT 200
      ) t
    ),
    'cities', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT COALESCE(NULLIF(voto_cidade,''), NULLIF(cidade,''), 'N/A') AS name, count(*) AS votes
        FROM public.votos
        WHERE is_original_vote = true
          AND (p_continent IS NULL OR voto_continente = p_continent)
          AND (p_country IS NULL OR COALESCE(NULLIF(voto_pais,''), NULLIF(pais,'')) = p_country)
          AND (p_state IS NULL OR estado = p_state)
        GROUP BY 1 ORDER BY votes DESC LIMIT 300
      ) t
    ),
    'neighborhoods', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT COALESCE(NULLIF(bairro,''), 'N/A') AS name, count(*) AS votes
        FROM public.votos
        WHERE is_original_vote = true AND bairro IS NOT NULL AND length(trim(bairro))>0
          AND (p_continent IS NULL OR voto_continente = p_continent)
          AND (p_country IS NULL OR COALESCE(NULLIF(voto_pais,''), NULLIF(pais,'')) = p_country)
          AND (p_state IS NULL OR estado = p_state)
          AND (p_city IS NULL OR COALESCE(NULLIF(voto_cidade,''), NULLIF(cidade,'')) = p_city)
        GROUP BY 1 ORDER BY votes DESC LIMIT 500
      ) t
    )
  ) INTO result;
  RETURN result;
END;
$$;

-- RPC: global BI aggregates filtered hierarchically (server-side, no row downloads)
CREATE OR REPLACE FUNCTION public.admin_get_global_bi_stats(
  p_continent text DEFAULT NULL,
  p_country text DEFAULT NULL,
  p_state text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_neighborhood text DEFAULT NULL
) RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  WITH filtered AS (
    SELECT v.*
    FROM public.votos v
    WHERE v.is_original_vote = true
      AND (p_continent IS NULL OR v.voto_continente = p_continent)
      AND (p_country IS NULL OR COALESCE(NULLIF(v.voto_pais,''), NULLIF(v.pais,'')) = p_country)
      AND (p_state IS NULL OR v.estado = p_state)
      AND (p_city IS NULL OR COALESCE(NULLIF(v.voto_cidade,''), NULLIF(v.cidade,'')) = p_city)
      AND (p_neighborhood IS NULL OR v.bairro = p_neighborhood)
  )
  SELECT json_build_object(
    'total_votes', (SELECT count(*) FROM filtered),
    'total_users', (SELECT count(DISTINCT user_id) FROM filtered),
    'fraud_attempts', (SELECT count(*) FROM public.votos WHERE is_fraud_attempt = true),
    'by_age', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT COALESCE(p.faixa_etaria, 'N/A') AS label, count(*) AS value
        FROM filtered f JOIN public.profiles p ON p.id = f.user_id
        WHERE p.faixa_etaria IS NOT NULL
        GROUP BY 1 ORDER BY value DESC
      ) t
    ),
    'by_gender', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT COALESCE(p.genero, 'N/A') AS label, count(*) AS value
        FROM filtered f JOIN public.profiles p ON p.id = f.user_id
        WHERE p.genero IS NOT NULL
        GROUP BY 1 ORDER BY value DESC
      ) t
    ),
    'by_continent', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT COALESCE(NULLIF(voto_continente,''), 'N/A') AS label, count(*) AS value
        FROM filtered GROUP BY 1 ORDER BY value DESC LIMIT 10
      ) t
    ),
    'by_country', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT COALESCE(NULLIF(voto_pais,''), NULLIF(pais,''), 'N/A') AS label, count(*) AS value
        FROM filtered GROUP BY 1 ORDER BY value DESC LIMIT 30
      ) t
    ),
    'by_state', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT COALESCE(NULLIF(estado,''), 'N/A') AS label, count(*) AS value
        FROM filtered GROUP BY 1 ORDER BY value DESC LIMIT 30
      ) t
    ),
    'by_city', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT COALESCE(NULLIF(voto_cidade,''), NULLIF(cidade,''), 'N/A') AS label, count(*) AS value
        FROM filtered GROUP BY 1 ORDER BY value DESC LIMIT 30
      ) t
    ),
    'by_club', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT clube_nome AS label, count(*) AS value
        FROM filtered GROUP BY 1 ORDER BY value DESC LIMIT 30
      ) t
    )
  ) INTO result;
  RETURN result;
END;
$$;