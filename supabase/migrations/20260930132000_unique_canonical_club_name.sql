-- Trava estrutural: impede FISICAMENTE que dois clubes com o mesmo nome
-- canonizado existam em clubes_cache, mesmo que algum codigo futuro
-- esqueca de checar antes de inserir. E' a garantia "de uma vez por
-- todas" pedida -- nao depende de nenhuma funcao lembrar de checar certo.
CREATE UNIQUE INDEX idx_clubes_cache_canonical_nome_unique
  ON public.clubes_cache (public.canonical_clube_key(nome));
