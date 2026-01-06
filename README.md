# SGVC ? Sistema de Gest?o de Vendas e Clientes (API)
[![CI](https://github.com/jeff-barbosa123/gestao-vendas-clientes-api/actions/workflows/ci.yml/badge.svg)](https://github.com/jeff-barbosa123/gestao-vendas-clientes-api/actions/workflows/ci.yml)

## ?? Vis?o Geral
O SGVC ? uma API REST desenvolvida para microempreendedores (confeiteiros, boleiras e cozinheiros),
com foco em **controle financeiro real**, **CMV**, **precifica??o consciente** e **qualidade de dados**.

O sistema foi projetado com abordagem **API-first**, garantindo seguran?a, escalabilidade e integra??o fluida com frontend e relat?rios.

---

## ?? Funcionalidades Implementadas (MVP 1.0)

- ?? Autentica??o de usu?rios (JWT + refresh)
- ?? Cadastro de clientes e produtos
- ?? Registro de vendas
- ?? Faturamento autom?tico e relat?rio financeiro
- ?? Cadastro de ficha t?cnica (custos, overhead, rendimento)
- ?? Simula??o de pre?o ideal (pr?-venda)
- ?? V?nculo ficha t?cnica ? produto (CMV autom?tico)

---

## ?? Arquitetura
- Node.js
- Express
- JWT
- PostgreSQL (Docker) + fallback in-memory
- API RESTful
- Testes automatizados com SuperTest + Chai

---

## Database (PostgreSQL)

This project now supports PostgreSQL with Docker.

1) Start the database:

   docker compose up -d

2) Configure the API:

   - Update `api/.env` with `DATABASE_URL=postgres://sgvc:sgvc123@localhost:5432/sgvc`

3) Start the API:

   npm start

Notes:
- When `DATABASE_URL` is set, the API persists all data to PostgreSQL.
- If `DATABASE_URL` is not set, the API uses in-memory storage.

---

## Data migration (export/import)

Export the current PostgreSQL data to JSON:

```
cd api
npm run db:export
```

Import a JSON dump into PostgreSQL:

```
cd api
npm run db:import
```

Force-import (clears current data first):

```
cd api
npm run db:import:force
```

The default dump location is `api/backup/sgvc-export.json`.

---

## Optional recipe seed (fixtures)

If you have a dump of recipes, place it at `api/fixtures/recipes.json` (or set
`RECIPES_FIXTURE_PATH`), and the API will seed recipes on first run when the
recipes table is empty. Supported formats:

- `[{...}]` (array of recipes)
- `{ "recipes": [ ... ] }` (export payload)

---

## ?? Qualidade & Testes
O projeto possui QA completo desde o in?cio, incluindo:

- ? Planos de Teste baseados na ISO 29119-3
- ? Testes automatizados de API
- ? Testes de seguran?a (JWT, IDOR, SQLi, XSS)
- ? Testes de performance
- ? Testes explorat?rios baseados em heur?sticas
- ? Tabela de rastreabilidade por User Story

Cobertura atual:
- US001 a US007: **100% testadas (API)**

---

## ?? Seguran?a
- Autentica??o JWT
- Ownership por usu?rio
- Prote??o contra IDOR
- Valida??o de payloads maliciosos
- Limite de tamanho de requisi??o (DoS)

---

## ?? Status do Projeto
- Backend: ? Finalizado (MVP)
- QA: ? Completo (API)
- Frontend: ?? Em desenvolvimento
- CI/CD: ?? Planejado

---

## ????? Autor
Jefferson Paulo  
QA | Automa??o | Qualidade de Software

Projeto desenvolvido como parte de um sistema real para microempreendedores.
