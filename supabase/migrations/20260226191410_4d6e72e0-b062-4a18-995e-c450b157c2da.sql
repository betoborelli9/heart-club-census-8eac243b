-- Add unique constraint on api_id for upsert in search-clubs edge function
ALTER TABLE public.clubes_cache ADD CONSTRAINT clubes_cache_api_id_unique UNIQUE (api_id);

-- Allow service_role to insert/update clubes_cache (edge function uses service role key)
-- RLS is already restrictive for anon, service role bypasses RLS by default
