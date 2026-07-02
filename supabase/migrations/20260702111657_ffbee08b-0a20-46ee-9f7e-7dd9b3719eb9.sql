
-- ─────────────────────────────────────────────────────────────
-- 1. profiles: prevent role self-escalation via trigger
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.prevent_role_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND NOT public.is_admin_or_master(auth.uid()) THEN
    RAISE EXCEPTION 'Alteração de role não permitida';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_self_update ON public.profiles;
CREATE TRIGGER trg_prevent_role_self_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_update();

-- Restrict the update policy to only the authenticated role (not public)
DROP POLICY IF EXISTS "Usuário edita próprio perfil" ON public.profiles;
CREATE POLICY "Usuário edita próprio perfil"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ─────────────────────────────────────────────────────────────
-- 2. geo_neighborhood_cache: restrict UPDATE to admin/master
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can refresh official neighborhoods" ON public.geo_neighborhood_cache;
CREATE POLICY "Admins refresh official neighborhoods"
ON public.geo_neighborhood_cache
FOR UPDATE
TO authenticated
USING (public.is_admin_or_master(auth.uid()))
WITH CHECK (public.is_admin_or_master(auth.uid()));

-- ─────────────────────────────────────────────────────────────
-- 3. ambassador_levels: explicit DELETE policy (own only)
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can delete own ambassador level" ON public.ambassador_levels;
CREATE POLICY "Users can delete own ambassador level"
ON public.ambassador_levels
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 4. auth_tokens: block all client access (service role only)
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Deny all client access to auth_tokens" ON public.auth_tokens;
CREATE POLICY "Deny all client access to auth_tokens"
ON public.auth_tokens
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

REVOKE ALL ON public.auth_tokens FROM anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 5. votos_tracking: restrict SELECT to admin/master only
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Only admins can read vote tracking" ON public.votos_tracking;
CREATE POLICY "Only admins can read vote tracking"
ON public.votos_tracking
FOR SELECT
TO authenticated
USING (public.is_admin_or_master(auth.uid()));

DROP POLICY IF EXISTS "Deny writes to vote tracking from clients" ON public.votos_tracking;
CREATE POLICY "Deny writes to vote tracking from clients"
ON public.votos_tracking
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

-- ─────────────────────────────────────────────────────────────
-- 6. indicacoes: explicit INSERT policy (only self as indicado)
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Indicado cria propria indicacao" ON public.indicacoes;
CREATE POLICY "Indicado cria propria indicacao"
ON public.indicacoes
FOR INSERT
TO authenticated
WITH CHECK (indicado_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 7. club_corrections: drop redundant user_email column
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.club_corrections DROP COLUMN IF EXISTS user_email;

-- ─────────────────────────────────────────────────────────────
-- 8. Storage bucket 'club-logos' RLS policies
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "club-logos public read" ON storage.objects;
CREATE POLICY "club-logos public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'club-logos');

DROP POLICY IF EXISTS "club-logos authenticated upload" ON storage.objects;
CREATE POLICY "club-logos authenticated upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'club-logos');

DROP POLICY IF EXISTS "club-logos admin update" ON storage.objects;
CREATE POLICY "club-logos admin update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'club-logos' AND public.is_admin_or_master(auth.uid()))
WITH CHECK (bucket_id = 'club-logos' AND public.is_admin_or_master(auth.uid()));

DROP POLICY IF EXISTS "club-logos admin delete" ON storage.objects;
CREATE POLICY "club-logos admin delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'club-logos' AND public.is_admin_or_master(auth.uid()));

-- ─────────────────────────────────────────────────────────────
-- 9. Fix mutable search_path on public functions
-- ─────────────────────────────────────────────────────────────
ALTER FUNCTION public.gerar_codigo_embaixador() SET search_path = public;
ALTER FUNCTION public.clean_fictitious_data() SET search_path = public;
ALTER FUNCTION public.get_votos_por_territorio(text, text, text) SET search_path = public;
ALTER FUNCTION public.fn_completar_geografia_autonoma() SET search_path = public;
ALTER FUNCTION public.get_rivals_fast(text) SET search_path = public;
ALTER FUNCTION public.get_rivals_instant(text) SET search_path = public;
ALTER FUNCTION public.get_cached_rivals(text) SET search_path = public;
ALTER FUNCTION public.clean_dead_competitions() SET search_path = public;
ALTER FUNCTION public.check_fixture_status(jsonb) SET search_path = public;
ALTER FUNCTION public.sync_live_impact() SET search_path = public;
ALTER FUNCTION public.purge_mock_data() SET search_path = public;
ALTER FUNCTION public.get_team_standings_real(text) SET search_path = public;
ALTER FUNCTION public.get_heatmap_stats(text) SET search_path = public;

-- ─────────────────────────────────────────────────────────────
-- 10. Revoke public execution from SECURITY DEFINER admin/master
--     functions; they check permissions internally but must not
--     be callable by anon.
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', r.sig);
  END LOOP;
END $$;

-- Revoke execute from authenticated on strictly admin/master-only
-- functions (they'd raise anyway; this closes the surface).
REVOKE EXECUTE ON FUNCTION public.admin_clean_fraud_by_fingerprint() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.purge_fake_votes() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.purge_invalid_fake_votes() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fake_votes_summary() FROM authenticated;
