

# Mapa Coropletico de Alta Performance com Drill-Down

## Resumo
Reescrever completamente o `HeatmapSection.tsx` como um sistema de mapa coropletico multi-nivel (Mundo > Continente > Pais > Estado > Cidade) com breadcrumbs, escala de cores laranja, search/autocomplete de clubes, tooltip dinamico que segue o cursor, e arquitetura preparada para Supabase.

## Arquitetura de Navegacao (Drill-Down)

### Fluxo de Niveis
```text
Mundo (GeoJSON 110m) 
  -> Continente (zoom animado na regiao)
    -> Pais (GeoJSON 50m filtrado)
      -> Estado (mock data, visual simulado)
        -> Cidade (mock data, lista rankeada)
```

### Breadcrumbs
- Componente de breadcrumbs no topo do mapa: `Mundo > America do Sul > Brasil > SP > Sao Paulo`
- Cada item clicavel para retornar ao nivel correspondente
- Estilo discreto com separadores `>` e item ativo em destaque

### Transicoes
- Zoom animado via Framer Motion (scale + translate do `ZoomableGroup`)
- Transicao de 600ms ease-in-out entre niveis
- Fade-in dos dados do nivel seguinte

## Escala de Cores (Choropleth Laranja)

### Funcao de Coloracao
- Calcular porcentagem: `regionVotes / totalWorldVotes`
- Base sem votos: `#E5E7EB` (cinza claro)
- Escala com votos: gradiente de laranja medio (`#FBB040`) ate laranja queimado (`#F36100`)
- Funcao `getRegionColor(votes, maxVotes)` que retorna cor interpolada
- Preparada para receber dados via prop (Supabase-ready)

### Hover
- Stroke branco/highlight na borda da regiao ao hover
- Tooltip dinamico que segue o cursor (posicao via `onMouseMove`)
- Conteudo: `[Nome da Regiao] | [Total de Votos]`

## Componente Search/Autocomplete

- Usar `Command` (cmdk) do Shadcn/UI posicionado acima do mapa
- Lista de todos os clubes do `clubs.ts` como opcoes
- Ao selecionar um clube, o mapa recarrega com os dados mockados daquele clube
- Logica inicial: carrega dados do `heartClubId` do contexto do usuario
- Placeholder: "Buscar clube..."

## Dados Mock Hierarquicos

Expandir `mockDashboard.ts` com estrutura hierarquica completa:

```text
clubMapData: Record<string, {
  total: number,
  continents: {
    [continentId]: {
      name: string,
      votes: number,
      countries: {
        [iso]: {
          name: string,
          votes: number,
          states?: { name: string, votes: number, cities?: { name: string, votes: number }[] }[]
        }
      }
    }
  }
}>
```

- Dados completos para Palmeiras (club padrao)
- Dados parciais para Flamengo e Corinthians (para demonstrar o autocomplete)
- Estados e cidades detalhados apenas para o Brasil (pais principal)

## Arquivos Modificados

### 1. `src/data/mockDashboard.ts`
- Adicionar interfaces: `ClubMapData`, `ContinentMapData`, `CountryMapData`, `StateMapData`, `CityMapData`
- Adicionar `clubMapData` com dados hierarquicos para 3 clubes
- Manter dados existentes para compatibilidade

### 2. `src/components/dashboard/HeatmapSection.tsx`
Reescrita completa:
- Props: `data?: ClubMapData` (para futura integracao Supabase)
- Estado: `drillLevel` (world/continent/country/state/city), `breadcrumbs[]`, `selectedClubId`
- Componente `MapBreadcrumbs` inline
- Componente `ClubSearch` usando Command/cmdk do Shadcn
- `ComposableMap` com `ZoomableGroup` controlado por estado
- `getRegionColor()` baseado em porcentagem de votos
- Tooltip que segue cursor via `onMouseMove` no container
- Legenda com gradiente laranja

### 3. `src/pages/Dashboard.tsx`
- Passar `heartClub` como contexto para o HeatmapSection (via prop ou contexto)

## Detalhes Tecnicos

- **GeoJSON**: Usar `countries-110m.json` para visao mundial e `countries-50m.json` para drill-down em continente (mais detalhe)
- **Interpolacao de cor**: Funcao linear entre `#FBB040` e `#F36100` baseada em `votes/maxVotes`
- **Tooltip**: `position: fixed`, coordenadas atualizadas via `onMouseMove` no container do mapa, com `pointer-events: none`
- **Breadcrumbs**: Array de objetos `{ label, level, data }` que permite navegacao livre entre niveis
- **Supabase-ready**: O componente aceita uma prop `data: ClubMapData` opcional; se nao fornecida, usa mock data. A funcao de coloracao `getRegionColor` e pura e recebe apenas votos e total
- **Performance**: `useMemo` para calculos de cor por geografia, `useCallback` para handlers de click e hover
- **Mobile**: Tooltip desabilitado em touch (usa click para exibir), breadcrumbs com scroll horizontal

