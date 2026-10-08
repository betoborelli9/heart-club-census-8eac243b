-- A IA rigorosa pesquisa em lotes pequenos: roda de hora em hora (minuto 20). Cada jogo só é refeito após 20 h.
SELECT cron.unschedule('fixture-watch-twice-daily');
SELECT cron.schedule(
  'fixture-watch-hourly',
  '20 * * * *',
  $$
  SELECT net.http_post(
    url:='https://tmttlchkqjtbusfdwyrx.supabase.co/functions/v1/fixture-watch',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtdHRsY2hrcWp0YnVzZmR3eXJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDcwNDUsImV4cCI6MjA4NzY4MzA0NX0.sW94fnT4_3O24aTLi9WEMTNekzlI7t1B-1aK6w4wJP0"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);
