
-- 1. Fix club_colors INSERT policy: enforce suggested_by = auth.uid()
DROP POLICY "Authenticated users can suggest colors" ON public.club_colors;
CREATE POLICY "Authenticated users can suggest colors"
  ON public.club_colors
  FOR INSERT
  TO authenticated
  WITH CHECK (NOT is_locked AND suggested_by = auth.uid());

-- 2. Create votos_tracking table for sensitive data (no public SELECT)
CREATE TABLE public.votos_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voto_id uuid REFERENCES public.votos(id) ON DELETE CASCADE NOT NULL,
  fingerprint text,
  ip_address text,
  is_suspicious boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.votos_tracking ENABLE ROW LEVEL SECURITY;
-- No SELECT/INSERT/UPDATE/DELETE policies = only service_role can access

-- 3. Trigger: automatically move sensitive fields from votos to votos_tracking on INSERT
CREATE OR REPLACE FUNCTION public.move_vote_tracking()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.votos_tracking (voto_id, fingerprint, ip_address, is_suspicious)
  VALUES (NEW.id, NEW.fingerprint, NEW.ip_address, NEW.is_suspicious);
  NEW.fingerprint := NULL;
  NEW.ip_address := NULL;
  NEW.is_suspicious := NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_move_vote_tracking
  BEFORE INSERT ON public.votos
  FOR EACH ROW
  EXECUTE FUNCTION public.move_vote_tracking();
