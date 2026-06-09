CREATE OR REPLACE FUNCTION public.get_ranking_with_growth(p_level text, p_value text DEFAULT NULL::text, p_limit integer DEFAULT 50)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result json;
BEGIN
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO result FROM (
    WITH filtered AS (
      SELECT
        v.clube_nome,
        v.created_at,
        btrim(
          regexp_replace(
            regexp_replace(
              unaccent(lower(btrim(v.clube_nome))),
              '(^|\s)(futebol clube|clube de futebol|esporte clube|esporte e clube|sport club|football club|atletico clube|clube atletico|associacao atletica|clube|atletico|fc|ec|sc|cf|ac)(\s|$)',
              ' ', 'gi'
            ),
            '\s+', ' ', 'g'
          )
        ) AS canonical_key
      FROM public.votos v
      WHERE v.is_original_vote = true
        AND (
          p_level = 'global'
          OR (p_level = 'country' AND COALESCE(NULLIF(v.voto_pais,''), NULLIF(v.pais,'')) = p_value)
          OR (p_level = 'state' AND v.estado = p_value)
          OR (p_level = 'city' AND COALESCE(NULLIF(v.voto_cidade,''), NULLIF(v.cidade,'')) = p_value)
          OR (p_level = 'neighborhood' AND v.bairro = p_value)
        )
    ),
    grouped AS (
      SELECT
        canonical_key,
        count(*) AS votes,
        count(*) FILTER (WHERE created_at > now() - interval '24 hours') AS growth_24h,
        count(*) FILTER (WHERE created_at > now() - interval '7 days') AS growth_7d,
        (
          SELECT clube_nome
          FROM filtered f2
          WHERE f2.canonical_key = filtered.canonical_key
          GROUP BY clube_nome
          ORDER BY count(*) DESC, length(clube_nome) DESC
          LIMIT 1
        ) AS club
      FROM filtered
      WHERE canonical_key <> ''
      GROUP BY canonical_key
    )
    SELECT club, votes, growth_24h, growth_7d
    FROM grouped
    ORDER BY votes DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 200)
  ) t;
  RETURN result;
END;
$function$;