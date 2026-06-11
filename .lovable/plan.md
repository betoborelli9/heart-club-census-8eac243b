## i18n — Etapa 2: Hook customizado + Página Ranking

### Objetivo
Criar um wrapper reutilizável para `useTranslation` e refatorar a página de Ranking (`/ranking`, arquivo `src/pages/Stats.tsx`) trocando textos estáticos por chaves de tradução. Sem mudar lógica, busca, dados, estilos ou comportamento.

---

### 1. Novo hook: `src/hooks/useTranslationApp.ts`
Wrapper fino sobre `react-i18next`:
- Reexpõe `t`, `i18n`, idioma atual (`language`) e helper `changeLanguage(lng)`.
- Namespace padrão `translation` (o que já usamos).
- Assinatura `useTranslationApp()` — uso idêntico ao atual: `const { t } = useTranslationApp();`.
- Centraliza para facilitar trocas futuras (ex.: logging, fallback custom, namespaces).

### 2. Estrutura de chaves nos JSONs
Adicionar bloco `ranking.*` em `pt.json`, `en.json`, `es.json` mantendo o que já existe (`header.*`). Hierarquia proposta:

```text
ranking.title
ranking.subtitle
ranking.search.placeholder
ranking.scope.global
ranking.scope.country
ranking.scope.state
ranking.scope.city
ranking.scope.neighborhood
ranking.table.position
ranking.table.club
ranking.table.votes
ranking.table.share
ranking.table.trend
ranking.empty_state
ranking.loading
ranking.rivals.title
ranking.rivals.empty
ranking.census.title
ranking.share.button
ranking.share.copied
ranking.invite.title
ranking.invite.cta
```
(Chaves finais serão derivadas 1:1 dos textos visíveis encontrados no arquivo; a lista acima é a espinha dorsal.)

### 3. Refatoração de `src/pages/Stats.tsx`
- Importar `useTranslationApp`.
- Substituir **apenas literais visíveis** (títulos, labels, placeholders, mensagens vazias, tooltips, aria-labels, textos de toast voltados ao usuário) por `t("ranking.<chave>")`.
- Strings interpoladas usam `t("ranking.x", { valor })` com `{{valor}}` nos JSONs.
- **NÃO alterar**: queries Supabase, lógica de cascade de emblemas (`ClubBadge`), cálculos, ordenação, hooks de dados, classes Tailwind, estrutura JSX, IDs, rotas, ícones.
- Nomes de clubes, números formatados via `fmt()` e dados do banco permanecem como estão (não traduzidos).

### 4. Garantias
- Idioma padrão continua `pt` (fallback). Visual idêntico em PT.
- Demais páginas intactas — só Header (etapa 1) e Ranking (etapa 2) usam i18n.
- Nenhum arquivo de backend/edge function alterado.

### Arquivos a criar/editar
- **criar**: `src/hooks/useTranslationApp.ts`
- **editar**: `src/locales/pt.json`, `src/locales/en.json`, `src/locales/es.json`, `src/pages/Stats.tsx`

Aprovando, executo a refatoração mantendo PT como referência e EN/ES como traduções iniciais (revisáveis depois).