-- Login (Google/e-mail) é critico -- checagem diaria nao basta. Roda a
-- mesma funcao de saude a cada 15 minutos tambem, pra pegar queda de
-- login rapido (ex.: instabilidade da Supabase, chave do Resend etc).
SELECT cron.schedule(
  'check-login-health-frequent',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url:='https://tmttlchkqjtbusfdwyrx.supabase.co/functions/v1/check-api-health',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtdHRsY2hrcWp0YnVzZmR3eXJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDcwNDUsImV4cCI6MjA4NzY4MzA0NX0.sW94fnT4_3O24aTLi9WEMTNekzlI7t1B-1aK6w4wJP0"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);
