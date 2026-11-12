# SGVC — Sistema de Gestão de Vendas e Clientes

[![CI](https://github.com/jeff-barbosa123/gestao-vendas-clientes-api/actions/workflows/ci.yml/badge.svg)](https://github.com/jeff-barbosa123/gestao-vendas-clientes-api/actions/workflows/ci.yml)

Sistema para microempreendedores de alimentação (confeiteiros, boleiras, cozinheiros) controlarem
**clientes, produtos, vendas, ficha técnica e CMV**, com precificação baseada no custo real.

## Funcionalidades

| US | Funcionalidade |
|----|----------------|
| 001 | Login com JWT + refresh, cookies HttpOnly e proteção CSRF |
| 002 | Cadastro de clientes e produtos |
| 003 | Registro de vendas (total e CMV calculados por item, controle de estoque, cancelamento) |
| 004 | Faturamento por dia / semana / mês / ano (vendas canceladas não entram) |
| 005 | Ficha técnica: ingredientes, custos indiretos, mão de obra, rendimento, custo por unidade |
| 006 | Simulação de preço ideal |
| 007 | Vínculo ficha técnica ↔ produto (custo do produto acompanha a ficha) |
| 008 | Cadastro único de insumos: preço em um lugar só; fichas, produtos e CMV recalculados ao mudar o preço |
| 009 | Forma de pagamento da venda, faturamento por forma de pagamento e alerta de margem baixa/abaixo do custo |
| 010 | Estoque de insumos: baixa automática pela venda, entrada de compra, contagem e aviso de reposição |
| 011 | Encomendas: agenda com data de entrega, sinal e status; entregar vira venda; aviso de falta de insumo |

Extras: dashboard, exportação (CSV/PDF), paginação, mensagens de erro amigáveis (pt-BR/en/es),
consulta de CEP/CNPJ, analytics de erros, métricas Prometheus.

## Estrutura

```
api/            API REST (Node.js + Express + PostgreSQL)
  src/          controllers, services, routes, middleware, db
  migrations/   SQL aplicado na inicialização
  test/         testes de integração (Mocha + Chai + Supertest)
web/            frontend (HTML/CSS/JS) servido por Express na porta 4000
cypress/        testes E2E do frontend
docs/           documentação (instalação, testes, deploy, regras de negócio)
Documentação/   planos de teste e relatórios de sessão (.docx)
scripts/        scripts de apoio (PowerShell)
```

## Início rápido (ambiente local)

Pré-requisitos: **Node.js 20+** e **Docker** (para o PostgreSQL).

```bash
# 1. Banco de dados
docker compose -f docker-compose.local.yml up -d

# 2. Dependências (raiz — instala api e Cypress)
npm install
cd web && npm install && cd ..

# 3. Configuração da API
copy api\env.local.example api\.env.local      # Windows
# cp api/env.local.example api/.env.local      # Linux/Mac

# 4. Usuários de demonstração
cd api && npm run db:seed:users && cd ..

# 5. Subir API (porta 3000) e frontend (porta 4000) em terminais separados
npm run dev:local
cd web && npm start
```

- Frontend: http://localhost:4000
- Swagger: http://localhost:3000/api-docs
- Health check: http://localhost:3000/health

Detalhes de ambientes (local, homologação, produção) e variáveis: [docs/INSTALACAO.md](docs/INSTALACAO.md).

## Testes

```bash
npm test                 # API (precisa de PostgreSQL e api/.env.test)
npm run cypress:open     # E2E do frontend (API + web rodando)
```

Como configurar o banco de testes, rodar por user story e gerar relatórios: [docs/TESTES.md](docs/TESTES.md).

## Documentação

| Documento | Conteúdo |
|-----------|----------|
| [docs/INSTALACAO.md](docs/INSTALACAO.md) | Instalação, ambientes e e-mail (SMTP) |
| [docs/VARIAVEIS_DE_AMBIENTE.md](docs/VARIAVEIS_DE_AMBIENTE.md) | Todas as variáveis da API |
| [docs/TESTES.md](docs/TESTES.md) | Testes de API e Cypress |
| [docs/CYPRESS_GUIA.md](docs/CYPRESS_GUIA.md) | Estrutura e relatórios do Cypress |
| [docs/REGRAS_NEGOCIO_VALIDACOES.md](docs/REGRAS_NEGOCIO_VALIDACOES.md) | Regras de negócio e validações |
| [docs/PROJETO_OVERVIEW.md](docs/PROJETO_OVERVIEW.md) | Visão geral técnica |
| [docs/DEPLOY.md](docs/DEPLOY.md) / [docs/CHECKLIST_PRODUCAO.md](docs/CHECKLIST_PRODUCAO.md) | Deploy e checklist de produção |
| [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Problemas comuns |
| [docs/RISCOS.md](docs/RISCOS.md) | Levantamento de riscos |
| [docs/ROTEIRO_EVIDENCIAS.md](docs/ROTEIRO_EVIDENCIAS.md) | Padrão de evidências de teste |
| [CHANGELOG.md](CHANGELOG.md) | Histórico de alterações |

## Exportar / importar dados

```bash
cd api
npm run db:export          # gera api/backup/sgvc-export.json
npm run db:import          # importa o arquivo
npm run db:import:force    # limpa os dados atuais antes de importar
```

## Autor

Jefferson Paulo — QA Engineer.
