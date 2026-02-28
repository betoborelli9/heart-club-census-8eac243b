-- Drop the overly permissive public SELECT policy on ambassador_levels
DROP POLICY IF EXISTS "Users read all ambassador levels for ranking" ON public.ambassador_levels;

-- Create a restrictive policy: authenticated users can only read their own level
-- (The existing "Users read own ambassador level" policy already covers this,
--  so we just need to remove the permissive one)