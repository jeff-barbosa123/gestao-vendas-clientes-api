## Regras de Negócio e Validações — SGVC (Consolidado)

Este documento consolida as regras de negócio e validações implementadas no projeto, com referências aos pontos‑fonte no backend/frontend, mensagens/códigos de erro e sugestões de melhorias (“Poderia ter”). Serve como “fonte de verdade” funcional para evoluções.

Observação: Para detalhes de arquitetura geral, ver `docs/PROJETO_OVERVIEW.md`.

---

### Legenda de referências (exemplos)
- Backend:
  - `api/src/services/authService.js`
  - `api/src/services/customersService.js`
  - `api/src/services/productsService.js` (se aplicável)/controllers
  - `api/src/services/recipesService.js` (se aplicável)/controllers
  - `api/src/services/salesService.js`
  - `api/src/middleware/*.js` (auth, csrf, headers, content-type, rate limit, etc.)
  - `api/src/utils/errorMessages.js`
  - `api/src/db/schema.sql`
- Frontend:
  - `web/public/static/api-client.js`, `web/public/static/error-handler.js`
  - Telas JS (ex.: `web/public/clients.js`, `web/public/app.js`)

---

## 1) Autenticação e Conta

Existe (implementado):
- Login por e‑mail/senha com cookie HttpOnly e CSRF (double-submit).
- Rate limit e bloqueio progressivo por tentativas falhas.
- Recuperação de senha (forgot/reset) com token expira e uso único.
- Registro de usuário com validação de e‑mail e força de senha.
- Atualização de perfil, troca de senha autenticadas.
- E-mails transacionais: boas-vindas, confirmação, reset, senha alterada (com fallback Ethereal em dev).

Validações principais:
- E‑mail válido e normalizado (regex estrito).
- Senha: tamanho mínimo, máximo e força (maiúscula, minúscula, número, especial) em registro/reset/change.
- Login: para compatibilidade histórica, não exige força; apenas não vazia e limites de tamanho.
- Bloqueio temporário após falhas; tratamento de usuário bloqueado.
- Content-Type JSON obrigatório em rotas sensíveis.

Mensagens/Códigos (amostras):
- 400/`INVALID_EMAIL`, `PASSWORD_REQUIRED`, `BAD_REQUEST`
- 401/`UNAUTHORIZED`, 403/`FORBIDDEN`, 423/`ACCESS_BLOCKED`
- 409/`EMAIL_ALREADY_EXISTS`
- 422 em casos específicos

Poderia ter (sugestões):
- Gate de acesso por e‑mail verificado (bloquear login/recursos até confirmação).
- 2FA (TOTP) e/ou OTP por e‑mail; passwordless (link mágico).
- Políticas de senha configuráveis (histórico, expiração opcional).
- RBAC/ABAC (autorização por papéis/atributos) com razões de negação.
- Auditoria de sessão/dispositivos e encerramento remoto.

Referências:
- `api/src/services/authService.js` (validações, tokens, fluxo)
- `api/src/controllers/authController.js`
- `api/src/middleware/loginValidator.js`, `csrf.js`, `validateContentType.js`, `securityHeaders.js`
- `api/src/db/schema.sql` (users, password_resets)
- `api/src/services/emailService.js`
- `api/src/utils/errorMessages.js`
- `web/public/static/api-client.js`, `web/public/static/error-handler.js`

---

## 2) Clientes

Existe:
- CRUD com campos obrigatórios (`name`, `email`) e validações de formato.
- Verificações de CPF/CNPJ, data de nascimento, risco de injeção/XSS.
- Enriquecimento externo (CEP/CNPJ) e mensagens amigáveis.

Validações principais:
- `name` obrigatório; tamanho máximo (p. ex. 255) e caracteres inválidos.
- `email` obrigatório; formato válido.
- `cpf`/`cnpj` válidos; regras de “um ou outro” quando aplicável.
- `birthDate` válida e não futura.
- Endereço: campos com sanitização; erro quando conjunto incompleto for exigido pelo fluxo.

Mensagens/Códigos:
- `REQUIRED_FIELDS`, `NAME_TOO_LONG`, `INVALID_NAME`
- `EMAIL_INVALID`, `CLIENT_EMAIL_EXISTS`
- `CPF_INVALID`, `CNPJ_INVALID`, `CLIENT_CPF_EXISTS`, `CLIENT_CNPJ_EXISTS`
- `CLIENT_NOT_FOUND`

Poderia ter:
- Unicidade reforçada por owner/tenant (e‑mail único por carteira).
- Segmentação/tagueamento, campos customizáveis e importação em massa com validação assistida.
- Regras de consentimento/LGPD (finalidade, opt‑in comunicação).

