-- Mantém fresco o elenco dos clubes que já têm torcedor: de hora em hora renova os 4 mais antigos (cada um só depois de 12 h).
-- ≈ 3 chamadas à API por clube a cada 12 h — custo mínimo. Torcedor que abre outro clube dispara a busca daquele clube.
SELECT cron.schedule(
  'club-squad-refresh-hourly',
  '40 * * * *',
  $$
  SELECT net.http_post(
    url:='https://tmttlchkqjtbusfdwyrx.supabase.co/functions/v1/club-squad',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtdHRsY2hrcWp0YnVzZmR3eXJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDcwNDUsImV4cCI6MjA4NzY4MzA0NX0.sW94fnT4_3O24aTLi9WEMTNekzlI7t1B-1aK6w4wJP0"}'::jsonb,
    body:='{"refreshTracked":true}'::jsonb,
    timeout_milliseconds:=60000
  );
  $$
);
