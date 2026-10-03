-- Guarda o token de acesso do robô do Instagram (Adivinha Quem É) num lugar
-- que a própria edge function consegue atualizar em runtime — diferente de um
-- "secret" do Supabase, que só se altera manualmente via CLI/dashboard.
-- A função instagram-token-refresh atualiza essa linha periodicamente antes
-- do token vencer (validade de 60 dias, renovável a cada renovação).
create table if not exists public.instagram_bot_tokens (
  id int primary key default 1,
  access_token text not null,
  expires_at timestamptz not null,
  last_refreshed_at timestamptz not null default now(),
  last_refresh_error text,
  constraint single_row check (id = 1)
);

alter table public.instagram_bot_tokens enable row level security;

create policy "service role only"
  on public.instagram_bot_tokens
  for all
  using (false)
  with check (false);
