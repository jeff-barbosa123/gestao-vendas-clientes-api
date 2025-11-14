**Purpose**
- **Context:** This repository is a small Node.js/Express API for sales and customer management located under `api/`.
- **Goal for the agent:** Be immediately productive editing, adding, or testing routes/controllers/services while preserving project conventions.

**Big Picture**
- **App entry:** `api/src/server.js` starts the HTTP server; `api/src/app.js` wires middleware, routes and Swagger (`/api-docs`).
- **Routing:** All route modules live under `api/src/routes/` and are mounted by `api/src/routes/index.js` at `/api`.
- **Layering:** Controllers (`api/src/controllers/*`) handle HTTP level (req/res), services (`api/src/services/*`) contain business logic, and `api/src/models/db.js` provides the in-memory data layer + simple persistence for `fixtures/customers.json`.
- **Auth:** JWT-based auth implemented in `api/src/services/authService.js` and used by `api/src/controllers/authController.js`. Tokens, revocation and failed-login blocking are stored in-memory (see `tokenStore` and `failedAttempts` in `db.js`).

**How to run & test (concrete commands)**
- **Install deps:** `cd api; npm install`
- **Start (prod):** `cd api; npm start` (launches `node src/server.js`)
- **Start (dev):** `cd api; npm run dev` (uses `nodemon`)
- **Run tests:** `cd api; npm test` (Mocha via `.mocharc.json`) — for HTML reports use `npm run test:report`.

**Important project-specific behaviors & gotchas**
- **In-memory DB with partial persistence:** The app uses an in-memory `db` object (`api/src/models/db.js`). Creating a customer writes to `fixtures/customers.json` on disk — other entities are memory-only. Tests and local development can be stateful; reset fixtures if needed.
- **Env vars loaded early:** `api/src/app.js` calls `require('dotenv').config()` at the top. Use `JWT_SECRET` and `PORT` in a local `.env` to control auth and server port.
- **Auth semantics:** Tokens have TTL and are tracked in a `tokenStore` Map. Logout marks the token revoked in-memory — restarting the process clears revocations.
- **Error handling pattern:** Controllers typically `try/catch` and either `next(err)` or respond with status. The global middleware is `api/src/middleware/errorHandler.js` — prefer throwing Errors with `err.status` in services so the middleware maps them consistently.

**Where to add features (concrete examples)**
- **New resource:** add `api/src/routes/<resource>Routes.js`, `api/src/controllers/<resource>Controller.js`, and `api/src/services/<resource>Service.js`. Mount the route in `api/src/routes/index.js`.
- **Example:** To add a `/products` endpoint, follow `productsRoutes.js` → `productsController.js` → `productsService.js` pattern.

**Testing conventions**
- **Test stack:** Mocha + Chai + Supertest. Look at `test/` organization (folder per domain). Tests run with `npm test` from `api/`.
- **Stateful tests:** Because the in-memory DB persists customers to `fixtures/customers.json`, tests that mutate customers may need to reset that fixture or run in a clean environment. Prefer mocking `db` when writing isolated unit tests.

**Integration & docs**
- **Swagger UI:** API docs are served from `/api-docs` via `api/resources/swagger.json` — update that file when adding or changing endpoints.

**Quick pointers for the AI agent**
- **Modify behavior:** Change business rules in `api/src/services/*` not in controllers. Controllers remain thin.
- **Auth checks:** If adding auth middleware, use `api/src/middleware/authMiddleware.js` as example and ensure JWT secret comes from `process.env.JWT_SECRET`.
- **Persistence note:** If you need durable storage, mention that moving from `db.js` to a real DB is a cross-cutting change: update services, tests, and fixtures.

**Files to reference when editing or adding features**
- `api/src/app.js` — middleware & docs mount
- `api/src/server.js` — server bootstrap
- `api/src/routes/index.js` — route mounting
- `api/src/controllers/*.js` — HTTP handlers
- `api/src/services/*.js` — business logic (preferred edit target)
- `api/src/models/db.js` — in-memory datastore + fixtures I/O
- `api/resources/swagger.json` — API documentation
- `api/package.json` — scripts and test commands

Please review any unclear sections or missing details (for example, specific test fixtures or environment variables you use locally) and I will iterate on this file.

---

**Endpoint Examples**

- **Auth (login):**
	- `POST /api/auth/login`
		- Body: `{ "email": "admin@negocio.com", "password": "admin123" }`
		- Response: `{ "token": "<jwt>", "user": { ... } }`

- **Customers (create):**
	- `POST /api/customers`
		- Body: `{ "name": "Cliente X", "email": "x@email.com", "phone": "123456" }`
		- Response: `{ "id": "...", "name": "...", ... }`

- **Products (list):**
	- `GET /api/products`
		- Response: `[ { "id": "...", "name": "...", "price": 10.0, ... }, ... ]`

- **Sales (create):**
	- `POST /api/sales`
		- Body: `{ "customerId": "...", "items": [ { "productId": "...", "quantity": 2, "unitPrice": 10.0 } ] }`
		- Response: `{ "id": "...", "total": 20.0, ... }`

- **Reports (revenue):**
	- `GET /api/reports/revenue?start=2025-01-01&end=2025-12-31`
		- Response: `[ { "id": "...", "total": 100.0, ... }, ... ]`

---

**Pull Request Checklist**

- [ ] Segue o padrão de rotas, controllers e services do projeto
- [ ] Atualiza/expande `api/resources/swagger.json` para novos endpoints
- [ ] Inclui testes para novos recursos ou correções
- [ ] Não quebra persistência de `fixtures/customers.json` (se relevante)
- [ ] Respeita o padrão de tratamento de erros (lançar `Error` com `status` em services)
- [ ] Atualiza `.env.example` se variáveis novas forem necessárias
- [ ] Inclui exemplos de uso no PR ou na documentação, se aplicável
