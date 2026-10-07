-- RAIO-X DA TORCIDA: números SOMADOS de cada clube (gênero, faixa etária, profissões, cidades).
-- Regras de privacidade aplicadas AQUI, no banco (o site nunca recebe linha de pessoa):
--  • cada bloco só mostra o detalhe se tiver pelo menos p_min respostas (30 no público);
--  • profissão e cidade só aparecem se pelo menos 3 pessoas tiverem a mesma (senão ficam em "outras");
--  • nunca devolve nome, e-mail nem qualquer dado individual.

-- Cálculo interno (NÃO é público: o limite mínimo não pode ser escolhido por quem chama)
CREATE OR REPLACE FUNCTION public._raio_x_calc(p_club text, p_min int)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  WITH base AS (
    SELECT p.genero,
           p.data_nascimento,
           nullif(btrim(p.profissao), '') AS profissao,
           nullif(btrim(v.cidade), '')    AS cidade
    FROM public.votos v
    LEFT JOIN public.profiles p ON p.id = v.user_id
    WHERE v.is_original_vote = true
      AND v.status_aprovacao = 'aprovado'
      AND unaccent(lower(v.clube_nome)) = unaccent(lower(btrim(p_club)))
  ),
  gen AS (
    SELECT count(*) FILTER (WHERE genero IS NOT NULL) AS resp,
           count(*) FILTER (WHERE lower(genero) = 'masculino') AS homens,
           count(*) FILTER (WHERE lower(genero) = 'feminino')  AS mulheres,
           count(*) FILTER (WHERE genero IS NOT NULL AND lower(genero) NOT IN ('masculino', 'feminino')) AS outros
    FROM base
  ),
  idade AS (
    SELECT count(*) AS resp,
           count(*) FILTER (WHERE a <= 20)            AS ate20,
           count(*) FILTER (WHERE a BETWEEN 21 AND 35) AS f21_35,
           count(*) FILTER (WHERE a BETWEEN 36 AND 50) AS f36_50,
           count(*) FILTER (WHERE a >= 51)            AS f51
    FROM (
      SELECT (extract(year FROM current_date) - extract(year FROM data_nascimento))::int AS a
      FROM base WHERE data_nascimento IS NOT NULL
    ) x
  ),
  prof AS (
    SELECT max(profissao) AS nome, count(*) AS n
    FROM base WHERE profissao IS NOT NULL
    GROUP BY unaccent(lower(profissao))
  ),
  prof_tot AS (SELECT coalesce(sum(n), 0)::int AS resp FROM prof),
  prof_top AS (SELECT nome, n FROM prof WHERE n >= 3 ORDER BY n DESC, nome LIMIT 3),
  cid AS (
    SELECT max(cidade) AS nome, count(*) AS n
    FROM base WHERE cidade IS NOT NULL
    GROUP BY unaccent(lower(cidade))
  ),
  cid_tot AS (SELECT coalesce(sum(n), 0)::int AS resp FROM cid),
  cid_top AS (SELECT nome, n FROM cid WHERE n >= 3 ORDER BY n DESC, nome LIMIT 3)
  SELECT jsonb_build_object(
    'minimo', p_min,
    'total_votos', (SELECT count(*) FROM base),
    'genero', (SELECT CASE WHEN resp >= p_min
        THEN jsonb_build_object('resp', resp, 'homens', homens, 'mulheres', mulheres, 'outros', outros)
        ELSE jsonb_build_object('resp', resp) END FROM gen),
    'idade', (SELECT CASE WHEN resp >= p_min
        THEN jsonb_build_object('resp', resp, 'ate20', ate20, 'f21_35', f21_35, 'f36_50', f36_50, 'f51', f51)
        ELSE jsonb_build_object('resp', resp) END FROM idade),
    'profissoes', (SELECT CASE WHEN pt.resp >= p_min
        THEN jsonb_build_object(
          'resp', pt.resp,
          'top', coalesce((SELECT jsonb_agg(jsonb_build_object('nome', nome, 'n', n) ORDER BY n DESC, nome) FROM prof_top), '[]'::jsonb),
          'outras', pt.resp - coalesce((SELECT sum(n) FROM prof_top), 0)::int)
        ELSE jsonb_build_object('resp', pt.resp) END FROM prof_tot pt),
    'cidades', (SELECT CASE WHEN ct.resp >= p_min
        THEN jsonb_build_object(
          'resp', ct.resp,
          'top', coalesce((SELECT jsonb_agg(jsonb_build_object('nome', nome, 'n', n) ORDER BY n DESC, nome) FROM cid_top), '[]'::jsonb),
          'outras', ct.resp - coalesce((SELECT sum(n) FROM cid_top), 0)::int)
        ELSE jsonb_build_object('resp', ct.resp) END FROM cid_tot ct)
  );
$$;
REVOKE ALL ON FUNCTION public._raio_x_calc(text, int) FROM PUBLIC, anon, authenticated;

-- Versão pública (sem login): mínimo FIXO de 30 respostas
CREATE OR REPLACE FUNCTION public.public_get_raio_x(p_club text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT public._raio_x_calc(p_club, 30);
$$;
REVOKE ALL ON FUNCTION public.public_get_raio_x(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_get_raio_x(text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
