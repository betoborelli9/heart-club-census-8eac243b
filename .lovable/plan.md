## Evolução do Dashboard — Caleidoscópio + Inteligência

Vou reestruturar o Dashboard sem tocar em outras páginas (auth/Resend/Voting/Heatmap intactos). Trabalho 100% em `src/pages/Dashboard.tsx` e novos componentes em `src/components/dashboard/`.

### 1. Caleidoscópio (estado `viewedClubId`)
- Novo contexto leve `ViewedClubContext` em `src/contexts/ViewedClubContext.tsx`: `{ viewedClub, setViewedClub }`.
- Banner do Coração (`ClubBanner`) permanece fixo no topo, **sempre** lendo o `heartClub` do usuário (não muda).
- Demais blocos (notícias, probabilidades, rivais, concorrentes, fábrica de banners, calendário) leem `viewedClub`.
- Default: `viewedClub = heartClub`. Clicar num clube de Simpatia ou pesquisar via `ClubSearch` chama `setViewedClub(club)`.
- Skeleton loaders durante troca.
- **Remover** `HeatmapSection` do Dashboard (mantenho o componente intocado — só removo o import/uso). Rota `/mapa-calor` continua funcionando.

### 2. Notícias com imagens (`NewsFeedCards`)
- Reutiliza edge function `club-news` (já existe, RSS Google News).
- Card: `urlToImage` (og:image já capturado), título, fonte, data.
- Botão "Saiba Mais" abre `Drawer` (shadcn) com iframe do conteúdo + botão "Abrir original".

### 3. Motor de Probabilidades (`LeagueObjectives`)
- Novo componente que consulta uma edge function nova `league-standings` (RSS/JSON da ESPN ou API-Football fallback).
- Identifica liga via `clubes_cache.division`.
- Calcula objetivos: G6 / Libertadores (1-6) / Sul-Americana (7-12) / Z4 (últimos 4).
- "Modo Desespero": se posição ≥ N-6, lista escudos dos concorrentes diretos.
- **Para evitar criar API nova agora**, edge function retorna mock estruturado por divisão se API externa indisponível, e o componente já está pronto pra plugar dados reais depois.

### 4. Rivais vs. Concorrentes
- `RivalsBlock`: usa `getHistoricalRivals(viewedClub.name, 4)` de `src/lib/rivalries.ts`. CTA "Convoque os torcedores" → link `/convite?ref={codigo_indicacao}`.
- `CompetitorsBlock`: vem do `LeagueObjectives` (times ±2 posições na tabela).

### 5. Fábrica de Banners (`BannerFactory`)
- Instalar `html-to-image`.
- Gera div oculto 1080x1920 com gradiente (cor do clube), logo Heart Club, escudo, frase dinâmica baseada no objetivo ("Rumo à Libertadores!", "Somos X mil vozes!").
- Botões: "Baixar para Stories" (download PNG) e "Compartilhar no WhatsApp" (`navigator.share` ou `wa.me?text=`).

### 6. Calendário (`MatchSchedule`)
- Reusa/expande `MatchCenter` existente — mostra próximos 3 jogos com data/hora/emissora.
- Se sem dados reais, mostra estado vazio elegante "Em breve: agenda oficial".

### Layout Dashboard final (Dark Mode, laranja #ff4500)
```text
[ClubBanner — Coração — FIXO]
[ClubSearch (atualiza viewedClub)]
[Tabs/Pills: Simpatias rápidas → setViewedClub]
[Identidade do viewedClub — escudo, mascote, cidade]
[NewsFeedCards]  [LeagueObjectives + CompetitorsBlock]
[RivalsBlock]    [MatchSchedule]
[BannerFactory]
```

### Restrições respeitadas
- Não toco em: `Verify.tsx`, `verify-auth-token`, `heart-club-auth`, `Voting.tsx`, `HeatmapSection`, `MapaCalor`, auth Resend.
- Sem mudanças de schema (uso só dados já existentes + edge functions já presentes).
- Tokens semânticos do design system (laranja já em `index.css`).

### Arquivos
**Novos:** `src/contexts/ViewedClubContext.tsx`, `src/components/dashboard/NewsFeedCards.tsx`, `src/components/dashboard/LeagueObjectives.tsx`, `src/components/dashboard/RivalsBlock.tsx`, `src/components/dashboard/CompetitorsBlock.tsx`, `src/components/dashboard/BannerFactory.tsx`, `src/components/dashboard/MatchSchedule.tsx`, `supabase/functions/league-standings/index.ts`.
**Editados:** `src/pages/Dashboard.tsx` (orquestração + remoção do Heatmap), `src/App.tsx` (provider), `package.json` (html-to-image).

Confirma para eu implementar?
