# Testes — SGVC

## Testes de API (Mocha + Chai + Supertest)

Ficam em `api/test/integration/`, um arquivo por user story:

| Arquivo | Escopo |
|---------|--------|
| `US001-login.test.js` | Login, sessão, logout, bloqueio por tentativas |
| `US002-customers.test.js` / `US002-products.test.js` | Cadastro de clientes e produtos |
| `US003-sales*.test.js` | Vendas, estoque, cancelamento, CMV |
| `US004-revenue.test.js` | Faturamento por período |
| `US005-recipes.test.js` | Ficha técnica |
| `US006-price-simulation.test.js` | Simulação de preço |
| `US007-products-ficha.test.js` | Vínculo ficha técnica ↔ produto |
| `US008-ingredients.test.js` | Cadastro de insumos, recálculo automático, precisão de custo, margem |
| `US009-margem-pagamento.test.js` | Forma de pagamento (gravação, edição, relatório) e alertas de margem |
| `US010-stock.test.js` | Estoque de insumos: compra, baixa pela venda, cancelamento, mínimo e avisos |
| `US011-orders.test.js` | Encomendas: validação, agenda por período, status, entrega virando venda e falta de insumo |
| `US998-regressoes.test.js` | Regressões de bugs corrigidos (isolamento entre usuários, CSRF, dashboard...) |
| `US999-*.test.js` | Mensagens de erro e paginação |
| `docs-swagger.test.js` | Swagger |

### Banco de testes

Os testes **criam e alteram dados**. Use um banco separado do de desenvolvimento.

```bash
# banco (pode ser o mesmo container do ambiente local)
docker exec -it sgvc-postgres-local psql -U sgvc -c "CREATE DATABASE sgvc_test;"

# configuração
copy api\env.test.example api\.env.test      # ajuste DATABASE_URL se precisar

# schema + usuários de teste
cd api
set NODE_ENV=test&& node -e "require('./src/db').initDb().then(()=>process.exit(0))"
set NODE_ENV=test&& npm run db:seed:users
```

Com `NODE_ENV=test` a API carrega **somente** `api/.env.test` (nunca o `.env.local`).

### Executar

```bash
npm test                 # suíte completa + relatório HTML em api/mochawesome-report/
npm run us001            # só uma user story (us001 ... us007)
```

Como as specs funcionam:

- **API simulada (a maioria):** os testes simulam a sessão com `cy.seedSession()`, `cy.loginAsAdmin()`
  ou `cy.stubAuthenticated()`, que respondem `/api/auth/me` como logado (a sessão real é um cookie
  HttpOnly). Qualquer chamada `/api` sem stub específico recebe uma resposta neutra
  (`cypress/support/e2e.js`), então a tela não volta para o login no meio do teste.
  `cy.clearSession()` simula "deslogado" (401 em tudo).
- **Backend real:** `fluxo-completo.cy.js`, `estoque-insumos.cy.js` e `encomendas.cy.js` não usam stubs. Cada um cria o
  próprio usuário na hora (`cy.createRealUser`), então não depende do admin do seed nem deixa dados
  de teste na conta dele. Fazem login, cadastram insumo, produto e venda e conferem painel, relatório
  e estoque.
- Datas: specs que dependem de "hoje" (tags Novo/Antigo, aniversariantes) congelam a data com `cy.clock`.

A CI roda a suíte inteira no job `e2e-tests`, depois dos testes de API.

Mais detalhes em [CYPRESS_GUIA.md](CYPRESS_GUIA.md).
