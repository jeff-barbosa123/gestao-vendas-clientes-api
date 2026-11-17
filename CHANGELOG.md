# Changelog

## 2026-11-17 - Dashboard com agregacao em SQL (Fase 6)

### Melhoria
- analyticsService.getOverview e buildTimeseries deixaram de carregar todas as vendas (e itens) em memoria: soma, contagem e agrupamento por dia/semana/mes/ano (UTC, semana ISO 8601) agora rodam no PostgreSQL via novo repositorio db/repositories/analytics.js. O banco devolve uma linha por periodo.
- Contagens do painel (clientes, produtos, vinculados, fichas ativas) numa unica consulta; alerta de precificacao le so os campos necessarios (produtos com custo > 0); lastSaleAt vem de MAX(date).
- Contrato da API inalterado (mesmos campos e regras: venda cancelada fora dos totais, isolamento por empresa, limite de 366 dias). Usa o indice existente (owner_id, date).
- Testes: US017-dashboard-sql (12) comparam o resultado com a implementacao de referencia em JS nas bordas de ano/semana ISO, cancelamentos, isolamento e 20.000 vendas.

## 2026-11-17 - Tema Grafite Noturno (Fase 5)

### Novo
- Identidade visual base escura (direcao B aprovada): superficies #0b1220 (fundo) e #111c33 (cards), texto #f1f5f9. Aplicada em todas as telas (login, dashboard, vendas, clientes, produtos, fichas, insumos, encomendas, vinculos, relatorios, simulacao, perfil, aparencia) pela inversao da paleta primitiva em base.css (`--white`, `--slate-*`, `--success/danger/warning/brand-*`) e por tons semanticos novos (`--info-*`, `--ok-*`, `--warn-*`, `--danger-*`, `--line-strong`, `--on-accent`, `--accent-text`). Cores fixas de tons claros foram remapeadas para esses tokens.
- White-label sobre o tema escuro: a cor primaria continua sendo fundo de botoes com texto branco (AA contra branco) e agora gera `--accent-text`, uma versao clareada automaticamente ate atingir 4.5:1 sobre a superficie escura e sobre o fundo da empresa (links, destaques). Logo e nome seguem inalterados.
- Regras de contraste: primaria e fundo continuam contra branco; a cor de texto agora e validada contra a superficie escura (#111c33), ou seja, precisa ser clara. Padroes novos: fundo #0b1220, texto #f1f5f9. A tela Aparencia usa a mesma regra no badge e na previa.
- Migracao 0006: paletas salvas voltam ao texto claro padrao (#f1f5f9) e, se estavam no fundo azul antigo, ao grafite; cor primaria e logo sao mantidos.
- PDFs: papel continua branco; o corpo do PDF usa tom escuro fixo (#0f172a) e nao a cor de texto da tela. A cor primaria da empresa segue no cabecalho.
- Testes: accessibility.cy.js ganhou verificacao axe de contraste AA (color-contrast) em 17 telas e checagem dos tokens; design-tokens e appearance atualizados; US015 (BRD-005b, accent-text) e US016 ajustados.

## 2026-11-17 - Conversao automatica de logo WebP para PNG

### Novo
- brandingService.uploadLogo converte logos WebP para PNG (sharp) antes de gravar; limite de 1024px sem ampliar. O logo aparece no painel (GET /api/branding/logo devolve image/png) e nos PDFs exportados.
- WebP corrompido (cabecalho valido, conteudo ilegivel) retorna 400 INVALID_LOGO.
- Dependencia nova: sharp (api).
- Testes: PDF-004 (WebP real -> PNG no painel e no PDF) e PDF-004b (WebP corrompido).

## 2026-11-17 - PDFs com a marca da empresa (Fase 4)

### Novo
- Helper api/src/services/pdfBranding.js (loadPdfBranding, drawBrandHeader) aplicado nos 3 geradores pdfkit: lista de clientes (exportController), faturamento (reportsService.exportRevenue) e ficha tecnica (recipes/exportRenderer). Cabecalho com logo, nome da empresa, linha e titulo na cor primaria; texto do corpo na cor de texto; cabecalho da tabela da ficha tecnica com tom da cor primaria.
- Fallback fiel: sem configuracao, ou so com valores padrao (sem nome nem logo), o cabecalho e exatamente o anterior (titulo centralizado).
- Limite: pdfkit so embute PNG e JPEG (WebP e convertido no upload, ver abaixo). Falha ao carregar a marca nunca derruba a exportacao.
- Testes: US016-pdf-branding (9, Mocha).

## 2026-11-17 - Multiempresa (owner_id) e White-Label (Fase 3)

### Novo
- Migracao 0004: owner_id NOT NULL e FK para users em customers, products, recipes, sales, orders, ingredients e ingredient_stock_movements. Linhas legadas sem dono passam para a conta mais antiga. filterByOwner do dashboard deixou de tratar owner nulo como visivel. Testes DB-owner.
- Migracao 0005: tabela company_settings (por owner_id): nome, 3 cores (primaria, fundo, texto) e logo (BYTEA).
- API /api/branding: GET/PUT/DELETE; POST/GET/DELETE /logo (PNG/JPG/WebP ate 512 KB, validacao por magic bytes, SVG recusado); GET /theme.css (publico, tema padrao para visitante). Paleta validada em WCAG AA (4,5:1 contra branco) com 422 CONTRAST_AA e detalhes.
- Web: /theme.css (proxy para a API) carregado apos base.css em todas as paginas, sobrescrevendo --accent, --accent-dark, --bg, --bg-dark, --ink e --slate-900. Tela appearance.html (cores com contraste ao vivo, previa, upload/remocao de logo), botao Aparencia e logo/nome no dashboard.
- Testes: US015-branding (11, Mocha) e appearance.cy.js (11, Cypress).

### Observacao
- A tela de login nao aplica o tema da empresa (ainda nao ha sessao para identificar a empresa). Logo/cores nos PDFs sao a Fase 4.

## 2026-11-17 - Design tokens (Fase 2)

### Novo
- Paleta de tokens no :root de web/public/base.css (slate, gray, success, danger, warning, brand) e migracao de cerca de 400 cores fixas de todos os CSS, dos blocos style e dos atributos style dos HTML para var(--token). Marca e fundo reutilizam --accent, --accent-dark, --bg e --bg-dark, que a Fase 3 (White-Label) vai sobrescrever por empresa.
- scripts/design-tokens.js com --apply, --check (guarda: sem cor mapeada fixa fora do :root) e --parity (CSS resolvido identico ao git HEAD).
- Testes: DS-design-tokens.test.js (Mocha) e design-tokens.cy.js (3 testes). Cores sem token, rgba e SVG/JS seguem fixas e entram em rodadas seguintes.

## 2026-11-17 - Estoque, migrações versionadas e login por e-mail ou usuário (Fase 1)

### Corrigido
- **Vendas/estoque:** a baixa e a validação de saldo só valiam para produtos com `stock <= 5` (bug). Agora todo produto com
  controle de estoque (`stock IS NOT NULL`) tem o saldo validado (422 "Estoque insuficiente") e baixado de forma atômica
  na venda; cancelar/editar devolve exatamente o que foi baixado. Testes legados (API-VEN-024, DEV-002) atualizados.
  Novo `US003-sales-stock.test.js` (5 testes, inclui concorrência: 12 vendas paralelas contra saldo 8).

### Novo
- **Migrações versionadas:** `api/src/db/migrate.js` + `api/src/db/migrations/NNNN_nome.sql`, histórico em
  `schema_migrations` (checksum, advisory lock, transação por migração). Roda no `initDb`, em `db:init`/`db:reset` e via
  `npm run db:migrate` / `db:migrate:status`. `schema.sql` segue como baseline; mudanças novas entram como migração.
- **Índices críticos** (0002): `customers/products/recipes(owner_id, created_at)`, `products(owner_id, status_produto)`,
  `sales(owner_id, date)`, `sales(customer_id)`, `sale_items(sale_id)`, `sale_items(product_id)`, `recipes(link_product_id)`.
- **Login por e-mail ou usuário:** coluna `users.username` (0003; opcional, única sem diferenciar maiúsculas, 3-30 chars
  `[a-z0-9._-]`). `POST /api/auth/login` aceita `identifier` (e-mail ou usuário); `email` continua aceito por compatibilidade.
  Mesma resposta/tempo para usuário inexistente e senha errada (hash descartável), bloqueio por tentativas vale para o
  identificador. Cadastro e perfil (`PUT /api/auth/me`) aceitam `username` (409 `USERNAME_ALREADY_EXISTS`).
- UI: campo "E-mail ou usuário" no login e "Usuário (opcional)" no cadastro.
- Testes: `DB-migrations.test.js` (4), `US001-login-username.test.js` (9) e 3 specs Cypress novos em `login.cy.js`.

### Alterado
- Mensagem de login vazio: "E-mail ou usuário obrigatório."; identificador sem `@` e fora do padrão retorna
  "Formato de e-mail ou usuário inválido". Testes que usavam texto sem `@` como "e-mail inválido" foram ajustados.

## 2026-11-17 - Frontend: módulos compartilhados entre products/product-edit e recipes/recipe-edit

### Novo
- `web/public/shared/` com os itens idênticos das 4 telas: `config`, `http`, `form-errors`, `auth`, `money`, `text`,
  `search`, `product-name`, `recipe-constants`, `recipe-format`, `recipe-catalog`, `recipe-validators`. As telas
  importam de `../shared/` e os módulos locais mantêm re-export.
- Mapa do que ficou compartilhado, do que continua por tela e por quê: `docs/FRONTEND_MODULOS_COMPARTILHADOS.md`.
- Spec Cypress `product-edit-name.cy.js` (1 teste).

### Corrigido
- **product-edit:** o nome do produto só aceitava letras Latin-1, enquanto a criação aceitava qualquer letra Unicode;
  um produto criado como "Łódź" não podia ser salvo na edição. Alinhado em `\p{L}`.
## 2026-11-16 - Frontend: modularização de app.js (login) e dashboard.js

### Novo
- **app.js** (1.061 linhas) e **dashboard.js** (846 linhas) viraram entrypoints ES module (~30-40 linhas) com módulos em
  `web/public/app/` (`constants`, `dom`, `state`, `core`, `session`, `api`, `messages`, `login`, `register`, `forgot`,
  `events-login`, `events-register`) e `web/public/dashboard/` (`constants`, `dom`, `state`, `core`, `period`,
  `charts`, `alerts`, `data`, `load`, `events`). O `index.html` e o `dashboard.html` passam a carregar o entrypoint
  como `type="module"` (o dashboard agora via `/static/dashboard.js`).
- Spec Cypress `dashboard-flows.cy.js` (14 testes): métricas, troca de período, próximas encomendas e navegação.
- Auditoria de listeners (estática e em runtime): sem duplicatas em `app` e `dashboard`.

### Alterado
- `app.js`: a constante interna `state` foi renomeada para `authState` (evita conflito com o `state` de módulos).
- `dashboard.js`: a função `init()` e a espera por DOMContentLoaded foram removidas; o módulo executa após o parse do DOM.

## 2026-11-16 - Frontend: modularização de client-edit e product-edit

### Novo
- **client-edit.js** (1.123 linhas) e **product-edit.js** (1.055 linhas) viraram entrypoints ES module (~40 linhas) com módulos em
  `web/public/client-edit/` (`constants`, `dom`, `state`, `core`, `formatters`, `validators`, `notes-meta`, `cnpj`,
  `dirty`, `load`, `events-form`, `events-fields`, `events-modals`) e `web/public/product-edit/` (`constants`, `dom`,
  `state`, `core`, `text`, `money`, `product-type`, `recipes`, `pricing`, `dirty`, `linked-recipe`, `load`,
  `events-form`, `events-fields`, `events-recipe`, `events-modals`).
- Specs Cypress: `client-edit-flows` (6), `client-edit-cancel` (3), `product-edit-flows` (9), `product-edit-pricing` (3).
- Auditoria de listeners em runtime nas 9 telas; removidos registros redundantes em `clients` e `recipe-edit`.

### Corrigido
- **client-edit:** o botão Cancelar tinha dois listeners; recusar a confirmação de alterações não salvas ainda saía da página.
  Unificado em um handler único; removidas também as duplicatas de Voltar, fechar modal e ESC.
- **product-edit:** ao abrir um produto de revenda, o 404 de `/ficha-tecnica` limpava os campos de preço de compra e de venda.
  `updateProducedPricing` agora só atua em produtos produzidos.
## 2026-11-16 - Frontend: modularização da tela de produtos

### Novo
- **products.js** (1.287 linhas) virou entrypoint ES module de ~65 linhas com módulos em `web/public/products/`
  (`constants`, `dom`, `state`, `core`, `text`, `money`, `product-type`, `recipes`, `pricing`, `list`,
  `events-form`, `events-list`). O Fuse continua carregado via script vendor.
- Specs Cypress `products-flows.cy.js` (5 testes) e `products-listeners.cy.js` (4 testes).

### Corrigido
- Listagem de produtos: listeners de voltar, atualizar, busca, ordenação, paginação e tabela estavam registrados em
  duplicidade. "Próxima" avançava duas páginas e os cabeçalhos Nome/Preço não alternavam a ordenação (um clique
  desfazia o outro). Removida a duplicata, mantendo a versão mais completa de cada par.
## 2026-11-16 - Frontend: modularização da tela de vendas

### Novo
- **sales.js** (1.837 linhas) virou entrypoint ES module de ~30 linhas com módulos em `web/public/sales/`
  (`constants`, `dom`, `state`, `core`, `formatters`, `parsers`, `holidays`, `catalog`, `barcode`,
  `items`, `print`, `pdf`, `list`, `events-forms`, `events-modals`, `events-table`). Estado mutável em
  `state`; jsPDF continua carregado via script vendor; comportamento inalterado.
- Spec Cypress `sales-flows.cy.js` (6 testes): edição com PUT, filtros, busca, paginação e modais.
## 2026-11-16 - Frontend: modularização das telas de receitas

### Novo
- **recipes.js** (1.753 linhas) e **recipe-edit.js** (2.303 linhas) viraram entrypoints ES module de ~110 linhas
  com módulos em `web/public/recipes/` e `web/public/recipe-edit/` (`constants`, `dom`, `state`, `core`,
  `calc`, `validators`, `catalog`, `components`, `summary`, `ingredients`, `list`/`persist`, `events`).
  Estado mutável centralizado em `state`; comportamento inalterado.
- Spec Cypress `recipe-edit.cy.js` (5 testes) cobrindo carga, validação, PUT, modal de exclusão e redirect.

### Corrigido
- `recipe-edit`: removida função `getProfitType` duplicada (semântica idêntica) que ficava inacessível ao modularizar.

## 2026-11-16 — Frontend: base comum e modularização da tela de clientes

### Novo
- **Base comum:** `static/utils.js` (`SGVC.utils`: `escapeHtml`, `formatMoney`, `formatCurrency`, `debounce`,
  `normalizeError`) e cliente de API único em `static/api-client.js` (`SGVC.api`: `get/post/put/patch/del`,
  opções `query` e `messageFromServer`). Todas as telas passaram a usá-lo (timeout e CSRF em todas as chamadas).
- **Tela de clientes modular:** `clients.js` (2.807 linhas) virou bootstrap de 47 linhas e módulos ES em
  `web/public/clients/` (`constants`, `dom`, `state`, `core`, `validators`, `formatters`, `lookups`, `list`,
  `form`, `form-submit`, `export`). O estado mutável fica em `state`; comportamento inalterado.

### Corrigido
- Specs Cypress `client-edit` e `network-timeout-fallback` estabilizados (espera da mensagem antes do `cy.tick`;
  timeout/delay com margem maior).
- Removidas declarações duplicadas em `clients.js` (`buildUrl`, `setFieldError`, `clearFieldError`).

## 2026-11-13 — Robustez da API: transações, validação e devolução de estoque

### Novo
- **Transações:** criar, editar e cancelar venda são "tudo ou nada" (baixa de produtos, venda e baixa
  de insumos na mesma transação). Baixa atômica por UPDATE condicionado ao saldo: vendas simultâneas
  não vendem o mesmo estoque duas vezes (antes havia overselling).
- **Devolução de estoque de produtos:** cancelar a venda ou reduzir itens ao editá-la devolve a
  quantidade ao produto. Vale só para produtos que entram no critério de controle (`stock <= 5`);
  o que foi baixado fica registrado em `sale_product_stock`, então cancelar duas vezes não devolve em
  duplicidade e editar acima do saldo responde 422 mantendo o estado anterior. Vendas anteriores a esta
  versão não têm registro e não recebem devolução.
- **Validação genérica de entrada** (`validate`, corpo JSON obrigatório, query aninhada recusada,
  teto de paginação).

### Ajustado
- Banco unificado em `api/src/db/schema.sql` + `npm run db:init` / `db:reset` / `db:reset:test`
  (pasta `api/migrations` removida).
- CORS extraído para `config/cors.js`; rate limit sem try/catch silencioso.

### Testes
- `US012-atomicidade` (concorrência), `US013-validacao` e `US014-devolucao-estoque`.
  API: 342 passando; Cypress: 271 passando.

## 2026-11-12 — Encomendas (US011)

### Novo
- Tela **Encomendas**: cliente (cadastrado ou só o nome), telefone, data e hora de entrega, itens com
  preço do produto ou combinado, sinal (valor e forma de pagamento) e observações.
- **Agenda da semana** agrupada por dia, com total do dia, link de WhatsApp e status
  (a fazer → pronta → entregue, ou cancelada).
- **Entregar vira venda:** escolhe a forma de pagamento do restante e a encomenda é registrada como
  venda, entrando no faturamento, no CMV e na baixa dos insumos (uma vez só, na entrega).
- **Falta de insumo:** aviso com o que as encomendas em aberto da semana vão consumir comparado com o
  estoque (ex.: "faltam 100 g · precisa 400 g, tem 300 g").
- Card **Próximas entregas** no painel (próximos 7 dias).
- API `/api/orders` (lista com `from`, `to`, `status`), `/api/orders/needs`, `/api/orders/{id}` e
  `/api/orders/{id}/status`. Migration 007.

### Ajustado
- Menu mais compacto em telas médias e menu recolhido até 1000 px (com a área nova ele quebrava linha).

### Testes
- `US011-orders.test.js` (9 testes; API com 319 passando) e `encomendas.cy.js` (fluxo completo pela
  tela, backend real).

## 2026-11-12 — Estoque de insumos (US010)

### Novo
- **Estoque por insumo** na unidade base (g, ml ou un), mostrado em kg/l quando passa de 1.000.
  Só é controlado nos insumos com estoque informado; os outros seguem como antes.
- **Baixa automática pela venda:** cada produto com ficha técnica desconta
  (quantidade do item na ficha ÷ rendimento) × quantidade vendida de cada insumo ligado.
  Funciona com a ficha ligada pelo produto (`ficha_tecnica_id`) ou pela ficha (`link_product_id`).
- **Cancelar a venda devolve os insumos** (sem devolver em dobro se cancelar de novo);
  editar os itens refaz a baixa.
- **Entrada de compra:** soma ao estoque e, com o valor pago, atualiza o preço do insumo,
  o que recalcula as fichas e o CMV dos produtos.
- **Contagem** (ajuste para o valor exato) e **estoque mínimo** com aviso de reposição:
  na tela de Insumos (faixa no topo e selo "Repor"), no painel (card "Insumos para repor")
  e na mensagem da venda que fez o insumo chegar ao mínimo.
- Histórico de movimentações (compra, venda, venda cancelada, contagem) com o saldo após cada uma.
- API: `/api/ingredients/low-stock`, `/api/ingredients/{id}/stock/purchases|adjust|min|movements`
  e `DELETE /api/ingredients/{id}/stock`. Migration 006.

### Testes
- `US010-stock.test.js` (12 testes; API com 310 passando) e `estoque-insumos.cy.js`
  (fluxo pela tela contra o backend real).

## 2026-11-12 — Suíte Cypress verde e correções achadas por ela

### Corrigido (telas)
- **Ficha técnica (edição):** um clique em "Salvar" disparava até 3 PUTs; um deles mandava o
  percentual de gastos extras como valor em R$ (10% virava R$ 10) e zerava o lucro fixo. O que ficava
  gravado dependia de qual terminava por último. Ficou só um tratador, o correto.
- **Excluir cliente e excluir ficha técnica** mandavam o DELETE duas vezes (dois tratadores no botão).
- **Cadastro de produto:** havia um segundo tratador de envio, mais frouxo, que podia passar por cima
  da validação e mandava `ficha_tecnica_id` (campo ignorado pela API na criação).
- **Busca de CEP e exportação de clientes** sempre respondiam "Sessão inválida" desde a mudança para
  login por cookie (exigiam um token que não existe mais no navegador).
- **Cadastro e troca de senha** aceitavam senha fraca que a API recusa; agora a regra é a mesma da API
  (8+ caracteres com maiúscula, minúscula, número e caractere especial). O indicador de força segue a
  mesma regra.
- **Login:** "Esqueci minha senha" ganhou link e janela (o código existia, a tela não); "Credenciais
  inválidas" vira "E-mail ou senha incorretos"; a tela não rouba mais o foco de quem já digita no
  cadastro; o botão de mostrar senha anunciava o estado invertido (acessibilidade).
- **Clientes:** valores com separador de milhar (R$ 2.100,00); observações liberam o botão de salvar;
  trocar a UF limpa a cidade do outro estado; acentos em "Próximos N dias" e mensagens de UF.
- **Cadastro (janela):** fechar descarta o que foi digitado.
- **Fichas:** "Gastos extras (15%)" em vez de "(15,00%)"; aviso de limite sem texto duplicado.

### Segurança (API)
- **CORS:** fora de produção qualquer origem era aceita com cookies. Agora vale só localhost e
  `ALLOWED_ORIGINS` (produção continua exigindo a lista). Testes REG-016/017.

### Testes
- Specs Cypress atualizadas para a sessão por cookie (stubs de `/api/auth/me`, resposta neutra para
  chamadas sem stub). Specs de produtos, vendas e perfil reescritas para o layout atual;
  `fluxo-completo.cy.js` virou um fluxo real e curto (antes tentava a senha errada e bloqueava o admin).
- Job `e2e-tests` na CI. API: 298 testes passando.

## 2026-11-12 — Forma de pagamento e alerta de margem (US009)

### Novo
- **Forma de pagamento da venda** (Pix, dinheiro, crédito, débito, outro) no cadastro e na edição,
  exibida nos detalhes. Aceita também nomes em português (`débito`, `dinheiro`). Migration 005.
- Relatório **Faturamento por forma de pagamento** (`GET /api/reports/payment-methods`, mesmos filtros
  de período do faturamento, sem vendas canceladas) com total, quantidade e participação.
- Card **Margem dos produtos** no painel: lista produtos vendidos abaixo do custo e com margem bruta
  abaixo de 30% (`LOW_MARGIN_THRESHOLD`). Vem em `pricingAlerts` no `/api/analytics/overview`.

### Corrigido
- A forma de pagamento era validada pela API e descartada: nunca era gravada.

### Testes
- `US009-margem-pagamento.test.js` (8 testes); suíte da API com 296 passando.

## 2026-11-12 — Cadastro único de insumos (US008)

### Novo
- Tela **Insumos** (`ingredients.html`) e API `/api/ingredients`: preço e embalagem de cada
  ingrediente em um lugar só, com custo por 100 g/ml ou por unidade e em quantas fichas é usado.
- Itens da ficha técnica podem ser ligados a um insumo (`ingredientId`); a ficha sugere os insumos
  cadastrados e preenche embalagem e preço automaticamente.
- Ao mudar o preço de um insumo, **todas as fichas que o usam são recalculadas** e o custo (CMV) dos
  produtos vinculados é atualizado. Fichas com problema são informadas sem bloquear as demais.
- Histórico de preços dos insumos (`ingredient_price_history`), base para acompanhar a variação do CMV.

### Corrigido
- **Precisão do custo**: o custo por grama/ml era arredondado para centavos antes de multiplicar
  (ex.: farinha a R$ 6,50/kg — 500 g custavam R$ 5,00 em vez de R$ 3,25).
- **Arredondamento**: valores como R$ 0,575 viravam R$ 0,57 (agora meio centavo arredonda para cima).
- **Margem da ficha não era gravada**: editar a ficha (mesmo só a descrição) zerava a margem e o preço
  sugerido caía para o custo. Agora a margem fica salva (`recipes.margin`).
- **CSRF nas telas**: 9 telas gravavam sem o header `X-CSRF-Token` e o servidor recusava (403)
  cadastros, edições e o "Sair". O `api-client.js` inclui o token em toda gravação para a API.

### Testes
- `US008-ingredients.test.js` (15 testes); suíte da API com 288 passando.
- Limite global de requisições alto no ambiente de testes (`GLOBAL_RATE_LIMIT_MAX`).

## 2026-11-12 — Sessões persistentes

- Sessões de login gravadas no PostgreSQL (`auth_sessions`, migration 003) com cache em memória.
  Antes ficavam só em memória: cada reinício ou deploy da API deslogava todos os usuários.
- Refresh token de uso único também após reinício; limpeza automática de sessões expiradas.
- Testes REG-013 a REG-015 simulam o reinício da API.

## 2026-11-12 — Revisão de layout e telas

Revisão visual de todas as telas (desktop 1366px e celular 390px) com dados de demonstração.

### Bugs corrigidos (frontend)
- **8 telas inacessíveis**: Produtos, Fichas, Vendas, Vínculos, Relatórios, Simulação, Perfil e
  Monitoramento não carregavam o `api-client.js` e jogavam o usuário de volta para o login.
- **Datas um dia antes**: vendas e datas de nascimento eram exibidas no dia anterior (fuso UTC-3);
  depois das 21h, a data padrão da nova venda já era a de amanhã.
- **Lista de vendas** mostrava "-" no cliente quando a venda era de um cliente cadastrado.
- **Relatórios** abriam zerados ("Sem filtro" descartava todas as vendas).
- **Dashboard**: insight de faturamento ficava em "Carregando..." para sempre; cabeçalho mostrava
  "Usuário" em vez do nome.
- Elementos com `hidden` apareciam (ex.: aviso amarelo vazio no código de barras).
- Login no celular com marca e formulário espremidos lado a lado.

### Layout e textos
- Rodapé deixou de ficar fixo por cima do conteúdo.
- Login: formulário centralizado na área branca e lista de benefícios no lado azul.
- Títulos do relatório estavam quase invisíveis (texto claro sobre fundo branco).
- ~110 textos corrigidos (acentos, caracteres corrompidos como "VocÃª", jargão técnico como
  "comportamento atual"); percentuais com vírgula (65,4%).
- Vínculos: removida a fileira de indicadores repetidos.
- Celular: grupos de campos e botões quebram linha em vez de estourar a tela.
- Acessibilidade: rótulos em 15 campos que não tinham.
- Ficha técnica: atalho "Aviamentos" (termo de costura) trocado por "Recheio".

### Melhorias
- **Menu de navegação** em todas as telas logadas (antes só dava para navegar voltando ao dashboard).
- **Dashboard com CMV e lucro bruto** do período, além do faturamento.
- `api/src/config/loadEnv.js`: carregamento do `.env` centralizado; `npm run db:seed:users` e os
  scripts de migração não carregavam o `.env` e nunca funcionavam.
- Removidos `web/public/styles.css` e `web/public/static/app.js` (nunca eram servidos).

### Testes
- API: 270 passando, 0 falhando (novos REG-011 e REG-012).
- E2E (Cypress): sem regressões em relação à versão anterior. A suíte já tinha muitas falhas antigas
  (testes escritos para o modelo antigo de sessão em `sessionStorage`); ver docs/TESTES.md.

## 2026-11-11 — Varredura, limpeza e correções

### Estrutura do repositório
- A versão atual (antiga pasta `gestao-vendas-clientes-api-V1/gestao-vendas-clientes-api-V1`) passou a
  ser a raiz do projeto. Removidas a V1 antiga, a pasta intermediária, o backup `.zip` (515 MB) e o
  `postgres_15.tar`. O histórico git foi preservado (a V2 já continha todos os commits da V1).
- 76 relatórios `.md` soltos consolidados em `README.md`, `docs/INSTALACAO.md` e `docs/TESTES.md`.
- Removidos temporários e duplicados: `Tmp/`, logs, `cookies.txt`, `.bak`, arquivos de lock do Word,
  `.docx` duplicados, `web/static/` e `api/src/routes/auth.routes.js` (código morto), scripts `.bat`.
- `.gitignore` refeito: `web/` e `cypress/` passam a ser versionados (antes eram ignorados).

### Correções de bugs (API)
- **Rate limit global** usava 5 requisições/minuto por IP em produção para a API inteira → 300/min.
- **Vazamento de dados**: `/api/sales/summary` e `/api/analytics/timeseries` somavam vendas de todos
  os usuários.
- **Faturamento/dashboard** contavam vendas canceladas.
- **Ficha técnica**: alterar ou criar ficha vinculada não atualizava o custo usado no CMV da venda
  (`purchase_price`); remover o vínculo não limpava os campos do produto.
- **Login**: senha errada aparecia como "Sua sessão expirou"; o bloqueio após N tentativas
  devolvia 401 em vez de 423.
- **POST sem corpo** (logout, cancelar venda) era rejeitado com 415.
- **CSRF** bloqueava clientes com `Authorization: Bearer` (Swagger, Postman, testes); agora só se
  aplica a requisições com cookie de sessão.
- **ID em formato inválido** gerava 500 → 404.
- **Dashboard**: `lastSaleAt` mostrava a venda mais antiga.
- Mensagens de erro unificadas (catálogo `pt-BR.json` alinhado com `errorMessages.js`); validação do
  login no mesmo formato de erro do restante da API.
- Removido log temporário que exibia usuário e tamanho da senha do SMTP.

### Melhorias
- `getSaleById` / `getRecipeById` buscam direto por id (antes carregavam a tabela inteira).
- Respostas de venda com formato único (`customerName`/`clienteNome`, `statusVenda`); produtos expõem
  `fichaTecnicaId`; fichas expõem `linkProductId`/`ownerId`.
- Testes usam `api/.env.test` e nunca o banco de desenvolvimento.
- Seed de usuários grava senhas com bcrypt.
- CI com PostgreSQL 15 e Node 20, aplicando schema e seed antes dos testes.

### Testes
- Antes: a suíte quebrava antes de terminar (testes US999 em sintaxe Jest).
- Depois: **268 passando, 0 falhando** (35 pendentes). Novo `US998-regressoes.test.js` cobrindo os
  bugs acima. Testes alinhados às mensagens atuais da API.
