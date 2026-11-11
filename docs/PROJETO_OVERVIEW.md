
### Estrutura de Pastas

- **api/**: Backend Node.js/Express, rotas REST, controllers, middlewares, serviços, DB e Swagger. — Manter
- **web/**: Frontend estático (HTML/CSS/JS) servido por `web/server.js` ou estático. — Manter
- **docs/**: Documentação do projeto (deploy, overview, etc.). — Manter
- **cypress/**: Testes E2E (fluxos de auth, listas, formulários, etc.). — Manter
- **scripts/**: Scripts PowerShell/Node para setup local/CI e utilidades. — Manter
- **Tmp/**: Artefatos temporários usados em análise/depuração. — Remover (seguro)
- **assets/**: Imagens e mídias (ex.: banner). — Manter (opcional em produção)
- **backup/**: Orientações/arquivos de backup. — Manter (ou mover para armazenamento externo)
- **Documentacao/**, **Documentação/**: Relatórios e análises históricas. — Manter (consolidar em `docs/` se desejar)
- **node_modules/** (na raiz, `api/` e `web/`): Dependências. — Manter

### Arquivos na Raiz

- `package.json`, `package-lock.json`: Scripts/dep. raiz (suporte a automações). — Manter
- `docker-compose.yml`, `docker-compose.local.yml`, `docker-compose.hmg.yml`: Orquestração Docker por ambiente. — Manter
- `cypress.config.js`, `cypress.log`, `cypress-client-edit.log`: Config/logs de testes. — Manter (logs: opcionais no VCS)
- `README.md`, `COMO_INICIAR.md`, `INICIAR_APLICACAO.md`, `GUIA-RAPIDO-INSTALACAO.md`, etc.: Guias operacionais. — Manter
- Arquivos de diagnóstico/relatórios (ex.: `RESUMO_*`, `RELATORIO_*`, `VALIDACAO_*`, `LOGIN_FUNCIONANDO*.md`, `ANALISE_*`): Histórico de validações. — Manter (pode mover para `docs/`)
- `cookies.txt`, `LEIA-ME-PRIMEIRO.txt`: Auxiliares. — Opcional (remover se obsoleto)
- `EXECUTAR-ESTE-PRIMEIRO.bat`, `INSTALAR-*.bat`: Atalhos Windows. — Manter se usados

### Backend `api/`

- Bootstrap
  - `src/app.js`: Configura Express, CORS, segurança, CSRF (double-submit cookie), i18n, rate-limit global, Swagger UI (condicional), `/metrics`, `/health` e monta `/api`.
  - `src/server.js`: Sobe servidor e inicializa DB; tolerante a ausência de DB em dev.
- Banco de Dados
  - `src/db/`: `index.js`, `repository.js`, `schema.sql`. Pool e inicialização condicional por `DATABASE_URL`. Em produção: exige DB; em dev, continua “sem banco” com limitações.
- Middlewares
  - `authMiddleware.js` e `authMiddlewareStrict.js`: Autenticação (cookie HttpOnly) e variantes “strict”.
  - `csrf.js`: Garante cookie CSRF e valida header `X-CSRF-Token` em mutações.
  - `rateLimit*.js`, `loginValidator.js`, `securityHeaders.js`, `requestLogger.js`, `metrics.js`, `auditLogger.js`, `validateContentType.js`, `errorHandler.js`.
- Rotas montadas em `/api` (`src/routes/index.js`):
  - `/auth` (`authRoutes.js`):
    - GET `/csrf`
    - POST `/login` (rate limit + validação + blockUser)
    - POST `/refresh`
    - POST `/logout` (auth)
    - GET `/me` (auth), PUT `/me` (auth)
    - GET `/validate` (auth)
    - GET `/verify-email`
    - POST `/forgot` (rate limit)
    - POST `/reset` (rate limit)
    - POST `/change-password` (auth + rate limit)
    - POST `/register` (rate limit)
  - `/customers` (auth) — CRUD: GET `/`, POST `/`, GET `/:id`, PUT `/:id`, DELETE `/:id`
  - `/products` (authStrict) — CRUD + vínculos:
    - GET `/`, POST `/`, GET `/:id`, PUT `/:id`, DELETE `/:id`
    - POST `/:id/vincular-ficha`, DELETE `/:id/remover-ficha`, GET `/:id/ficha-tecnica`
  - `/recipes` (authStrict) — CRUD + extras:
    - GET `/`, POST `/`, POST `/calculate`, GET `/:id`, PUT `/:id`, DELETE `/:id`
    - GET `/:id/export`
  - `/sales` (auth): GET `/`, GET `/summary`, POST `/`, GET `/:id`, PUT `/:id`, POST `/:id/cancel`, GET `/:id/audit`
  - `/reports` (authStrict): GET `/revenue`, GET `/revenue/export`, GET `/financial`
  - `/analytics` (auth): GET `/overview`, GET `/timeseries`
  - `/simulacao` (authStrict): POST `/preco`, POST `/preco/rapida`, GET `/preco/:id`
  - `/cep` (auth): (consulta CEP) — ver `cepRoutes.js`
  - `/cnpj` (auth): GET `/:cnpj`
  - `/holidays` (auth): GET `/:key`
  - `/barcodes` (auth): GET `/:code`
  - `/export` (auth): endpoints de exportação — ver `exportRoutes.js`
  - `/errors/analytics` (auth): `frequent`, `timeline`, `endpoints`, `recent`, `statistics`
- Controllers
  - `authController.js`, `customersController.js`, `productsController.js`, `recipesController.js`, `salesController.js`, `reportsController.js`, `analyticsController.js`, `priceSimulationController.js`, `exportController.js`, `errorAnalyticsController.js`.

### Frontend `web/public/`

- Páginas principais (HTML → JS principal → Endpoints chamados)
  - `index.html` → `app.js`
    - Auth: `/api/auth/login`, `/api/auth/forgot`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/register`, `/api/auth/csrf`
  - `dashboard.html` → `dashboard.js`
    - `/api/auth/me`, `/api/analytics/overview`, `/api/reports/financial`, `/api/customers`, `/api/products`
  - `clients.html` → `clients.js`
    - `/api/customers` (lista/paginação/CRUD), `/api/export/customers`, `/api/cep/{cep}`, `/api/cnpj/{cnpj}`
  - `client-edit.html` → `client-edit.js`
    - `/api/customers/{id}` (GET/PUT/DELETE), `/api/cnpj/{cnpj}`
  - `products.html` → `products.js`
    - `/api/products` (lista/POST), `/api/recipes` (referências)
  - `product-edit.html` → `product-edit.js`
    - `/api/products/{id}` (GET/PUT/DELETE), `/api/products/{id}/vincular-ficha`, `/api/products/{id}/remover-ficha`, `/api/products/{id}/ficha-tecnica`, `/api/recipes`
  - `recipes.html` → `recipes.js`
    - `/api/recipes` (GET/POST), `/api/recipes/{id}/export`
  - `recipe-edit.html` → `recipe-edit.js`
    - `/api/recipes/{id}` (GET/PUT/DELETE)
  - `sales.html` → `sales.js`
    - `/api/sales`, `/api/sales/summary`, `/api/sales/{id}` (GET/PUT), `/api/sales/{id}/cancel`, `/api/products`, `/api/customers`, `/api/holidays/{key}`, `/api/barcodes/{code}`
  - `reports.html` → `reports.js`
    - `/api/reports/revenue`, `/api/reports/revenue/export`, `/api/reports/financial`
  - `profile.html` → `profile.js`
    - `/api/auth/me` (GET/PUT), `/api/auth/change-password`, `/api/auth/logout`
  - `vinculos.html` → `vinculos.js`
    - `/api/products`, `/api/recipes`, `/api/products/{id}/vincular-ficha`, `/api/products/{id}/remover-ficha`
  - `simulacao.html` → `simulacao.js`
    - `/api/auth/csrf`, `/api/recipes`, `/api/simulacao/preco`
  - `error-monitoring.html` → `static/error-monitoring.js`
    - `/api/auth/csrf`, `/api/errors/analytics/*`, `/api/auth/logout`
  - `reset-password.html` → `static/reset-password.js`
    - `/api/auth/reset`

- Bibliotecas/utilitários front
  - `public/static/`: `api-client.js`, `error-handler.js` (normalização de erros), `sgvc-utils.js`, `pagination-cache.js`, `infinite-scroll.js`, `skeleton-loading.js`, `sgvc-unsaved-changes.js`, `reset-password.js`, `error-monitoring.js`.
  - `vendor/`: `fuse.min.js`, `jspdf.umd.min.js`.

### Fluxo de Autenticação

1. Na tela de login (`index.html`/`app.js`):
   - Front usa cookie HttpOnly; não armazena token em `localStorage`.
   - Antes de mutações, garante cookie CSRF via GET `/api/auth/csrf` e envia `X-CSRF-Token`.
   - Login via POST `/api/auth/login` com e-mail/senha; em sucesso, redireciona para `dashboard.html`.
2. Validação de sessão:
   - Páginas privadas consultam `/api/auth/me`. 401/403 redireciona para `/`.
3. Logout:
   - POST `/api/auth/logout`. Front limpa estado local e redireciona para `/`.
4. Recuperação de senha:
   - POST `/api/auth/forgot` para solicitar e-mail; redefinição em `reset-password.html` com `/api/auth/reset`.
5. Registro (opcional):
   - POST `/api/auth/register` seguido de login automático.

### Status Atual

- ✅ Funciona: Fluxos de login/logout, validação de sessão por cookie HttpOnly + CSRF, navegação entre páginas, dashboards com fallbacks, CRUDs principais (clientes, produtos, receitas, vendas), relatórios financeiros e exportações, vínculos produto↔ficha técnica, simulação de preço, monitoramento de erros.
- ⚠️ Atenção: Em desenvolvimento, a API pode subir “sem banco de dados” (ver logs). Algumas rotas dependem de `DATABASE_URL` configurado para resposta completa.
- ✅ Testes E2E (Cypress) abrangem auth e principais telas.

### Mapa Completo — Página → JS → Endpoints

- index.html → app.js → `/api/auth/login`, `/api/auth/forgot`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/register`, `/api/auth/csrf`
- dashboard.html → dashboard.js → `/api/auth/me`, `/api/analytics/overview`, `/api/reports/financial`, `/api/customers`, `/api/products`
- clients.html → clients.js → `/api/customers`, `/api/export/customers`, `/api/cep/{cep}`, `/api/cnpj/{cnpj}` (+ IBGE/BrasilAPI externos)
- client-edit.html → client-edit.js → `/api/customers/{id}` (GET/PUT/DELETE), `/api/cnpj/{cnpj}`
- products.html → products.js → `/api/products`, `/api/recipes`
- product-edit.html → product-edit.js → `/api/products/{id}` (GET/PUT/DELETE), `/api/products/{id}/vincular-ficha`, `/api/products/{id}/remover-ficha`, `/api/products/{id}/ficha-tecnica`, `/api/recipes`
- recipes.html → recipes.js → `/api/recipes` (GET/POST), `/api/recipes/{id}/export`
- recipe-edit.html → recipe-edit.js → `/api/recipes/{id}` (GET/PUT/DELETE)`
- sales.html → sales.js → `/api/sales`, `/api/sales/summary`, `/api/sales/{id}` (GET/PUT), `/api/sales/{id}/cancel`, `/api/products`, `/api/customers`, `/api/holidays/{key}`, `/api/barcodes/{code}`
- reports.html → reports.js → `/api/reports/revenue`, `/api/reports/revenue/export`, `/api/reports/financial`
- profile.html → profile.js → `/api/auth/me` (GET/PUT), `/api/auth/change-password`, `/api/auth/logout`
- vinculos.html → vinculos.js → `/api/products`, `/api/recipes`, `/api/products/{id}/vincular-ficha`, `/api/products/{id}/remover-ficha`
- simulacao.html → simulacao.js → `/api/auth/csrf`, `/api/recipes`, `/api/simulacao/preco`
- error-monitoring.html → static/error-monitoring.js → `/api/errors/analytics/*`, `/api/auth/logout`
- reset-password.html → static/reset-password.js → `/api/auth/reset`

### Limpeza Segura (sem risco funcional)

- `Tmp/` (arquivos temporários de análise).
- Logs gerados localmente (`cypress.log`, `cypress-client-edit.log`) — manter fora do VCS ou limpar periodicamente.
- Consolidar relatórios soltos na raiz (`RELATORIO_*`, `RESUMO_*`, `VALIDACAO_*`, `ANALISE_*`, etc.) para `docs/`.
- Remover `cookies.txt` se não estiver em uso nos scripts/tests.

Observação: Antes de remover, verifique referências em documentação/scripts CI/CD.

### Melhorias

- 🔴 Curto prazo
  - Consolidar documentação dispersa da raiz em `docs/` (índice único).
  - Garantir variáveis `ALLOWED_ORIGINS`, `DATABASE_URL` e `ENABLE_SWAGGER_UI` coerentes por ambiente.
  - Padronizar chamadas front para usar um único cliente (`api-client.js`) com timeouts/erros consistentes.
  - Habilitar CSP estrita (ajustar `securityHeaders.js`) e revisar `vendor/` externo.

- 🟡 Médio prazo
  - Testes de integração no backend para rotas críticas (auth, vendas, relatórios).
  - Serviço de cache para listas grandes (ex.: produtos/clientes) com ETags/If-None-Match.
  - Paginação consistente em todas as listas e exports com throttling server-side.
  - Observabilidade: unificar métricas e logs estruturados com correlação (request-id).

- 🟢 Longo prazo
  - Migração progressiva para framework front componentizado (React/Vue/Svelte) mantendo rotas REST.
  - RBAC/ABAC no backend (autorização por perfis/políticas além da autenticação).
  - Background jobs (fila) para exports pesados e agregações analíticas.
  - Feature flags para toggles de funcionalidades em produção.

---

Última revisão: automática com base no código em `api/src` e `web/public` nesta branch.
 
 
 ### Funcionalidades Detalhadas
 
 - Autenticação e Sessão
   - Login com validação de campos, mensagens amigáveis e bloqueio progressivo após tentativas (rate limit).
   - Cookie HttpOnly para sessão; sem armazenamento de token no browser.
   - Proteção CSRF (double-submit cookie + header `X-CSRF-Token`) em mutações.
   - Lembrar e-mail (opcional) no login.
   - Registro de usuário com login automático pós-sucesso.
   - Recuperação de senha (solicitação + redefinição com validação forte de senha).
   - Atualização de perfil e troca de senha autenticadas.
   - Verificação contínua da sessão (`/api/auth/me`) e redirecionamento ao expirar.
   - Logout seguro em qualquer página privada.
 
 - Dashboard
   - Exibe métricas: clientes, vendas, faturamento, produtos, receitas, produtos vinculados, margem.
   - Gráficos (Chart.js) com tratamento de erros silencioso e fallback.
   - Períodos: mês/trim/ano atuais; cálculo de período anterior para variação.
   - Atalhos para páginas de gestão (clientes, vendas, produtos, receitas, vínculos, simulação).
   - Alertas inteligentes:
     - Clientes inativos (>30 dias).
     - Produtos sem ficha técnica.
     - Variação de faturamento em relação ao período anterior.
   - Resiliência a falhas: fallback de métricas por chamadas individuais (clientes/produtos/receitas/financeiro).
 
 - Clientes
   - Listagem paginada com tamanho configurável.
   - Criação/edição/remoção de clientes.
   - Enriquecimento de dados:
     - Consulta CEP (`/api/cep/{cep}`).
     - Consulta CNPJ (`/api/cnpj/{cnpj}`) e preenchimento automático.
     - Apoio a IBGE/BrasilAPI (dados auxiliares de estados/municípios).
   - Exportação de clientes (`/api/export/customers`) com geração de arquivo.
   - Formulário com validações, mensagens de erro claras e acessibilidade básica.
 
 - Produtos
   - Listagem, criação e edição de produtos.
   - Integração com receitas (ficha técnica).
   - Vínculos:
     - Associar ficha técnica ao produto.
     - Remover associação.
     - Obter ficha técnica do produto.
   - Busca e cache local para melhorar UX em listas.
 
 - Receitas (Fichas Técnicas)
   - Listar, criar, editar e remover receitas.
   - Cálculo de receita (`/api/recipes/calculate`).
   - Exportar receita individual (`/api/recipes/{id}/export`) em diferentes formatos.
   - Edição avançada com rascunho local e atualização parcial.
 
 - Vendas
   - Listagem e criação/edição de vendas.
   - Resumo de vendas ativas (total).
   - Cancelamento de venda (`/api/sales/{id}/cancel`).
   - Apoios:
     - Busca por código de barras de produtos.
     - Carregamento de feriados por chave (impacto em operações).
     - Autocomplete/normalização de cliente.
   - Auditoria por venda (`/api/sales/{id}/audit`).
 
 - Relatórios
   - Relatório de faturamento (`/api/reports/revenue`) com breakdown (total/por período).
   - Relatório financeiro (`/api/reports/financial`): receita, CMV, lucro, margem, ticket médio e contagem.
   - Filtros de período: dia/semana/mês/ano ou intervalo customizado (range).
   - Exportação (`/api/reports/revenue/export`) em CSV/Excel/PDF com nomeação de arquivo e content-disposition.
   - Validação de consistência entre módulos (aviso discreto quando divergirem totals).
   - Persistência temporária de filtros (sessionStorage).
 
 - Simulação de Preços
   - Carrega receitas e simula preço alvo/margem (`/api/simulacao/preco`).
   - Uso de CSRF seguro para mutações.
 
 - Monitoramento de Erros
   - Estatísticas agregadas (totais, erros únicos, usuários afetados, % 5xx).
   - Timeline de erros (gráfico) por período.
   - Endpoints com mais erros (método, path, contagens).
   - Erros recentes com detalhes (status, endpoint, mensagem, horário).
   - Seleção de período rápido (24h, 7d, 30d) e atualização on-demand.
 
 - Perfil do Usuário
   - Visualização/edição de dados do usuário autenticado.
   - Troca de senha com feedback detalhado.
   - Logout direto pela página.
 
 - Infra/Segurança/Operação
   - Rate limiting global e específico por rota sensível (login, registro, reset, export).
   - CSRF habilitado em toda a aplicação para mutações.
   - Security headers (CSP recomendada para endurecimento adicional).
   - CORS: permissivo em dev; whitelist em produção via `ALLOWED_ORIGINS`.
   - Métricas Prometheus em `/metrics` (controladas por IP em prod).
   - Health check `/health` com status de DB quando configurado.
   - Swagger UI condicional (`/api-docs`), com toggle por ambiente.
   - i18n carregado via `locales/` e middleware `i18nMiddleware`.
   - Auditoria e métricas de requisições; logs estruturados.
   - Execução tolerante em dev sem DB (com limitações de features dependentes de persistência).
 
 - Acessibilidade e UX
   - Estados de carregamento, tags de status, foco e mensagens descrevendo causas (ex.: senha expirada, bloqueio).
   - Indicações visuais de campos válidos/inválidos e dicas de preenchimento.
   - Feedback imediato ao digitar (força de senha, e-mail válido, confirmação de senha).
   - Controles com debounce para evitar excesso de requisições.
   - Mensagens normalizadas de erro (frontend e `error-handler`).
 
 - Utilitários Front
   - Cliente central `static/api-client.js` expondo `window.apiRequest`, `window.apiGetMe`, `window.apiGetCsrfToken`.
   - Cache de paginação, scroll infinito, skeleton loading, aviso de alterações não salvas.
   - Geração de PDFs/exports (via `vendor/jspdf.umd.min.js` e endpoints backend).
 
 - Testes (Cypress)
   - Cobertura de fluxos principais: login válido/inválido, logout, redirecionamento 401, listas, formulários, perfil, vendas, receitas, products, dashboard, regressão, segurança, sessão, acessibilidade básica.
 
 - Serviços Externos
   - IBGE e BrasilAPI (CNPJ) para enriquecimento de dados de clientes.
 
 - Limitações/Dependências
   - Em produção, exige `DATABASE_URL`. Em dev, alguns relatórios/consultas podem retornar vazios/fallback sem DB.
   - Para exportar e gráficos, dependem de bibliotecas no front e dados consolidados no back.

 
 ### Maturidade e Roadmap por Módulo
 
 - Autenticação e Sessão
   - ✅ Profissional: login/logout com cookie HttpOnly, CSRF, rate limit, forgot/reset, change-password, /me, validações no front.
   - 🟡 Melhorar: brute force por IP/faixa+usuário; HTTPS/HSTS; i18n completo; política de senha configurável.
   - ➕ Implementar: 2FA (TOTP/email), verificação de e-mail, RBAC/ABAC, SSO (OIDC) opcional.
 
 - Dashboard
   - ✅ Profissional: métricas, fallback, gráficos com tratamento de erro.
   - 🟡 Melhorar: cache/ETag; loading granular; testes de contrato das respostas.
   - ➕ Implementar: widgets configuráveis; comparação custom; alertas proativos (webhook/email).
 
 - Clientes
   - ✅ Profissional: CRUD, paginação, CEP/CNPJ enrichment, export.
   - 🟡 Melhorar: validações server-side (unicidade CPF/CNPJ/e-mail); normalização consistente.
   - ➕ Implementar: importação em massa; campos customizáveis; segmentação/tags.
 
 - Produtos
   - ✅ Profissional: CRUD, vínculo de ficha técnica, busca/caching.
   - 🟡 Melhorar: versionamento de ficha; concorrência (ETag/If-Match).
   - ➕ Implementar: variações/SKUs; unidade de medida padronizada; custo médio/última compra.
 
 - Receitas (Fichas Técnicas)
   - ✅ Profissional: CRUD, cálculo, export.
   - 🟡 Melhorar: consistência (ingredientes, perdas, rendimento); trilha de alterações.
   - ➕ Implementar: biblioteca de ingredientes; simulações “what‑if”; aprovações.
 
 - Vendas
   - ✅ Profissional: CRUD, cancelamento, barcode, feriados, auditoria.
   - 🟡 Melhorar: estados adicionais (devolução/estorno); idempotência em POST.
   - ➕ Implementar: meios de pagamento; integração fiscal (NFe/SAT); regras promocionais.
 
 - Relatórios
   - ✅ Profissional: revenue/financial, filtros, export CSV/Excel/PDF.
   - 🟡 Melhorar: paginação/stream para grandes volumes; cache por query; limites/quotas.
   - ➕ Implementar: relatórios custom; agendamento por e-mail; drill‑down.
 
 - Simulação de Preços
   - ✅ Profissional: simulação por receita, CSRF seguro.
   - 🟡 Melhorar: explicar fórmula/assunções no UI; auditoria.
   - ➕ Implementar: cenários salvos; sensibilidade por custo/taxa; APIs públicas.
 
 - Monitoramento de Erros
   - ✅ Profissional: estatísticas, timeline, endpoints, recentes.
   - 🟡 Melhorar: amostragem/anonymização; correlação com request‑id/usuário.
   - ➕ Implementar: alertas (Slack/Email); links para observabilidade externa.
 
 - Perfil do Usuário
   - ✅ Profissional: ver/editar, troca de senha, logout.
   - 🟡 Melhorar: histórico de sessões/dispositivos.
   - ➕ Implementar: avatar; preferências (tema, idioma, dashboards).
 
 - Infra/Segurança/Operação
   - ✅ Profissional: rate limit, CSRF, headers, CORS por ambiente, /metrics, /health, Swagger condicional, i18n, auditoria/logs.
   - 🟡 Melhorar: CSP estrita (nonces); secrets via vault; rotação de chaves; backups/migrations automatizados.
   - ➕ Implementar: feature flags; circuit breaker/retry; blue/green deploy; retenção de logs.
 
 - Acessibilidade e UX
   - ✅ Profissional: feedbacks, estados de erro/sucesso, debounce, mensagens normalizadas.
   - 🟡 Melhorar: navegação por teclado; ARIA audit; contraste.
   - ➕ Implementar: testes de acessibilidade automatizados no CI (axe-core).
 
 - Utilitários Front
   - ✅ Profissional: api-client central, cache, skeleton, unsaved‑changes, exports.
   - 🟡 Melhorar: unificar consumo via `api-client.js`; timeout/retry/backoff padronizados.
   - ➕ Implementar: telemetria de UX (web vitals) opcional.
 
 - Testes (Cypress)
   - ✅ Profissional: cenários críticos cobertos (auth, listas, formulários, etc.).
   - 🟡 Melhorar: dados determinísticos (fixtures/mocks); paralelismo; métricas de flakiness.
   - ➕ Implementar: contrato de API (OpenAPI/Schemathesis); testes de carga smoke.
 
 - Serviços Externos
   - ✅ Profissional: IBGE/BrasilAPI integrados para enrichment.
   - 🟡 Melhorar: cache com TTL; fallback quando indisponíveis; observabilidade dedicada.
   - ➕ Implementar: filas para enriquecimento assíncrono.