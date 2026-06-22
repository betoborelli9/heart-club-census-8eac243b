
CREATE OR REPLACE FUNCTION public.get_club_heatmap_data(p_club_name text)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'countries', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT COALESCE(NULLIF(voto_pais,''), NULLIF(pais,''), 'Desconhecido') AS name,
               count(*) AS votes
        FROM public.votos
        WHERE clube_nome = p_club_name
          AND (status_aprovacao = 'aprovado' OR status_aprovacao IS NULL)
          AND COALESCE(status_integridade,'') <> 'ficticio'
        GROUP BY 1
        ORDER BY votes DESC
      ) t
    ),
    'states', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT COALESCE(NULLIF(estado,''), 'Desconhecido') AS name,
               count(*) AS votes
        FROM public.votos
        WHERE clube_nome = p_club_name
          AND (status_aprovacao = 'aprovado' OR status_aprovacao IS NULL)
          AND COALESCE(status_integridade,'') <> 'ficticio'
          AND estado IS NOT NULL AND length(trim(estado)) > 0
        GROUP BY 1
        ORDER BY votes DESC
      ) t
    ),
    'cities', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT COALESCE(NULLIF(estado,''), 'Desconhecido') AS state,
               COALESCE(NULLIF(voto_cidade,''), NULLIF(cidade,''), 'Desconhecido') AS name,
               count(*) AS votes
        FROM public.votos
        WHERE clube_nome = p_club_name
          AND (status_aprovacao = 'aprovado' OR status_aprovacao IS NULL)
          AND COALESCE(status_integridade,'') <> 'ficticio'
          AND COALESCE(NULLIF(voto_cidade,''), NULLIF(cidade,'')) IS NOT NULL
        GROUP BY 1, 2
        ORDER BY votes DESC
      ) t
    )
  ) INTO result;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_club_heatmap_data(text) TO anon, authenticated, service_role;
