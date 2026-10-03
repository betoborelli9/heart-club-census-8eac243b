-- Apelidos/nomes antigos de um clube (ex: "Abecat" para "Agro Esporte
-- Clube" apos a troca de nome) -- usado SO pra ampliar a busca, nunca
-- cria registro separado nem divide voto. O torcedor que buscar pelo
-- nome antigo encontra e vota no MESMO clube (mesmo api_id).
ALTER TABLE public.clubes_cache ADD COLUMN IF NOT EXISTS aliases text[] DEFAULT '{}';

UPDATE public.clubes_cache
SET aliases = ARRAY['Abecat', 'ABECAT Ouvidorense']
WHERE api_id = '23306';
