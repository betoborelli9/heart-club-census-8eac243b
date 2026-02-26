
-- Add missing columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS nome_exibicao text,
ADD COLUMN IF NOT EXISTS cidade text,
ADD COLUMN IF NOT EXISTS estado text,
ADD COLUMN IF NOT EXISTS pais text DEFAULT 'BR',
ADD COLUMN IF NOT EXISTS faixa_etaria text;

-- Allow users to insert their own profile (currently missing!)
CREATE POLICY "Usuário cria próprio perfil"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Create clubes_cache table for API-Football data
CREATE TABLE IF NOT EXISTS public.clubes_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_id integer UNIQUE,
  nome text NOT NULL,
  nome_curto text,
  escudo_url text,
  cidade text,
  pais text,
  pais_codigo text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.clubes_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clubes cache público leitura"
ON public.clubes_cache
FOR SELECT
USING (true);

-- Only edge functions (service role) insert into clubes_cache, no user policy needed for INSERT
