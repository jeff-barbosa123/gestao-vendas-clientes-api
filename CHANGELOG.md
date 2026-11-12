# Changelog

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
