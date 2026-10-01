-- Agenda a checagem de saude das APIs externas pra rodar sozinha todo
-- dia as 08h BRT (11h UTC) -- antes do fixtures-sync, assim se a
-- API-Football estiver com problema o Beto ja sabe de manha.
SELECT cron.schedule(
  'check-api-health-daily',
  '0 11 * * *',
  $$
  SELECT net.http_post(
    url:='https://tmttlchkqjtbusfdwyrx.supabase.co/functions/v1/check-api-health',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtdHRsY2hrcWp0YnVzZmR3eXJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDcwNDUsImV4cCI6MjA4NzY4MzA0NX0.sW94fnT4_3O24aTLi9WEMTNekzlI7t1B-1aK6w4wJP0"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);
