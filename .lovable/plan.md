

# Dashboard Super-App - Upgrade Completo

## Objetivo
Transformar o Dashboard atual (simples, linear) em um "centro de comando" denso e interativo, mantendo dark mode e cores dinâmicas do clube.

## Arquitetura da Implementacao

### Estrutura de Componentes (novos arquivos)

```text
src/
  components/
    dashboard/
      MatchCenter.tsx        -- Jogo expandido com estadio, probabilidades, escalacao
      HeatmapSection.tsx     -- Mapa-mundi SVG interativo com drill-down
      CensusStats.tsx        -- Contador animado + bar chart comparativo (recharts)
      NewsCarousel.tsx       -- Carrossel horizontal de noticias com imagens
      Marketplace.tsx        -- Grid de produtos da loja oficial
      AmbassadorCard.tsx     -- Card de embaixador com hover effects
      DashboardHeader.tsx    -- Header refatorado
  data/
    mockDashboard.ts         -- Todos os dados mockados centralizados
```

### 1. Navegacao por Tabs (Shadcn Tabs)

O Dashboard tera 3 abas principais usando o componente `Tabs` ja existente:
- **Visao Geral** - Profile, Match Center, Stats, Noticias, Marketplace
- **Mapa** - Heatmap global em tela cheia
- **Ranking** - Embaixadores + ranking expandido

### 2. Match Center Expandido (`MatchCenter.tsx`)

- Card maior com: nome do estadio, cidade, horario
- Barra de probabilidade de vitoria (home vs away vs empate) com animacao
- Secao "Escalacao Provavel" com formacao tatica (4-3-3) usando grid CSS
- Card "Onde Assistir" com icones/logos estilizados das emissoras (Globo, Premiere, SporTV, ESPN) usando badges coloridos
- Dados 100% mockados

### 3. Heatmap Global (`HeatmapSection.tsx`)

- Mapa SVG puro (sem dependencia externa) usando paths de continentes simplificados
- Cada continente colorido com gradiente baseado na cor primaria do clube (opacidade variavel = densidade)
- Ao clicar num continente: animacao de zoom (framer-motion scale + translate) mostrando lista de paises com barras de progresso
- Tooltip ao hover mostrando contagem de torcedores
- Dados mockados com distribuicao por continente e paises

### 4. Estatisticas do Censo (`CensusStats.tsx`)

- Contador animado "Voce e o torcedor no X" usando requestAnimationFrame para efeito de contagem
- Bar chart horizontal (recharts `BarChart`) comparando top 5 clubes no ranking global
- O clube do usuario aparece destacado na cor primaria

### 5. Noticias em Carrossel (`NewsCarousel.tsx`)

- Usar o componente `Carousel` do Shadcn (embla-carousel-react ja instalado)
- Cards com imagem placeholder (unsplash de futebol ou SVG), titulo, resumo e timestamp
- Scroll horizontal touch-friendly (mobile-first)

### 6. Marketplace (`Marketplace.tsx`)

- Grid 2x2 (mobile) / 4 colunas (desktop) de produtos
- Cards com imagem placeholder, nome do produto, preco e botao "Comprar" (link de afiliado mockado)
- Produtos: camisa titular, camisa reserva, agasalho, caneca
- Hover effect com scale e sombra

### 7. Embaixadores com Micro-interacoes (`AmbassadorCard.tsx`)

- Cada embaixador em card individual com hover:scale-105 e transicao de sombra
- Medalhas animadas (ouro, prata, bronze) para top 3
- Barra de progresso mostrando meta vs atual

### 8. Refinamento de UX

- `max-w-4xl` (expandir de `max-w-2xl`) para layout mais amplo
- Spacing consistente com `gap-6` entre secoes
- Grid responsivo: 1 coluna mobile, 2 colunas tablet+
- Todas as cards com `hover:border-primary/50 transition-colors`

### Detalhes Tecnicos

- **Mapa SVG**: Paths simplificados dos 6 continentes embutidos no componente (sem lib externa), mantendo o bundle leve
- **Recharts**: Ja instalado, sera usado para o bar chart comparativo
- **Embla Carousel**: Ja instalado via Shadcn, sera usado para noticias
- **Framer Motion**: Ja instalado, usado para animacoes de entrada, contador e zoom do mapa
- **Mock data**: Arquivo centralizado `mockDashboard.ts` com noticias, jogos, produtos, stats do censo e dados geograficos

### Sequencia de Implementacao

1. Criar `mockDashboard.ts` com todos os dados
2. Criar componentes individuais (em paralelo)
3. Refatorar `Dashboard.tsx` com layout de Tabs e grid responsivo
4. Ajustes finais de spacing e animacoes

