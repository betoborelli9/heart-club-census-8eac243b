CREATE OR REPLACE FUNCTION public.get_heatmap_data(p_club_name text, p_level text DEFAULT 'country'::text, p_filter_value text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result json;
  uf_to_name jsonb := '{"AC":"Acre","AL":"Alagoas","AP":"Amapá","AM":"Amazonas","BA":"Bahia","CE":"Ceará","DF":"Distrito Federal","ES":"Espírito Santo","GO":"Goiás","MA":"Maranhão","MT":"Mato Grosso","MS":"Mato Grosso do Sul","MG":"Minas Gerais","PA":"Pará","PB":"Paraíba","PR":"Paraná","PE":"Pernambuco","PI":"Piauí","RJ":"Rio de Janeiro","RN":"Rio Grande do Norte","RS":"Rio Grande do Sul","RO":"Rondônia","RR":"Roraima","SC":"Santa Catarina","SP":"São Paulo","SE":"Sergipe","TO":"Tocantins"}'::jsonb;
  name_to_uf jsonb := '{"Acre":"AC","Alagoas":"AL","Amapá":"AP","Amazonas":"AM","Bahia":"BA","Ceará":"CE","Distrito Federal":"DF","Espírito Santo":"ES","Goiás":"GO","Maranhão":"MA","Mato Grosso":"MT","Mato Grosso do Sul":"MS","Minas Gerais":"MG","Pará":"PA","Paraíba":"PB","Paraná":"PR","Pernambuco":"PE","Piauí":"PI","Rio de Janeiro":"RJ","Rio Grande do Norte":"RN","Rio Grande do Sul":"RS","Rondônia":"RO","Roraima":"RR","Santa Catarina":"SC","São Paulo":"SP","Sergipe":"SE","Tocantins":"TO"}'::jsonb;
  uf_filter text;
  is_brazil boolean := (p_filter_value IS NOT NULL AND lower(p_filter_value) IN ('br','brasil','brazil'));
BEGIN
  IF p_level = 'continent' THEN
    SELECT json_agg(row_to_json(t)) INTO result FROM (
      SELECT COALESCE(NULLIF(voto_continente, ''), 'Não informado') as region, count(*) as votes
      FROM public.votos WHERE clube_nome = p_club_name AND is_original_vote = true AND status_aprovacao = 'aprovado'
      GROUP BY 1 ORDER BY votes DESC
    ) t;
  ELSIF p_level = 'country' THEN
    SELECT json_agg(row_to_json(t)) INTO result FROM (
      SELECT CASE WHEN lower(COALESCE(NULLIF(voto_pais,''), NULLIF(pais,''),'')) IN ('br','brasil','brazil') THEN 'Brazil'
                  ELSE COALESCE(NULLIF(voto_pais,''), NULLIF(pais,''), 'Não informado') END AS region,
             count(*) AS votes
      FROM public.votos WHERE clube_nome = p_club_name AND is_original_vote = true AND status_aprovacao = 'aprovado'
      GROUP BY 1 ORDER BY votes DESC
    ) t;
  ELSIF p_level = 'state' THEN
    SELECT json_agg(row_to_json(t)) INTO result FROM (
      SELECT COALESCE(uf_to_name->>estado, NULLIF(estado,''), 'Não informado') AS region, count(*) AS votes
      FROM public.votos
      WHERE clube_nome = p_club_name AND is_original_vote = true AND status_aprovacao = 'aprovado'
        AND (
          p_filter_value IS NULL
          OR COALESCE(NULLIF(voto_pais,''), NULLIF(pais,'')) = p_filter_value
          OR (is_brazil AND lower(COALESCE(NULLIF(voto_pais,''), NULLIF(pais,''),'')) IN ('br','brasil','brazil'))
        )
      GROUP BY 1 ORDER BY votes DESC
    ) t;
  ELSIF p_level = 'city' THEN
    uf_filter := name_to_uf->>p_filter_value;
    SELECT json_agg(row_to_json(t)) INTO result FROM (
      SELECT COALESCE(NULLIF(voto_cidade,''), NULLIF(cidade,''), 'Não informado') AS region, count(*) AS votes
      FROM public.votos
      WHERE clube_nome = p_club_name AND is_original_vote = true AND status_aprovacao = 'aprovado'
        AND (
          p_filter_value IS NULL
          OR estado = p_filter_value
          OR (uf_filter IS NOT NULL AND estado = uf_filter)
          OR COALESCE(NULLIF(voto_pais,''), NULLIF(pais,'')) = p_filter_value
          OR (lower(p_filter_value) IN ('br','brasil','brazil')
              AND lower(COALESCE(NULLIF(voto_pais,''), NULLIF(pais,''),'')) IN ('br','brasil','brazil'))
        )
      GROUP BY 1 ORDER BY votes DESC
    ) t;
  ELSIF p_level = 'total' THEN
    SELECT json_build_object('total', count(*)) INTO result
    FROM public.votos WHERE clube_nome = p_club_name AND is_original_vote = true AND status_aprovacao = 'aprovado';
  END IF;
  RETURN COALESCE(result, '[]'::json);
END;
$function$;