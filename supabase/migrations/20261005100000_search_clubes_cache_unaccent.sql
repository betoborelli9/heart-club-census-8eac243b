-- Busca de clubes que ignora acentos e maiúsculas nos DOIS lados:
-- "Grêmio" encontra o "Gremio" salvo, e "Atletico" encontra "Atlético". Só leitura da tabela de clubes
-- (nenhum dado de torcedor). Usada pela função search-clubs (service_role).
CREATE OR REPLACE FUNCTION public.search_clubes_cache(p_term text, p_limit int DEFAULT 30)
RETURNS SETOF public.clubes_cache
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT c.*
  FROM public.clubes_cache c
  WHERE btrim(p_term) <> ''
    AND (
      strpos(unaccent(lower(c.nome)), unaccent(lower(btrim(p_term)))) > 0
      OR strpos(unaccent(lower(coalesce(c.nome_curto, ''))), unaccent(lower(btrim(p_term)))) > 0
    )
  ORDER BY (unaccent(lower(c.nome)) = unaccent(lower(btrim(p_term)))) DESC, length(c.nome), c.nome
  LIMIT greatest(1, least(coalesce(p_limit, 30), 100));
$$;

REVOKE ALL ON FUNCTION public.search_clubes_cache(text, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_clubes_cache(text, int) TO service_role;

NOTIFY pgrst, 'reload schema';
