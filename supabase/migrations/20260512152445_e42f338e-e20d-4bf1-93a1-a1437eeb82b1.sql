CREATE TABLE IF NOT EXISTS public.team_fixtures_cache (
  team_id integer PRIMARY KEY,
  payload jsonb,
  updated_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.team_fixtures_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read fixtures cache" ON public.team_fixtures_cache FOR SELECT USING (true);