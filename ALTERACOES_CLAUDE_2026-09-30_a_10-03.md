# Alterações feitas pelo Claude — 30/09/2026 a 03/10/2026

Registro completo, para consulta e para recolocar no ar aos poucos.

## 1. Site (Vercel) — o que foi publicado

| Data | Commit | O que mudou |
|---|---|---|
| 30/09 | 407a6c4, c1bf2ed | Robô de e-mail no Admin (segmento por dispositivo/clube) + modo teste |
| 30/09 | 27882ed | Ranking numerado de clubes de simpatia |
| 30/09 | bf46065 | Correção: 14 funções do Admin não reconheciam o Beto como admin |
| 30/09 | d4b15a9 | Rastreamento de leitura nos e-mails (pixel) + histórico |
| 30/09 | d24d580 | Remoção de clubes duplicados + trava definitiva |
| 30/09 | b239ff2 | Gráficos novos do BI (cores, percentuais, tendência) |
| 30/09 | 412a7c5 | Nomes amigáveis nas páginas do ranking de acessos + regra de privacidade |
| 01/10 | ba0833e | Alerta de vencimento/saúde das APIs (API-Football) no Dashboard |
| 02/10 | b95a42f | Alerta de vencimento da Supabase (dia 23), saúde do login; remove banner "Instalar App" |
| 02/10 | b626975 | Alerta pisca com 3 dias ou menos, botões "Pagar", "Já paguei" |
| 02/10 | 32beaea | Alerta avisa quando não consegue ler o status |
| 02/10 | e768669 | **ROLLBACK**: front voltou ao estado de 29/09 (4cbc6be), a pedido do Beto |

## 2. Trabalho NÃO publicado (guardado na branch `trabalho-votacao-nova`, commit 3af8e6e)
- Votação sem parede de login (splash → votação → login só ao confirmar), placar ao vivo, voto pendente que completa após o login
- Simulador de "torcedor novo" (só Master), caixinha de simulação, perfil mascarado, bloqueio de gravação
- Cartão opcional de perfil (nascimento, gênero, profissão com autocomplete) + texto "por que pedimos"
- Aviso explicativo no Mapa de Calor
- Admin: aba "Cadastros Incompletos" e filtro no robô de e-mail
- Busca por apelido/sigla (Abecat → Agro EC, CRAC, PSG), selo "antes: ..."
- Card do próximo jogo com cor do time e estádio
- Correção do texto "SELECIONE SEU CLUBE" no banner do Dashboard

## 3. Banco de dados Supabase (aplicado direto, NÃO é revertido pela Vercel)
Migrations aplicadas: segmento de e-mail; rastreio de e-mail; admin com fallback master (14 funções);
dedupe de nomes de clubes; busca canônica; **índice único de nome canônico em clubes_cache**;
BI com país/tendência; nome amigável de país + normalização BR/Brasil; tabela `api_health_status`;
cron diário `check-api-health-daily`; Abecat→Agro EC; coluna `aliases`; site oficial/dados do Agro EC;
`public_get_club_totals` (ranking público); `admin_get_incomplete_profiles` e segmento incompleto;
**índice único de 1 voto original por torcedor** (02/10).
Operações diretas: exclusão de 4 clubes duplicados "lixo"; renomeação de votos duplicados (Vila Nova, Goiás, São Paulo);
`UPDATE votos` BR/Brasil.
Cron `check-login-health-frequent` (15 min) criado em 02/10 e **removido** em 02/10. Fica o arquivo da migration no repositório (inofensivo).

## 4. Edge functions publicadas
send-email-campaign, track-email-open, get-or-create-club (busca canônica), check-api-health (várias versões), search-clubs (alias/sigla).

## 5. Ocorrências
- 01–02/10: login (Google/e-mail) e leituras do banco travando. Causa: pagamento da Supabase + incidente de rede deles.
- 03/10: banco/login voltaram após recarregar o cache de esquema da API (NOTIFY pgrst) e normalização da Supabase.