Referências:
- `api/src/services/customersService.js`
- `api/src/utils/errorMessages.js`
- `api/src/db/schema.sql` (customers)
- Telas: `web/public/clients.js`, `client-edit.js`

---

## 3) Produtos

Existe:
- CRUD com `name`, `price` e `purchase_price` obrigatórios.
- Integração com fichas técnicas/receitas e vínculos.
- Status do produto, custo por unidade e campos de apoio à precificação.

Validações principais:
- `name` obrigatório; `price` e `purchase_price` numéricos positivos.
- Regras de vínculo/desvínculo de ficha técnica.

Mensagens/Códigos:
- `PRODUCT_NOT_FOUND`, `PRODUCT_NAME_REQUIRED`
- `PRODUCT_PRICE_REQUIRED`, `PRODUCT_PRICE_INVALID`
- `PRODUCT_PURCHASE_PRICE_REQUIRED`, `PRODUCT_PURCHASE_PRICE_INVALID`

Poderia ter:
- Versionamento da ficha técnica, variações/SKUs, unidade de medida padronizada.
- Regras de preço mínimo/margem mínima com justificativa e aprovação.
- Idempotência em POST para evitar duplicidade por reenvio.

Referências:
- `api/src/utils/errorMessages.js` (produtos)
- `api/src/db/schema.sql` (products)
- Telas: `web/public/products.js`, `product-edit.js`

---

## 4) Receitas (Fichas Técnicas)

Existe:
- CRUD, cálculo, export; campos de rendimento, custos, preço sugerido/mínimo.
- Componentes (ingredientes, custos indiretos) e vínculo com produto.

Validações principais:
- `name` e parâmetros de rendimento/medidas; coerência básica em quantidades e custos.

Mensagens/Códigos:
- Genéricos de dados inválidos e “não encontrado”; validações de domínio nos serviços.

Poderia ter:
- Consistência avançada (perdas/rendimento), biblioteca de ingredientes padronizados.
- Trilhas de alterações e aprovações para alterações de custo/receita.
- Simulações “what‑if” e cenários salvos.

Referências:
- `api/src/db/schema.sql` (recipes, recipe_ingredients, recipe_overheads)
- `api/src/services/recipes*` (quando aplicável) e controllers
- Telas: `web/public/recipes.js`, `recipe-edit.js`

---

## 5) Vendas

Existe:
- CRUD, cancelamento, resumo; apoio a código de barras, feriados, auditoria.
- Cálculo de itens/CMV e totais; status e trilhas temporais.

Validações principais:
- Venda com ao menos um item; item com `product` e `quantity` válidos.
- `customer` requerido quando exigido; quantidades e valores positivos.
- Cancelamento não repetível (`SALE_ALREADY_CANCELLED`).

Mensagens/Códigos:
- `SALE_NOT_FOUND`, `SALE_ITEMS_REQUIRED`
- `SALE_CLIENT_REQUIRED`, `SALE_PRODUCT_REQUIRED`, `SALE_QUANTITY_INVALID`
- `SALE_ALREADY_CANCELLED`

Poderia ter:
- Estados adicionais (devolução/estorno), meios de pagamento e reconciliação (PIX/boletos).
- Idempotência e trava por janela (evitar duplicidade).
- Regras promocionais (combos, preço por canal/segmento) com auditoria de margem.

Referências:
- `api/src/services/salesService.js`
- `api/src/db/schema.sql` (sales, sale_items)
- Telas: `web/public/sales.js`

---

## 6) Relatórios e Exportações

Existe:
- Receita/faturamento financeiro com filtros de período e export (CSV/Excel/PDF).
- Consistência básica e avisos de divergência entre módulos.

Validações principais:
- Períodos e parâmetros; limites de tamanho/tempo em exportações.

Mensagens/Códigos:
- Genéricos (400/422) e mensagens amigáveis traduzidas no error handler.

Poderia ter:
- Páginação/stream para grandes volumes, cache por consulta, quotas por usuário.
- Agendamento de relatórios por e‑mail e trilhas de auditoria.

Referências:
- `api/src/controllers/reportsController.js` e serviços relacionados
- Telas: `web/public/reports.js`

---

## 7) Segurança e Cross‑Cutting (Transversais)

Existe:
- CSRF (double-submit), CORS por ambiente, rate limit global e por rotas sensíveis.
- CSP (política mais rígida em produção), HSTS e redirecionamento HTTPS.
- Validação global de Content‑Type (POST/PUT/PATCH).
- Logs/auditoria estruturados com `X-Request-Id` e mascaramento de PII.
- Métricas Prometheus, health check, Swagger condicional, i18n.

