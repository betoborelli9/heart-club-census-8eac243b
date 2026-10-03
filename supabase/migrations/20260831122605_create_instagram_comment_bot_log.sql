-- Log de comentários do Instagram que dispararam o robô de "Adivinha Quem É",
-- evita responder duas vezes o mesmo comentário (o Meta pode reenviar o mesmo
-- evento de webhook) e serve de histórico de quem participou.
create table if not exists public.instagram_comment_bot_log (
  id uuid primary key default gen_random_uuid(),
  comment_id text not null unique,
  media_id text,
  commenter_ig_id text,
  commenter_username text,
  comment_text text,
  matched_rule text not null,
  public_reply_sent boolean not null default false,
  dm_sent boolean not null default false,
  dm_error text,
  created_at timestamptz not null default now()
);

alter table public.instagram_comment_bot_log enable row level security;

-- Só a service role (usada pela edge function) mexe nessa tabela.
create policy "service role only"
  on public.instagram_comment_bot_log
  for all
  using (false)
  with check (false);
