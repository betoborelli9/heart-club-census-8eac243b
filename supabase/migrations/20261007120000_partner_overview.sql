-- PÁGINA DO PARCEIRO: panorama com números SOMADOS (nunca dado de uma pessoa).
-- Só parceiro autorizado ou admin/master chama (is_partner). Grupos com menos de 3 pessoas não aparecem (viram "outros").
-- As VISITAS POR PÁGINA ficam de fora de propósito: só o Beto vê (Admin) e envia em PDF.
CREATE OR REPLACE FUNCTION public.partner_get_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  r jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_partner(auth.uid()) THEN
    RAISE EXCEPTION 'acesso restrito' USING ERRCODE = '42501';
  END IF;

  WITH base AS (
    SELECT v.clube_nome, nullif(btrim(v.pais), '') AS pais, nullif(btrim(v.estado), '') AS estado,
           nullif(btrim(v.cidade), '') AS cidade, v.created_at,
           p.genero, p.data_nascimento, nullif(btrim(p.profissao), '') AS profissao
    FROM public.votos v
    LEFT JOIN public.profiles p ON p.id = v.user_id
    WHERE v.is_original_vote = true AND v.status_aprovacao = 'aprovado'
  ),
  tot AS (SELECT count(*)::int AS torcedores,
                 count(DISTINCT lower(clube_nome))::int AS clubes,
                 count(DISTINCT lower(pais))::int AS paises,
                 count(DISTINCT lower(cidade))::int AS cidades,
                 count(*) FILTER (WHERE created_at > now() - interval '24 hours')::int AS h24,
                 count(*) FILTER (WHERE created_at > now() - interval '7 days')::int AS d7,
                 count(*) FILTER (WHERE created_at > now() - interval '30 days')::int AS d30
          FROM base),
  dias AS (
    SELECT g::date AS dia, count(b.*)::int AS n
    FROM generate_series((current_date - 29), current_date, interval '1 day') g
    LEFT JOIN base b ON b.created_at::date = g::date
    GROUP BY g ORDER BY g
  ),
  clubes AS (SELECT max(clube_nome) AS nome, count(*)::int AS n FROM base GROUP BY lower(clube_nome) ORDER BY n DESC, 1 LIMIT 15),
  pa AS (SELECT max(pais) AS nome, count(*)::int AS n FROM base WHERE pais IS NOT NULL GROUP BY lower(pais)),
  es AS (SELECT max(estado) AS nome, count(*)::int AS n FROM base WHERE estado IS NOT NULL GROUP BY lower(estado)),
  ci AS (SELECT max(cidade) AS nome, count(*)::int AS n FROM base WHERE cidade IS NOT NULL GROUP BY lower(cidade)),
  gen AS (SELECT count(*) FILTER (WHERE genero IS NOT NULL)::int AS resp,
                 count(*) FILTER (WHERE lower(genero) = 'masculino')::int AS homens,
                 count(*) FILTER (WHERE lower(genero) = 'feminino')::int AS mulheres,
                 count(*) FILTER (WHERE genero IS NOT NULL AND lower(genero) NOT IN ('masculino', 'feminino'))::int AS outros
          FROM base),
  idade AS (
    SELECT count(*)::int AS resp,
           count(*) FILTER (WHERE a <= 20)::int AS ate20,
           count(*) FILTER (WHERE a BETWEEN 21 AND 35)::int AS f21_35,
           count(*) FILTER (WHERE a BETWEEN 36 AND 50)::int AS f36_50,
           count(*) FILTER (WHERE a >= 51)::int AS f51
    FROM (SELECT (extract(year FROM current_date) - extract(year FROM data_nascimento))::int AS a
          FROM base WHERE data_nascimento IS NOT NULL) x
  ),
  pr AS (SELECT max(profissao) AS nome, count(*)::int AS n FROM base WHERE profissao IS NOT NULL GROUP BY unaccent(lower(profissao))),
  emb AS (SELECT (SELECT count(*) FROM public.indicacoes)::int AS indicacoes,
                 (SELECT count(*) FROM public.share_events)::int AS compartilhamentos)
  SELECT jsonb_build_object(
    'gerado_em', now(),
    'totais', (SELECT to_jsonb(tot) FROM tot),
    'por_dia', (SELECT jsonb_agg(jsonb_build_object('dia', dia, 'n', n) ORDER BY dia) FROM dias),
    'clubes', (SELECT coalesce(jsonb_agg(jsonb_build_object('nome', nome, 'n', n) ORDER BY n DESC, nome), '[]'::jsonb) FROM clubes),
    'paises', jsonb_build_object(
        'top', (SELECT coalesce(jsonb_agg(jsonb_build_object('nome', nome, 'n', n) ORDER BY n DESC, nome), '[]'::jsonb) FROM (SELECT * FROM pa WHERE n >= 3 ORDER BY n DESC, nome LIMIT 10) x),
        'outros', (SELECT coalesce(sum(n), 0)::int FROM pa) - (SELECT coalesce(sum(n), 0)::int FROM (SELECT * FROM pa WHERE n >= 3 ORDER BY n DESC, nome LIMIT 10) y)),
    'estados', jsonb_build_object(
        'top', (SELECT coalesce(jsonb_agg(jsonb_build_object('nome', nome, 'n', n) ORDER BY n DESC, nome), '[]'::jsonb) FROM (SELECT * FROM es WHERE n >= 3 ORDER BY n DESC, nome LIMIT 10) x),
        'outros', (SELECT coalesce(sum(n), 0)::int FROM es) - (SELECT coalesce(sum(n), 0)::int FROM (SELECT * FROM es WHERE n >= 3 ORDER BY n DESC, nome LIMIT 10) y)),
    'cidades', jsonb_build_object(
        'top', (SELECT coalesce(jsonb_agg(jsonb_build_object('nome', nome, 'n', n) ORDER BY n DESC, nome), '[]'::jsonb) FROM (SELECT * FROM ci WHERE n >= 3 ORDER BY n DESC, nome LIMIT 10) x),
        'outros', (SELECT coalesce(sum(n), 0)::int FROM ci) - (SELECT coalesce(sum(n), 0)::int FROM (SELECT * FROM ci WHERE n >= 3 ORDER BY n DESC, nome LIMIT 10) y)),
    'genero', (SELECT to_jsonb(gen) FROM gen),
    'idade', (SELECT to_jsonb(idade) FROM idade),
    'profissoes', jsonb_build_object(
        'resp', (SELECT coalesce(sum(n), 0)::int FROM pr),
        'top', (SELECT coalesce(jsonb_agg(jsonb_build_object('nome', nome, 'n', n) ORDER BY n DESC, nome), '[]'::jsonb) FROM (SELECT * FROM pr WHERE n >= 3 ORDER BY n DESC, nome LIMIT 10) x)),
    'embaixadores', (SELECT to_jsonb(emb) FROM emb)
  ) INTO r;

  RETURN r;
END;
$$;
REVOKE ALL ON FUNCTION public.partner_get_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.partner_get_overview() TO authenticated;

NOTIFY pgrst, 'reload schema';
