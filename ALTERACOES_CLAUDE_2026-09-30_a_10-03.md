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

## 6. Reaplicação em etapas (03/10/2026, depois do rollback) — tudo no ar, um passo por vez, com teste de login antes e depois
1. Alerta de pagamentos/saúde (API-Football, Supabase dia 23, login, e-mail) — só Master. Botões "Pagar", "Já paguei", pisca com 3 dias.
2. Admin: robô de e-mail, ranking de simpatia, gráficos do BI, nomes amigáveis, aba "Cadastros Incompletos" (relatório por formulário) e filtro de perfil incompleto.
3. Voto imutável (gatilho `a_protect_vote_fields`), sem apagar voto/cadastro pelo torcedor, auto-aprovação bloqueada; alerta vermelho piscante de votos suspeitos (Autorizar/Remover); 63 votos atuais autorizados.
4. Chavinhas por formulário (`feature_flags`, todas DESLIGADAS) + card de Termos e Privacidade.
5. Cards de Território (bairro opcional), Renda e profissão (libera Ranking) e Censo do Embaixador — atrás das chavinhas.
6. Card do próximo jogo com cor do time, estádio e linha "onde assistir" (aparece quando houver dado).
7. Remoção do banner "Instalar App"; correção do texto "SELECIONE SEU CLUBE"; aviso explicativo no Mapa de Calor; busca por apelido/sigla.
8. Ocultação de dados SÓ a pedido do torcedor (voto continua) + painel de pedidos no Admin + textos de privacidade; textos "por que pedimos" em Feedback e Correção.
9. Registro de convites dos embaixadores (`share_events`) + aba "Convites" no Admin.

## 7. Ainda NÃO feito (a conversar antes)
- Votação sem parede de login e simulador de torcedor novo (mexem na entrada). Código guardado na branch `trabalho-votacao-nova`.
- "Onde assistir": a fonte de dados (API-Football) não traz canais de TV; proposta: o Beto digitar no Admin por campeonato.

---

## 8. Voltas (rollbacks) e estado atual — 03/10

- Rollback 2 (commit c0d22f7): site volta ao estado confirmado funcionando. Estado anterior guardado na branch `backup-main-antes-do-rollback-2`.
- Rollback 3 (commit 3ce3d4b): site volta ao estado de 29/09 (commit 4cbc6be, "3 dias atras"), a pedido do Beto. Estado anterior guardado na branch `backup-main-antes-do-rollback-3`.
- Hoje o site no ar tem o MESMO codigo de 29/09. Os 15 arquivos novos que existem na pasta (alertas, chavinhas, cards, aba de cadastros incompletos, robo de e-mail, convites etc.) NAO estao ligados a nenhuma tela, entao nao entram no site.
- Mudancas no BANCO feitas desde 30/09 continuam la (nao voltam com o rollback do site): ver lista das migrations na secao 1 a 7. Ultimas 4 (03/10, 12h-16h): trava de voto, chavinhas, ocultacao a pedido, registro de convites.
- Problema aberto: a API da Supabase (PostgREST) cai com erro 503 por sobrecarga do banco (leitura do mapa de tabelas chegou a 7,9s, limite 8s). Principal peso: limpeza do historico de chamadas automaticas (net._http_response) e rotina de jogos ao vivo a cada minuto (ja existiam antes).

## 9. Fila para recolocar, um item por vez (so com a API estavel)

1. Aba Cadastros Incompletos (Admin) + filtro no robo de e-mail
2. Alertas Supabase / API-Football no Dashboard
3. Remover banner Instalar App; corrigir texto SELECIONE SEU CLUBE
4. Card do proximo jogo (cor, estadio, onde assistir)
5. Chavinhas + cards "por que pedimos"
6. Busca por apelido/sigla, aviso do Mapa de Calor, convites dos embaixadores
7. Votacao sem parede de login + simulador (por ultimo, mexe na entrada)
Antes e depois de cada item: teste de login.

## 10. Plano combinado em 04/10 (NADA executado ainda; cada etapa so com OK do Beto)
1. Banco: limpeza automatica das tabelas tecnicas (diaria + por tamanho) e rotina de jogos ao vivo que so dispara com partida no calendario. Botao "Limpar sujeira tecnica" no Admin mantido.
2. Servidor: calendario mundial 1x/dia; vigia de resultados so em janela de jogo; classificacao so atualiza quando um jogo termina (primeiro torcedor atualiza, os demais veem o guardado). Noticias ficam como estao.
3. Placar ao vivo em tempo real com todos os jogos do campeonato: vermelho piscando + minutos; encerrado = preto estatico.
4. Favoritos (coracao) + avisos no celular em lote: DEPOIS da monetizacao.
5. Dashboard (so Master/admin): termometro do limite da API-Football (usado/limite/saldo), termometro "hora de aumentar o servidor", termometro das tabelas tecnicas com reset automatico; fim da atualizacao a cada 60s.
Regra: nada de admin aparece para torcedor.

Ajuste 04/10: classificacao ao vivo a cada gol (tabela projetada a partir dos placares ao vivo, oficial ao fim do jogo); atualizacao do placar na maior frequencia que couber nos creditos da API-Football (provavel ~15s; confirmar).

## 11. Etapa 1 executada em 04/10 (somente banco; site intacto)
- Migration 20261004100000: hc_cleanup_technical_logs (hora a hora, minuto 7; apaga >1 dia/>3 dias; esvazia se passar de 50 MB; reinicia so o worker do pg_net se a tabela estiver trancada), tabela technical_cleanup_runs (historico), admin_run_technical_cleanup() (botao do Admin, so admin/master; tela ainda nao criada), hc_live_window_open() e rotina fixtures-live-poll-1min religada com trava: so chama a funcao se houver partida na janela.
- Teste: site 200, REST 200, login Google 302 antes e depois; anon nao consegue chamar a limpeza.
