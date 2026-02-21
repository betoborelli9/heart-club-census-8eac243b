
# Heatmap Profissional com react-simple-maps

## Resumo
Substituir o mapa SVG artesanal por um mapa geografico real usando `react-simple-maps`, com estetica choropleth dark, efeito glow, zoom interativo por continente, tooltips, legenda e micro-animacoes de pulsacao.

## Dados Mockados

Atualizar `src/data/mockDashboard.ts`:
- Adicionar dados por pais com codigos ISO (ex: `BRA`, `ARG`, `USA`) para vincular ao GeoJSON do react-simple-maps
- Incluir campo `isTopHub` nos 3 maiores paises para controlar pulsacao
- Manter a estrutura de continentes para o drill-down, mas agora com coordenadas de centro para zoom (`center: [lng, lat]`, `zoom: number`)

## Novo HeatmapSection.tsx

### Engine
- Instalar `react-simple-maps` (usa topojson embutido, sem chamadas externas)
- Componentes usados: `ComposableMap`, `Geographies`, `Geography`, `ZoomableGroup`

### Estetica Choropleth Dark
- Fundo do mapa em tons escuros (`#0a0a0a`)
- Escala de cor: verde escuro quase preto (0 votos) ate verde vibrante (max votos) usando interpolacao linear com a cor primaria do clube
- Efeito glow: aplicar `filter: drop-shadow(0 0 8px hsl(var(--primary)))` via CSS nos paises com alta densidade
- Bordas dos paises em cinza escuro sutil

### Interatividade de Zoom
- Estado de posicao/zoom controlado por `useState` (`center`, `zoom`)
- Ao clicar em um pais/regiao, animar transicao suave para coordenadas do continente correspondente
- Transicao animada via prop `transition` do `ZoomableGroup` (duracao 800ms)

### Tooltip
- Tooltip customizado posicionado via mouse coordinates (`onMouseMove`)
- Exibe: nome do pais + numero formatado de torcedores (ex: "Brasil: 4.3M de torcedores")
- Estilo dark com borda sutil e sombra

### Legenda e Filtros
- Legenda no canto inferior: gradiente horizontal de verde escuro a verde vibrante com labels "Menos Torcedores" e "Mais Torcedores"
- Botoes flutuantes no canto superior direito do mapa:
  - "Visao Global" (reseta zoom)
  - "Meu Pais" (zoom para Brasil)
- Estilo: botoes com `backdrop-blur` e bordas sutis

### Micro-animacoes
- Os 3 paises com mais torcedores recebem animacao de pulsacao CSS (`@keyframes pulse-glow`) que oscila o brilho externo
- Framer Motion para transicao de entrada do componente

## Arquivos Modificados

1. **Instalar dependencia**: `react-simple-maps`
2. **`src/data/mockDashboard.ts`**: Adicionar mapa `countryFansData: Record<string, number>` com codigos ISO e dados de torcedores por pais; adicionar `continentZoomTargets` com coordenadas de zoom
3. **`src/components/dashboard/HeatmapSection.tsx`**: Reescrever completamente com react-simple-maps, tooltip, legenda, filtros e animacoes
4. Adicionar tipos para `react-simple-maps` caso necessario (declaracao de modulo)

## Detalhes Tecnicos

- O GeoJSON vem embutido no react-simple-maps via URL do Natural Earth (CDN topojson padrao da lib)
- Escala de cor calculada por: `opacity = minOpacity + (fans / maxFans) * (1 - minOpacity)` aplicada sobre `hsl(var(--primary))`
- Paises sem dados ficam com fill `hsl(var(--primary) / 0.05)` (quase invisivel)
- Zoom controlado por estado React, nao por transformacoes CSS externas
- Tooltip usa `position: fixed` com coordenadas do mouse para evitar problemas de overflow
