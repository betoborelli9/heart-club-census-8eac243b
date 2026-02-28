
-- Add classe_social column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS classe_social text;

-- Create club_colors table for dynamic theming
CREATE TABLE public.club_colors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_name text NOT NULL,
  api_id integer,
  primary_color text NOT NULL DEFAULT '#FF6600',
  secondary_color text NOT NULL DEFAULT '#000000',
  accent_color text,
  suggested_by uuid REFERENCES auth.users(id),
  validated_by uuid REFERENCES auth.users(id),
  is_locked boolean NOT NULL DEFAULT false,
  conflict_reported boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(club_name)
);

-- Enable RLS
ALTER TABLE public.club_colors ENABLE ROW LEVEL SECURITY;

-- Everyone can read club colors
CREATE POLICY "Club colors readable by all"
ON public.club_colors FOR SELECT
USING (true);

-- Authenticated users can suggest colors (insert if not exists)
CREATE POLICY "Authenticated users can suggest colors"
ON public.club_colors FOR INSERT
TO authenticated
WITH CHECK (NOT is_locked);

-- Only the suggester can update unlocked colors
CREATE POLICY "Suggester can update unlocked colors"
ON public.club_colors FOR UPDATE
TO authenticated
USING (suggested_by = auth.uid() AND NOT is_locked);

-- Create ambassador_levels table for gamification hierarchy
CREATE TABLE public.ambassador_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level text NOT NULL DEFAULT 'bronze' CHECK (level IN ('bronze', 'silver', 'gold')),
  scope_type text NOT NULL CHECK (scope_type IN ('city', 'state', 'country')),
  scope_value text NOT NULL,
  referral_count integer NOT NULL DEFAULT 0,
  social_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, scope_type)
);

ALTER TABLE public.ambassador_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own ambassador level"
ON public.ambassador_levels FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users read all ambassador levels for ranking"
ON public.ambassador_levels FOR SELECT
USING (true);

CREATE POLICY "Users can insert own ambassador level"
ON public.ambassador_levels FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ambassador level"
ON public.ambassador_levels FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);
