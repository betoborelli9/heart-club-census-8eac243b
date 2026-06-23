
-- 1) Função canônica: gera chave normalizada removendo prefixos/sufixos comuns
CREATE OR REPLACE FUNCTION public.canonical_clube_key(name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  s text;
BEGIN
  s := lower(coalesce(name, ''));
  -- remover acentos
  s := translate(s,
    'áàâãäåéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÅÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
    'aaaaaaeeeeiiiiooooouuuucnAAAAAAEEEEIIIIOOOOOUUUUCN'
  );
  s := lower(s);
  -- normalizar separadores
  s := regexp_replace(s, '[^a-z0-9 ]', ' ', 'g');
  s := regexp_replace(s, '\s+', ' ', 'g');
  -- remover tokens genéricos de "clube" em qualquer posição
  s := regexp_replace(s,
    '\m(sport club|sport clube|football club|futebol clube|futbol club|clube de regatas|clube atletico|associacao atletica|esporte clube|esporte club|sociedade esportiva|club deportivo|atletico club|clube de futebol|sport recife|sport|club|clube|fc|sc|ec|ac|cr|cf|aa|se|cd|ca|paulista|paulistano|carioca|mineiro|gaucho|catarinense|baiano)\M',
    ' ', 'g');
  s := regexp_replace(s, '\s+', ' ', 'g');
  RETURN trim(s);
END;
$$;

-- 2) Trigger: ao inserir voto, se já existir clube canônico no cache, usar o nome canônico
CREATE OR REPLACE FUNCTION public.normalize_clube_nome_on_vote()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  canonical_name text;
  key text;
BEGIN
  IF NEW.clube_nome IS NULL OR length(trim(NEW.clube_nome)) = 0 THEN
    RETURN NEW;
  END IF;
  key := public.canonical_clube_key(NEW.clube_nome);
  IF key = '' THEN RETURN NEW; END IF;
  SELECT nome INTO canonical_name
    FROM public.clubes_cache
    WHERE public.canonical_clube_key(nome) = key
    ORDER BY (api_id IS NOT NULL) DESC, length(nome) ASC, id ASC
    LIMIT 1;
  IF canonical_name IS NOT NULL THEN
    NEW.clube_nome := canonical_name;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_clube_nome ON public.votos;
CREATE TRIGGER trg_normalize_clube_nome
BEFORE INSERT OR UPDATE OF clube_nome ON public.votos
FOR EACH ROW EXECUTE FUNCTION public.normalize_clube_nome_on_vote();

-- 3) Backfill: votos existentes apontam para a versão canônica
UPDATE public.votos v
SET clube_nome = c.nome
FROM public.clubes_cache c
WHERE public.canonical_clube_key(c.nome) = public.canonical_clube_key(v.clube_nome)
  AND c.nome <> v.clube_nome
  AND (
    SELECT id FROM public.clubes_cache cc
    WHERE public.canonical_clube_key(cc.nome) = public.canonical_clube_key(v.clube_nome)
    ORDER BY (cc.api_id IS NOT NULL) DESC, length(cc.nome) ASC, cc.id ASC
    LIMIT 1
  ) = c.id;

-- 4) Remover linhas duplicadas no clubes_cache (manter a "canônica": com api_id, ou nome mais curto)
DELETE FROM public.clubes_cache cc
USING (
  SELECT id FROM (
    SELECT id,
      row_number() OVER (
        PARTITION BY public.canonical_clube_key(nome)
        ORDER BY (api_id IS NOT NULL) DESC, length(nome) ASC, id ASC
      ) AS rn
    FROM public.clubes_cache
    WHERE public.canonical_clube_key(nome) <> ''
  ) t WHERE rn > 1
) dups
WHERE cc.id = dups.id;
