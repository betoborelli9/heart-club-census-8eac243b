-- Agenda a renovação automática do token do robô do Instagram a cada 10 dias
-- (o token dura 60 dias, renovar a cada 10 dá bastante folga de segurança).
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'instagram-token-refresh-job',
  '0 3 */10 * *',
  $$
  select net.http_post(
    url := 'https://tmttlchkqjtbusfdwyrx.supabase.co/functions/v1/instagram-token-refresh',
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  $$
);
