# Plano — Central de Notificações em Tempo Real (Time do Coração)

Este é um épico grande. Vou dividir em **4 sprints sequenciais** para podermos validar cada etapa antes de seguir. Você aprova sprint por sprint.

---

## Sprint 1 — Banco de Dados + Vinculação do Time do Coração

**Migrações Supabase:**

1. `profiles.time_do_coracao_id INT` — guarda o ID oficial da API-Football. Preenchido automaticamente após o voto original (lendo de `clubes_cache.api_id`).
2. `notification_preferences` (1 linha por usuário):
   - `alert_kickoff BOOL DEFAULT true`
   - `alert_lineup BOOL DEFAULT true`
   - `alert_goal BOOL DEFAULT true`
   - `alert_fulltime BOOL DEFAULT true`
3. `push_subscriptions` (N por usuário) — guarda endpoint, p256dh, auth keys do navegador.
4. `notification_history` — histórico para o sininho (tipo, título, corpo, fixture_id, lida, created_at). TTL de 7 dias via cron.
5. Trigger pós-voto: ao gravar voto original, popula `profiles.time_do_coracao_id` a partir do `clubes_cache`.
6. RLS: cada usuário só vê suas próprias preferências/subscriptions/histórico. `service_role` total para edge functions.

---

## Sprint 2 — Edge Functions + Polling Inteligente

1. **`fixtures-sync`** (cron diário, 06:00 BRT): lê todos os `time_do_coracao_id` distintos, busca jogos dos próximos 7 dias na API-Football, salva em `team_fixtures_cache`.
2. **`fixtures-live-poll`** (cron a cada 1 minuto): identifica jogos com status `1H/2H/HT/ET/LIVE` agora; busca eventos novos; compara com último estado em cache; para cada evento novo (gol, kickoff, lineup, FT) → dispara push + grava em `notification_history`.
3. **`fixtures-prematch-poll`** (cron a cada 5 minutos): para jogos que começam nos próximos 60 min, busca escalações (`lineups`). Quando aparecem, marca `lineup_ready=true`.
4. **`push-send`**: helper que envia Web Push via VAPID a todos os tokens do usuário, com fallback para tokens inválidos (limpa).
5. **VAPID keys** geradas e armazenadas como secrets (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`).

**Quota:** o polling de 1min só roda enquanto houver pelo menos 1 jogo ao vivo de um time-do-coração; senão pula. Estimativa: ~90 calls/jogo, multiplicado pelos jogos simultâneos únicos (não por usuário).

---

## Sprint 3 — Frontend: Toast, Card Pré-jogo, Escalações, Live

1. **`public/sw.js`** — Service Worker para receber push e exibir notificação nativa do SO.
2. **`src/lib/push.ts`** — registra SW, pede permissão, assina push, envia subscription pro Supabase.
3. **`src/hooks/useHeartClubFixture.ts`** — Realtime subscription em `team_fixtures_cache` + `notification_history` do usuário.
4. **`src/components/dashboard/MatchAnnouncementToast.tsx`** — toast "Hoje tem jogo do Tigrão!" com fade-in/out, 6s, 1x por dia (flag localStorage).
5. **`src/components/dashboard/MatchCountdownCard.tsx`** — card do banner com cronômetro regressivo (atualiza a cada segundo).
6. **`src/components/dashboard/MatchLineupsCard.tsx`** — substitui o cronômetro a partir de T-40min: 2 colunas (mandante/visitante), titulares + reservas + esquema tático.
7. **`src/components/dashboard/LiveMatchOverlay.tsx`** — banner pulsante quando AO VIVO, mostra placar, gol mais recente com autor.

Toda string nova entra nos 3 locales (pt/en/es).

---

## Sprint 4 — Sininho (Central) + Preferências

1. **`src/components/notifications/NotificationBell.tsx`** — ícone no header do Dashboard com badge de não-lidas; popover lista histórico (últimas 20).
2. **`src/pages/NotificationSettings.tsx`** — `/notificacoes` — 4 checkboxes (Início, Escalação, Gols, Fim) + botão "Ativar notificações no navegador" (push).
3. Link para configurações dentro do popover do sininho.

---

## Detalhes técnicos

- API-Football endpoints: `fixtures?team={id}&next=5`, `fixtures?live=all&team={id}`, `fixtures/lineups?fixture={id}`, `fixtures/events?fixture={id}`.
- Push: lib `web-push` via npm specifier no Deno (`npm:web-push@3`).
- Toast: `sonner` (já no projeto).
- O ID API-Football virá de `clubes_cache.api_id`; se o clube do usuário não tiver, mostramos só o toast "sem jogos hoje" silencioso.
- Cron via `pg_cron` + `pg_net` (extensions já habilitadas no projeto pelo histórico).

---

## Pré-requisitos / decisões que preciso de você

1. **Confirmar API-Football**: o projeto já tem o secret `API_FOOTBALL_KEY` (vi `league-standings`, `check-club-feminino`). Reutilizo o mesmo, OK?
2. **VAPID**: vou gerar via `generate_secret`. Você precisa só do `VAPID_SUBJECT` (um email de contato exigido pelo padrão Web Push). Posso usar `admin@heartclubapp.com`?
3. **Escopo do toast "Hoje tem jogo do Tigrão!"**: o apelido ("Tigrão") sai de onde? Posso usar o `clubes_cache.mascote` que já existe; quando não tiver mascote, uso o nome do clube. OK?
4. **Começo por qual sprint?** Recomendo **Sprint 1 + Sprint 2** juntos (backend pronto), depois Sprint 3 e 4 no front. Mas confirma se prefere uma sequência diferente.

Aprovando, começo pelo Sprint 1 (migração do Supabase) na sequência.