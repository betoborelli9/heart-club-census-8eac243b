-- "BR" e "Brasil" eram o mesmo pais salvo de dois jeitos -- causava
-- "Goias, BR" e "Goias, Brasil" aparecendo como linhas SEPARADAS no
-- ranking de Estados (mesmo bug de fundo do caso Vila Nova, agora no
-- campo pais). "BR" e a forma majoritaria e ja usada como convencao
-- interna em outras telas (MapaCalor.tsx normaliza pra "BR"), entao
-- mantemos "BR" como valor interno e so traduzimos pra nome completo
-- na hora de EXIBIR -- sem mexer na logica de votacao.

UPDATE public.votos SET pais = 'BR' WHERE pais = 'Brasil';
UPDATE public.votos SET voto_pais = 'BR' WHERE voto_pais = 'Brasil';

CREATE OR REPLACE FUNCTION public.friendly_country_name(p_pais text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE upper(coalesce(p_pais, ''))
    WHEN 'BR' THEN 'Brasil'
    WHEN 'US' THEN 'EUA'
    WHEN 'UK' THEN 'Reino Unido'
    WHEN 'GB' THEN 'Reino Unido'
    ELSE coalesce(nullif(p_pais, ''), 'N/A')
  END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_global_bi_stats(p_continent text DEFAULT NULL::text, p_country text DEFAULT NULL::text, p_state text DEFAULT NULL::text, p_city text DEFAULT NULL::text, p_neighborhood text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result json;
BEGIN
  IF NOT public.is_admin_or_master(auth.uid()) THEN
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
        SELECT public.friendly_country_name(COALESCE(NULLIF(voto_pais,''), NULLIF(pais,''))) AS label, count(*) AS value
        FROM filtered GROUP BY 1 ORDER BY value DESC LIMIT 30
      ) t
    ),
    'by_state', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT estado || ', ' || public.friendly_country_name(COALESCE(NULLIF(voto_pais,''), NULLIF(pais,''))) AS label,
               count(*) AS value
        FROM filtered WHERE estado IS NOT NULL AND length(trim(estado)) > 0
        GROUP BY 1 ORDER BY value DESC LIMIT 30
      ) t
    ),
    'by_city', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT
          COALESCE(NULLIF(voto_cidade,''), NULLIF(cidade,''), 'N/A')
            || CASE WHEN estado IS NOT NULL AND length(trim(estado)) > 0 THEN ', ' || estado ELSE '' END
            AS label,
          count(*) AS value
        FROM filtered WHERE COALESCE(NULLIF(voto_cidade,''), NULLIF(cidade,'')) IS NOT NULL
        GROUP BY 1 ORDER BY value DESC LIMIT 30
      ) t
    ),
    'by_club', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT clube_nome AS label, count(*) AS value
        FROM filtered GROUP BY 1 ORDER BY value DESC LIMIT 30
      ) t
    ),
    'daily_trend', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT to_char(date_trunc('day', created_at), 'DD/MM') AS label,
               count(*) AS value
        FROM filtered
        WHERE created_at > now() - interval '30 days'
        GROUP BY date_trunc('day', created_at)
        ORDER BY date_trunc('day', created_at)
      ) t
    )
  ) INTO result;
  RETURN result;
END;
$function$;
