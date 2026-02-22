

# Heatmap com Circulos de Pulsacao e Efeito Satelite

## Objetivo
Transformar o heatmap atual (choropleth por preenchimento de paises) em uma visualizacao estilo "visao de satelite" com circulos de pulsacao radiantes sobre os hubs de torcida, mantendo o mapa geografico real do react-simple-maps como base.

## O que muda

### 1. Dados Mockados (mockDashboard.ts)
- Adicionar coordenadas geograficas (`lat`, `lng`) a cada entrada de `countryFansData` para posicionar os circulos de glow no mapa
- Ajustar valores de fans conforme solicitado (Brasil: 4.3M, Portugal: 150K, Angola: 80K, EUA: 45K)
- Marcar os 3 maiores hubs para animacao de pulsacao

### 2. Circulos de Pulsacao com Glow (HeatmapSection.tsx)
- Manter os paises preenchidos com choropleth sutil (verde escuro quase preto para poucos votos)
- Adicionar circulos SVG (`<circle>`) posicionados via `useGeographies` + projecao nas coordenadas de cada pais com dados
- Cada circulo tera:
  - Raio proporcional ao numero de torcedores
  - Preenchimento com gradiente radial SVG: centro em verde vibrante (#006437), bordas com transparencia total
  - Os 3 maiores hubs recebem animacao CSS `pulse-glow` que oscila opacidade e tamanho
- Definir `<defs>` com `<radialGradient>` no SVG para o efeito de glow

### 3. Interatividade Aprimorada
- Hover em continente: leve zoom animado (800ms) + todos os paises da regiao mudam para verde mais claro
- Tooltip flutuante mostra: "Continente: [Nome] | Votos: [Numero]" ao passar mouse sobre circulos ou paises
- Botoes "Visao Global" e "Meu Pais" mantidos

### 4. Legenda Dinamica
- Barra de gradiente no canto inferior: verde escuro (#0a1a0a) ao verde neon (#00ff6a)
- Labels "Menos Torcedores" e "Mais Torcedores"

### 5. Micro-animacoes
- 3 maiores hubs: circulos pulsam com `@keyframes` que alterna escala (1x a 1.3x) e opacidade
- Efeito de "respiracao" continua, simulando captacao satelite em tempo real

## Arquivos Modificados

1. `src/data/mockDashboard.ts` - Adicionar `lat`/`lng` a `CountryFansEntry`, ajustar valores de fans
2. `src/components/dashboard/HeatmapSection.tsx` - Reescrever com circulos de glow SVG, gradientes radiais, hover de continente e tooltip aprimorado

## Detalhes Tecnicos

- Os circulos usam o componente `Marker` do react-simple-maps para posicionamento automatico via coordenadas
- Gradiente radial definido em `<defs>` do `<ComposableMap>`: `<radialGradient id="glow-green"><stop offset="0%" stop-color="#006437" stop-opacity="0.9"/><stop offset="100%" stop-color="#006437" stop-opacity="0"/></radialGradient>`
- Raio do circulo: `Math.sqrt(fans / maxFans) * maxRadius` (escala quadratica para evitar circulos gigantes)
- A pulsacao usa `transform-origin: center` e `animation: pulse 2s ease-in-out infinite`
- Paises base ficam com fill muito sutil (`hsl(var(--primary) / 0.03)`) para que os circulos sejam o destaque visual

