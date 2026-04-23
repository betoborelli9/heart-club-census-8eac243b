ALTER TABLE public.clubes_cache ADD COLUMN IF NOT EXISTS apelido text;

-- Aumentar limites de varchar curtos que estão estourando (value too long for varchar(20))
ALTER TABLE public.clubes_cache ALTER COLUMN mascote TYPE text;
ALTER TABLE public.clubes_cache ALTER COLUMN division TYPE text;
ALTER TABLE public.clubes_cache ALTER COLUMN nome_curto TYPE text;
ALTER TABLE public.clubes_cache ALTER COLUMN cor_primaria TYPE text;
ALTER TABLE public.clubes_cache ALTER COLUMN cor_secundaria TYPE text;
ALTER TABLE public.clubes_cache ALTER COLUMN cor_terciaria TYPE text;
ALTER TABLE public.clubes_cache ALTER COLUMN estadio_nome TYPE text;
ALTER TABLE public.clubes_cache ALTER COLUMN estadio_cidade TYPE text;
ALTER TABLE public.clubes_cache ALTER COLUMN api_id TYPE text;