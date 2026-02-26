
-- =============================================
-- FIX 1: profiles — only owner can read their own profile
-- =============================================

-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Perfis públicos" ON public.profiles;

-- Users can only read their own profile
CREATE POLICY "Usuário lê próprio perfil"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- =============================================
-- FIX 2: votos — restrict SELECT to own votes only, keep INSERT open for authenticated
-- =============================================

-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Votos públicos" ON public.votos;

-- Users can only see their own votes
CREATE POLICY "Usuário lê próprios votos"
ON public.votos
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Public aggregated access can be done via a database function later if needed
