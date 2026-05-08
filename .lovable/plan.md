
# Heart Club — Expansão Viral, Dashboard Dinâmico e Refinamentos

Pacote grande dividido em 6 frentes. Vou implementar todas em sequência após sua aprovação.

## 1. Notícias — limpar logo do Google e fallback sem imagem
- Remover badge/logo "Google" no card e no botão "Saiba Mais".
- "Saiba Mais" abre direto a URL original em nova aba (`target="_blank" rel="noopener"`), sem intermediário.
- Quando `urlToImage`/`og:image` estiver ausente: ocultar o container de imagem e renderizar layout de **lista limpa** (título em destaque, fonte e data).

## 2. Dashboard Dinâmico (autonomia por clube selecionado)
- Estado global `clubeAtivo` (default = clube do coração).
- Ao clicar num clube no `SympathyCarousel`, atualizar **Notícias, Rivais e Banners Sociais** para esse clube.
- **Imutável:** o `ClubBanner` principal (banner do clube do coração) **não muda** — continua sempre o do coração.
- `RivalsBlock`/`RivalsRadar` passam a aceitar `clubeAtivo` e buscam rivais via:
  1. Cache em `clubes_cache.rivais` (novo array text[]).
  2. Se vazio → edge function `get-rivals` que consulta **Lovable AI Gateway (Gemini)** e persiste no cache.
- Adicionar campo "Rivais (separados por vírgula)" na página **/correcao** para permitir override manual.

## 3. Convocar a Tropa + Landing /convite
### 3a. Modal de compartilhamento
- Botão "Convocar a Tropa" abre modal com **WhatsApp, Telegram, E-mail** (e Web Share nativo no mobile).
- Link gerado: `https://heartclubapp.com/convite?ref={profile.codigo_indicacao}`.
- Texto: *"Estou te convocando para o Censo Global do Futebol no Heart Club! Clique no link e registre sua paixão pelo nosso time."*

### 3b. Landing `/convite` (já existe — refinar)
- Hero com **Banner Explicativo** centralizado (apenas nesta rota).
- Botão único e gigante: **"ENTRAR E VOTAR AGORA"** → `/login?ref={ref}`.
- Login preserva `ref` em `localStorage` e dispara `register_referral_from_code` após autenticação.

### 3c. Open Graph
- Meta tags dinâmicas em `/convite` (og:title, og:description, og:image apontando para o banner).
- Como é SPA, vou criar `public/convite.html` estático com OG tags + redirect via JS, OR usar `react-helmet-async` se já presente — verificar e escolher o caminho mais simples.

### 3d. Restrição
- Banner Explicativo + botão "Votar Agora" **só** aparecem em `/convite`. Removidos de qualquer dashboard logado.

## 4. Banners sociais — Postar Agora via Web Share API
- "Postar Agora" usa `navigator.share({ files: [bannerBlob], text, url: refLink })`.
- Fallback: download da imagem + copy do texto para clipboard com toast.

## 5. Lógica Coração vs Simpatia
- Auditar `clubes_cache.votos_contagem`: incrementar **somente** quando `is_original_vote = true` E o clube for `clube_nome` (coração).
- Simpatias (`sympathy_1..4`) ficam só em `votos` para estatísticas secundárias (já é o caso nos rankings; vou garantir que nenhum trigger/RPC esteja contando simpatia no `votos_contagem`).
- `get_club_vote_summary`/`ranking` continuam filtrando `is_original_vote = true` (já fazem).

## 6. Correção de Cores (UX)
- Link/botão "Corrigir dados do clube" no Dashboard com destaque **laranja sutil + negrito**.
- Inputs de cor na `/correcao` aceitam **nomes** ("vermelho", "preto", "azul marinho", etc.).
- Mapa interno PT-BR → HEX (~80 cores comuns) + fallback para CSS named colors via `<canvas>` parser.
- Conversão executada antes do submit; salva sempre HEX no `clubes_cache`.

## Detalhes técnicos

### Migração DB
```sql
ALTER TABLE clubes_cache ADD COLUMN IF NOT EXISTS rivais text[] DEFAULT '{}';
```

### Nova edge function: `get-rivals`
- Input: `{ club_name, country }`.
- Chama Lovable AI (`google/gemini-2.5-flash`) com prompt estruturado JSON.
- Retorna até 4 rivais; persiste em `clubes_cache.rivais` com upsert.
- Rate-limit + validação de input (padrões já usados no projeto).

### Arquivos novos
- `supabase/functions/get-rivals/index.ts`
- `src/components/dashboard/ShareTropaModal.tsx`
- `src/lib/color-names.ts` (mapa PT-BR → HEX)
- `public/convite.html` (OG estático com redirect)

### Arquivos editados
- `src/components/dashboard/NewsFeedCards.tsx` / `EditorialNews.tsx` (logo Google + fallback)
- `src/components/dashboard/SympathyCarousel.tsx` (emite `onClubChange`)
- `src/pages/Dashboard.tsx` (estado `clubeAtivo`, propaga para News/Rivais/Banners)
- `src/components/dashboard/RivalsBlock.tsx` + `RivalsRadar.tsx` (aceita clube ativo)
- `src/components/dashboard/AmbassadorCard.tsx` ou onde estiver "Convocar a Tropa" → abre `ShareTropaModal`
- `src/components/dashboard/SocialShareBanners.tsx` (Web Share API)
- `src/pages/Convite.tsx` (refino do hero + preservação do ref)
- `src/pages/Login.tsx` (preserva `?ref` no fluxo)
- `src/pages/Correcao.tsx` (aceita nomes de cor)
- `src/integrations/supabase/types.ts` (regenerado pela migração)

## Ordem de execução
1. Migração `clubes_cache.rivais` (aprovação).
2. Edge function `get-rivals`.
3. Frontend: News fix → SympathyCarousel/Dashboard dinâmico → Rivais.
4. Convite: modal + landing + OG + Login ref.
5. Banners Web Share.
6. Correção de cores PT-BR.
7. Auditoria votos coração vs simpatia.

Aprovar para começar?
