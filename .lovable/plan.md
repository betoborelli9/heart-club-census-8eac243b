## Plano — Localização Invisível, Auditoria, Admin e UX de Cores

### 1. Localização invisível por IP
- Criar edge function `geo-ip` (sem JWT) que lê o IP do request (`x-forwarded-for`) e consulta `ip-api.com` (free, sem chave) retornando `{ continente, pais, estado, cidade, bairro, lat, lng, isp }`.
- Em `src/pages/Voting.tsx` (no submit do voto), substituir `captureGpsAudit()` por `fetch` da edge `geo-ip`. Gravar em `voto_bairro_gps`, `voto_cidade_gps`, `voto_lat`, `voto_lng`, `voto_pais`, `voto_continente`, `isp`.
- Remover qualquer chamada a `navigator.geolocation` do app (Voting, MapaCalor e helpers). Manter `lookupCep` como fonte oficial quando o torcedor digitar o CEP no Mapa de Calor — esse passa a ser o dado canônico (`bairro`, `cidade`, `estado`, `cep`).
- `src/lib/address.ts`: deprecar `captureGpsAudit`, exportar nova `captureIpAudit()` que chama a edge `geo-ip`.

### 2. Auditoria (Purgatório) com FingerprintJS
- Migration: adicionar coluna `status_aprovacao text default 'aprovado'` em `votos` (valores: `aprovado` | `pendente`). Index em `(status_aprovacao)`.
- No fluxo de voto (`Voting.tsx`):
  1. Capturar `visitorId` via `@fingerprintjs/fingerprintjs` (já instalado no projeto).
  2. Capturar IP via edge `geo-ip`.
  3. Antes de inserir, consultar `votos_tracking` por fingerprint OU IP existentes.
  4. Se já existir → inserir voto com `status_aprovacao='pendente'` e `is_suspicious=true`. Não bloquear: redirecionar normalmente ao Dashboard.
  5. Se não existir → `status_aprovacao='aprovado'` (fluxo atual).
- Excluir votos `pendente` das RPCs públicas de ranking/heatmap (`get_club_vote_summary`, `get_heatmap_*`, `get_*_ranking`, `admin_get_*` mantém todos para análise). Atualizar funções para filtrar `status_aprovacao = 'aprovado'` (junto com `is_original_vote = true`).
- Página admin: nova aba "Auditoria de Votos" em `src/pages/Admin.tsx` listando `status_aprovacao='pendente'` com botões **Aprovar** (chama `admin_approve_vote` já existente, ajustada para setar `status_aprovacao='aprovado'`) e **Excluir** (chama `admin_delete_vote` já existente).

### 3. Whitelist Admin & Reset de testes
- Garantir que `betoborelli9@gmail.com` tenha `role='admin'` no `profiles` (insert idempotente via migration).
- Nova RPC `master_reset_my_vote()` (SECURITY DEFINER): se `auth.email() = 'betoborelli9@gmail.com'`, deleta APENAS os votos do próprio user_id (e linhas em `votos_tracking`). Não toca em nenhum voto de terceiros.
- Adicionar botão "Resetar meu voto (teste)" no painel admin, visível só para o master, que chama essa RPC.

### 4. Performance de cores — Tema Chumbo + frase de espera
- `src/hooks/useClubTheme.ts`: quando `clubeData` ainda não retornou cores reais (cor primária ausente ou igual ao default), aplicar tema fallback **Cinza Chumbo** (`#111111` / `#2a2a2a`) imediatamente em vez de esperar.
- Em `src/components/dashboard/ClubBanner.tsx` (ou onde o banner do clube renderiza), exibir um aviso elegante quando o clube ainda está sendo enriquecido (cor primária = chumbo OU `enrich-club-colors` em andamento):

  > "O manto está chegando! O **{clubName}** é uma nova força no Censo Global e estamos processando as cores e o escudo oficial. Continue navegando, daqui a pouco seu Dashboard estará com a cara da sua paixão!"

  Estilo: card sutil com gradiente laranja translúcido sobre o fundo chumbo, texto em itálico Verdana, ícone Sparkles.
- Quando `enrich-club-colors` responde, refetch do `useClubTheme` e o aviso some automaticamente.

### Detalhes técnicos
- Edge function `geo-ip`: `verify_jwt = false`, rate limit por IP (10/min), cache em memória de 1h por IP. Sem dependência de secret.
- FingerprintJS: usar `@fingerprintjs/fingerprintjs` (já no `package.json` segundo memória). Hash do visitorId com `FINGERPRINT_SALT` antes de salvar (já existe no padrão de segurança).
- Todos os filtros de RPC continuam excluindo `status_integridade='ficticio'` quando aplicável.

### Arquivos afetados
- novo: `supabase/functions/geo-ip/index.ts`, `supabase/config.toml` (entry)
- migration: `votos.status_aprovacao` + atualizar 6 RPCs de leitura pública + RPC `master_reset_my_vote` + atualizar `admin_approve_vote`
- editar: `src/lib/address.ts`, `src/pages/Voting.tsx`, `src/pages/MapaCalor.tsx`, `src/hooks/useClubTheme.ts`, `src/components/dashboard/ClubBanner.tsx`, `src/pages/Admin.tsx` (nova aba Auditoria + botão master reset)
