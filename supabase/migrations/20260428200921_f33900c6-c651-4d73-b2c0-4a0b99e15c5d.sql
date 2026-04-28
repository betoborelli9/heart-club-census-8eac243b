ALTER TABLE public.clubes_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clubes cache readable by everyone" ON public.clubes_cache;
DROP POLICY IF EXISTS "Clubes cache public read" ON public.clubes_cache;
DROP POLICY IF EXISTS "Clubes cache readable by anon and authenticated" ON public.clubes_cache;

CREATE POLICY "Clubes cache readable by anon and authenticated"
ON public.clubes_cache
FOR SELECT
TO anon, authenticated
USING (true);