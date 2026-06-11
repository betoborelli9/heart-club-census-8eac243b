# Plano — Etapa 1: Preparação da Estrutura de i18n

Objetivo: instalar e configurar i18n no projeto **sem alterar nenhuma lógica de negócio**, sem mudar estilos, sem afetar Supabase, votação, escudos ou notícias. Apenas infraestrutura + um único componente piloto refatorado.

## 1. Dependências
Instalar via `bun add`:
- `i18next`
- `react-i18next`
- `i18next-browser-languagedetector` (para detectar idioma do navegador)

Nenhuma outra dependência será tocada.

## 2. Estrutura de pastas
Criar os arquivos de tradução em `src/locales/`:

```text
src/
└── locales/
    ├── pt.json   ← idioma base (fonte da verdade)
    ├── en.json
    └── es.json
```

Conteúdo inicial: apenas as chaves usadas pelo componente piloto (header do Dashboard). Os 3 arquivos terão o mesmo formato/estrutura — `en.json` e `es.json` traduzidos; `pt.json` mantendo exatamente os textos atuais.

Exemplo de chaves iniciais (somente o necessário para o piloto):
```json
{
  "header": {
    "brand": "Heart Club",
    "logout": "Sair"
  }
}
```

## 3. Inicialização do i18next
Criar `src/i18n.ts` com:
- Import dos 3 JSONs.
- `LanguageDetector` (ordem: `localStorage` → `navigator` → fallback `pt`).
- `fallbackLng: "pt"`.
- `supportedLngs: ["pt", "en", "es"]`.
- `interpolation.escapeValue: false`.
- `react.useSuspense: false` (evita qualquer flash/loader novo na UI).

Importar `./i18n` **uma única vez** no topo de `src/main.tsx`. Nenhum Provider extra é necessário (react-i18next funciona via hook).

## 4. Componente piloto
Refatorar **apenas o header do Dashboard** (`src/pages/Dashboard.tsx`, dentro do `<header>`):
- Substituir o texto literal `"Heart Club"` por `t("header.brand")`.
- Substituir o `aria/title` implícito do botão de logout (sem texto visível hoje — adicionar apenas `aria-label={t("header.logout")}`, mantendo o ícone exatamente igual).

Nenhum outro arquivo da aplicação é alterado nesta etapa. Banner, busca, news, rivais, footer, votação, login, etc. permanecem intactos.

## 5. Regra de ouro (garantias)
- Visual idêntico: nenhuma classe Tailwind alterada, nenhum layout movido.
- Sem mudança de lógica: sem novos efeitos, sem novas chamadas Supabase, sem mexer em rotas.
- Sem seletor de idioma na UI ainda (fica para a Etapa 2). Detecção é 100% automática pelo navegador, com `pt` como fallback.
- Se o idioma do navegador não for `pt`/`en`/`es`, cai em `pt` (estado atual).

## 6. Arquivos que serão criados/editados
Criados:
- `src/locales/pt.json`
- `src/locales/en.json`
- `src/locales/es.json`
- `src/i18n.ts`

Editados (mínimo absoluto):
- `package.json` (via `bun add`)
- `src/main.tsx` (1 linha: `import "./i18n";`)
- `src/pages/Dashboard.tsx` (apenas o `<header>`: hook `useTranslation` + 2 chaves)

## 7. Próximas etapas (fora do escopo agora)
- Etapa 2: seletor de idioma na UI + expansão para mais componentes.
- Etapa 3: tratamento de conteúdo vindo do Supabase (nomes de clubes, notícias) — exige decisão separada.

Confirma que posso aplicar exatamente este plano?
