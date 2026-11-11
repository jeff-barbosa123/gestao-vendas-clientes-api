# Changelog

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
