-- 1) Remover duplicidades por nome (case-insensitive), mantendo o registro mais antigo
WITH ranked AS (
  SELECT id,
         row_number() OVER (PARTITION BY lower(trim(nome)) ORDER BY atualizado_em ASC NULLS LAST, id ASC) AS rn
  FROM public.clubes_cache
  WHERE nome IS NOT NULL
)
DELETE FROM public.clubes_cache c
USING ranked r
WHERE c.id = r.id AND r.rn > 1;

-- 2) Restrição única na coluna nome
ALTER TABLE public.clubes_cache
  DROP CONSTRAINT IF EXISTS unique_club_name;

ALTER TABLE public.clubes_cache
  ADD CONSTRAINT unique_club_name UNIQUE (nome);