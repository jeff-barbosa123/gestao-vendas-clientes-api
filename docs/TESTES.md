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

Situação em 12/11/2026: **270 testes passando, 0 falhando, 35 pendentes** (`it.skip` — testes de
performance e cenários ainda não implementados).

### CI

`.github/workflows/ci.yml` sobe um PostgreSQL 15, aplica schema/migrations, cria os usuários e roda
`npm test` a cada push/PR em `main` e `dev`. O relatório mochawesome fica como artefato do job.

## Testes E2E (Cypress)

Specs em `cypress/e2e/` (login, clientes, produtos, fichas, vendas, dashboard, acessibilidade,
segurança, sessão e fluxo completo). Precisam da API (3000) e do frontend (4000) no ar.

```bash
npm run cypress:open          # modo interativo
npm run cypress:run           # headless
npm run cypress:run:fluxo-completo
npm run cypress:validate      # checa estrutura das specs
```

Situação em 12/11/2026: muitas specs falham desde antes desta revisão, porque foram escritas para o
modelo antigo de sessão (token em `sessionStorage`) e simulam só parte da API. Hoje a autenticação é
por cookie HttpOnly. Os testes de força de senha no cadastro são instáveis (alternam entre passar e
falhar). Atualizar a suíte E2E para o login por cookie é o próximo passo recomendado.

Mais detalhes em [CYPRESS_GUIA.md](CYPRESS_GUIA.md).
