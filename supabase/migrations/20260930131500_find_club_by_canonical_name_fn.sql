-- RPC usada por get-or-create-club pra achar clube existente comparando
-- pelo nome CANONIZADO (ignora acento/maiuscula/"futebol clube" etc.),
-- nao por substring solta (ILIKE) -- essa busca fraca foi a causa raiz
-- de duplicados como "Vila Nova" vs "Vila Nova Futebol Clube": a API
-- externa de futebol as vezes devolve o nome com uma grafia levemente
-- diferente da ja salva, e o ILIKE nao reconhecia como o mesmo clube.
CREATE OR REPLACE FUNCTION public.find_club_by_canonical_name(p_nome text)
RETURNS SETOF public.clubes_cache
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT * FROM public.clubes_cache
  WHERE public.canonical_clube_key(nome) = public.canonical_clube_key(p_nome)
  LIMIT 1;
$$;
