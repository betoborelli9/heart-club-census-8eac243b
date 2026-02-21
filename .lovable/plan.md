
# Heart Club Global – Fan Census & Engagement Platform

## Visão Geral
Plataforma de censo de torcidas com votação única ("Voto Sagrado"), dashboard personalizado nas cores do clube escolhido e mapa interativo de densidade de torcedores. Versão inicial com frontend completo usando dados mockados, pronta para conexão com Supabase.

---

## Fase 1: Fundação e Onboarding

### 1.1 Estrutura Base
- Dark mode por padrão, layout mobile-first
- Animações suaves com Framer Motion para transições entre telas
- Banco de dados mockado com ~40 clubes brasileiros (Série A e B), cada um com cores primária/secundária e escudo

### 1.2 Tela de Login (Mockada)
- Tela de boas-vindas com branding "Heart Club Global" (coração + futebol)
- Botões de login social (Google, Apple) – mockados, simulam autenticação
- Design impactante e emocional, remetendo à paixão clubística

### 1.3 Fluxo de Votação em 3 Etapas
- **Etapa 1 – Dados Pessoais**: Nome, data de nascimento, país e cidade
- **Etapa 2 – Clube do Coração**: Campo de busca com autocomplete, mostrando escudo e nome. Confirmação dramática ("Este voto é eterno. Tem certeza?")
- **Etapa 3 – Clubes de Simpatia** (Opcional): Selecionar até 4 clubes adicionais
- Barra de progresso visual entre etapas
- Após votar, flag `has_voted = true` bloqueia acesso permanente à votação

---

## Fase 2: Dashboard Personalizado

### 2.1 Personalização de Cores
- Após o voto, toda a UI assume as cores do clube do coração do usuário
- Variáveis CSS dinâmicas (primary/secondary/accent) baseadas no clube
- Header com escudo do clube e nome do torcedor

### 2.2 Seções do Dashboard
- **Card do Perfil**: Escudo, nome do clube, data do voto, código de embaixador
- **Próximo Jogo**: Card com data, adversário, competição e seção "Onde Assistir" (dados mockados)
- **Últimas Notícias**: Grid de cards com manchetes do clube (dados mockados, prontos para API-Football)
- **Ranking de Embaixadores**: Lista dos maiores angariadores de novos membros

---

## Fase 3: Heatmap Global

### 3.1 Mapa Interativo
- Mapa mundial com choropleth (intensidade de cor por volume de votos)
- Visão por país com dados mockados de torcedores
- Drill-down ao clicar em um país para ver distribuição por cidades
- Tooltip com contagem de torcedores e clubes mais populares da região
- Filtros por clube específico para ver sua distribuição geográfica

---

## Fase 4: Engajamento

### 4.1 Sistema de Embaixadores
- Código de referral único gerado para cada usuário (mockado)
- Tela com link compartilhável e contagem de indicações
- Ranking dos maiores angariadores

### 4.2 Proteção do Voto
- Guard/middleware que verifica `has_voted` antes de permitir acesso à votação
- Após votação, redireciona automaticamente para o Dashboard
- Mensagem clara: "Seu voto já foi registrado" se tentar acessar novamente

---

## Estrutura de Páginas
- `/` – Landing page com CTA para votar
- `/onboarding` – Fluxo de votação em 3 etapas
- `/dashboard` – Dashboard personalizado (protegido, requer voto)
- `/map` – Heatmap global interativo
- `/embaixador` – Painel do programa de embaixadores
