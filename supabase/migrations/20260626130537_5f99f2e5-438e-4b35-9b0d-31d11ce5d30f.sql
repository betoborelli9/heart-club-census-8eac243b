
-- 1. profiles.time_do_coracao_id
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS time_do_coracao_id integer;

CREATE INDEX IF NOT EXISTS idx_profiles_time_coracao ON public.profiles(time_do_coracao_id);

-- 2. notification_preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_kickoff boolean NOT NULL DEFAULT true,
  alert_lineup boolean NOT NULL DEFAULT true,
  alert_goal boolean NOT NULL DEFAULT true,
  alert_fulltime boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_prefs_select" ON public.notification_preferences;
DROP POLICY IF EXISTS "own_prefs_insert" ON public.notification_preferences;
DROP POLICY IF EXISTS "own_prefs_update" ON public.notification_preferences;
DROP POLICY IF EXISTS "own_prefs_delete" ON public.notification_preferences;

CREATE POLICY "own_prefs_select" ON public.notification_preferences
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_prefs_insert" ON public.notification_preferences
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_prefs_update" ON public.notification_preferences
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_prefs_delete" ON public.notification_preferences
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 3. push_subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON public.push_subscriptions(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_push_all" ON public.push_subscriptions;
CREATE POLICY "own_push_all" ON public.push_subscriptions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. notification_history
CREATE TABLE IF NOT EXISTS public.notification_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fixture_id integer,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  payload jsonb DEFAULT '{}'::jsonb,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_hist_user_created
  ON public.notification_history(user_id, created_at DESC);

GRANT SELECT, UPDATE, DELETE ON public.notification_history TO authenticated;
GRANT ALL ON public.notification_history TO service_role;

ALTER TABLE public.notification_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_notif_select" ON public.notification_history;
DROP POLICY IF EXISTS "own_notif_update" ON public.notification_history;
DROP POLICY IF EXISTS "own_notif_delete" ON public.notification_history;

CREATE POLICY "own_notif_select" ON public.notification_history
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_notif_update" ON public.notification_history
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_notif_delete" ON public.notification_history
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 5. Realtime
DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_history';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- 6. Trigger para popular time_do_coracao_id após o voto original
CREATE OR REPLACE FUNCTION public.sync_time_do_coracao_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_api_id integer;
BEGIN
  IF NEW.is_original_vote IS TRUE AND NEW.clube_nome IS NOT NULL THEN
    BEGIN
      SELECT NULLIF(regexp_replace(api_id, '\D', '', 'g'), '')::integer
        INTO v_api_id
        FROM public.clubes_cache
       WHERE lower(nome) = lower(NEW.clube_nome)
       LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      v_api_id := NULL;
    END;

    IF v_api_id IS NOT NULL THEN
      UPDATE public.profiles
         SET time_do_coracao_id = v_api_id
       WHERE id = NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_time_coracao ON public.votos;
CREATE TRIGGER trg_sync_time_coracao
AFTER INSERT OR UPDATE OF clube_nome, is_original_vote ON public.votos
FOR EACH ROW EXECUTE FUNCTION public.sync_time_do_coracao_id();

-- 7. Backfill
UPDATE public.profiles p
   SET time_do_coracao_id = sub.api_int
  FROM (
    SELECT v.user_id,
           NULLIF(regexp_replace(c.api_id, '\D', '', 'g'), '')::integer AS api_int
      FROM public.votos v
      JOIN public.clubes_cache c ON lower(c.nome) = lower(v.clube_nome)
     WHERE v.is_original_vote = true
       AND c.api_id IS NOT NULL
  ) sub
 WHERE sub.user_id = p.id
   AND sub.api_int IS NOT NULL
   AND p.time_do_coracao_id IS NULL;

-- 8. Limpeza diária
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.notification_history WHERE created_at < now() - interval '7 days';
$$;
