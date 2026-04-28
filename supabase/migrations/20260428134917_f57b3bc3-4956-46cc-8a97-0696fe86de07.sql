ALTER TABLE public.votos 
ADD COLUMN IF NOT EXISTS fingerprint text,
ADD COLUMN IF NOT EXISTS voto_cidade text,
ADD COLUMN IF NOT EXISTS voto_pais text,
ADD COLUMN IF NOT EXISTS voto_continente text,
ADD COLUMN IF NOT EXISTS voto_ip text,
ADD COLUMN IF NOT EXISTS status_integridade text,
ADD COLUMN IF NOT EXISTS is_residente boolean DEFAULT false;

COMMENT ON COLUMN public.votos.fingerprint IS 'ID único do hardware (Device ID) para bloqueio de robôs';
COMMENT ON COLUMN public.votos.voto_cidade IS 'Cidade real de onde o voto partiu (Geo-IP)';
COMMENT ON COLUMN public.votos.is_residente IS 'Define se o torcedor votou de dentro da sua cidade de residência';