Validações principais:
- Content‑Type `application/json` (charset utf‑8 quando especificado).
- Cabeçalhos de segurança, clickjacking, referrer, COOP/CORP seguros.
- CSRF em mutações via cookie + header igual ao cookie.

Mensagens/Códigos:
- `INVALID_CONTENT_TYPE`, `INVALID_CHARSET`, mensagens normalizadas no `errorHandler`.

Poderia ter:
- CSP com nonces e `strict-dynamic` (remoção total de inline scripts em produção).
- Segredos via vault, rotação de chaves, circuit breakers/retries padronizados.
- Feature flags por tenant; logs com correlação user/session e anonimização consistente.

Referências:
- `api/src/middleware/{securityHeaders,csrf,rateLimit,validateContentType,errorHandler}.js`
- `api/src/middleware/{requestLogger,auditLogger}.js`
- `api/src/middleware/metrics.js`, `api/src/app.js`
- `api/src/utils/logger.js`

---

## 8) Frontend (Acessibilidade e UX)

Existe:
- Cliente HTTP central com timeout e tratamento de rede/erros.
- Mensagens amigáveis por mapeamento semântico; ARIA básica; feedbacks e estados.
- CSRF garantido pelo front antes de mutações; fluxo de sessão (`/auth/me`).

Validações principais:
- Formulários com validações de formato (ex.: e‑mail, ajuda de senha) e ARIA (`aria-*`, `role="alert"`, `aria-live`).
- Normalização padronizada de erro (rede, 4xx/5xx, códigos semânticos).

Mensagens/Códigos:
- `NETWORK_ERROR`, `TIMEOUT_ERROR`, HTTP 400/401/403/404/409/422/423/429/500/503
- Específicos do domínio (ex.: `EMAIL_ALREADY_EXISTS`, `RESET_TOKEN_INVALID`, etc.)

Poderia ter:
- Navegação por teclado 100%, skip‑links, landmarks, foco visível consistente.
- `cypress-axe` no CI (gate) e telemetria de UX (web vitals) opcional.
- Retry/backoff idempotente (GET), suporte `ETag/If-None-Match`, cache otimista e estados granulares.

Referências:
- `web/public/static/api-client.js`, `web/public/static/error-handler.js`
- Telas: `web/public/*.js` e HTML/CSS associados

---

## 9) Banco de Dados (Constraints/Modelo)

Existe:
- Unicidade de `users.email`; campos obrigatórios e default de status/flags.
- Estruturas para receitas, itens, custos, vendas/itens e timestamps.

Poderia ter:
- Índices adicionais por owner/tenant e colunas de auditoria (updated_by).
- Constraints de integridade referencial adicionais (clientes/produtos/vendas).
- Migrations versionadas com histórico e seeds determinísticos (para testes).

Referências:
- `api/src/db/schema.sql`
- (`api/src/db/repository.js` para queries/utilitários)

---

## 10) Serviços Externos (CEP, CNPJ, Feriados, Barras)

Existe:
- Utilitários HTTP com timeout, parse seguro e tratamento de timeouts/erros.
- Normalização de respostas e caches leves quando aplicável.

Poderia ter:
- Helper HTTP unificado (DRY) com retry exponencial + jitter, circuit breaker simples e métricas por endpoint, para substituir duplicações pontuais de `requestJson` nos serviços.
- Cache com TTL e fallback consistente por fornecedor.

Referências:
- `api/src/services/{cepService,cnpjService,holidayService,barcodeService}.js`

---

## Quadro‑resumo — “Poderia ter” prioritário (alto impacto)
1) Gate por e‑mail verificado; reenvio com rate‑limit.  
2) Retry/backoff + suporte a ETag no cliente HTTP; migração gradual das telas.  
3) CSP com nonces e `strict-dynamic`; remoção de inline em produção.  
4) Helper HTTP unificado para serviços externos (retry/jitter/CB/métricas).  
5) A11y automatizada no CI com `cypress-axe` e correções guiadas.  
6) RBAC/ABAC com razões de negação e adaptação de UI por papel.  
7) Idempotência em POST (vendas/exports) e quotas/limites por rota pesada.  
8) Relatórios agendados por e‑mail e export assíncrono via fila.  

---

### Como manter este documento vivo
- Ao introduzir nova regra: atualizar serviço/middleware + `utils/errorMessages.js` + este arquivo.
- Ao alterar mensagens: revisar mapeamento de códigos no front (`error-handler.js`) e aqui.
- Revisões trimestrais com checklist de segurança (CSP/HSTS/CSRF/RateLimit) e acessibilidade (axe).

