# Instalação e ambientes — SGVC

## Pré-requisitos

- Node.js 20+ (`node -v`)
- Docker Desktop (PostgreSQL 15)
- Git

## Ambientes

A API escolhe o arquivo de configuração pelo `NODE_ENV` (ou pela variável `ENV_FILE`):

| Ambiente | Comando | NODE_ENV | Arquivo lido | Banco (docker-compose) |
|----------|---------|----------|--------------|------------------------|
| Local | `npm run dev:local` / `npm run start:local` | development | `api/.env.local` | `docker-compose.local.yml` → `sgvc_local` (porta 5432) |
| Testes | `npm test` | test | `api/.env.test` | banco separado, ex.: `sgvc_test` |
| Homologação | `npm run start:hmg` | staging | `api/.env.hmg` | `docker-compose.hmg.yml` (porta 5433) |
| Produção | `npm start` | production | `api/.env.production` | gerenciado (ex.: Railway) |

Os modelos versionados ficam em `api/env.local.example`, `api/env.test.example`,
`api/env.hmg.example` e `api/env.production.example`. **Nunca versione os `.env` reais** — o
`.gitignore` já bloqueia.

## Passo a passo (local)

```bash
docker compose -f docker-compose.local.yml up -d     # PostgreSQL
npm install                                          # dependências da raiz e da api
cd web && npm install && cd ..                       # dependências do frontend
copy api\env.local.example api\.env.local            # e ajuste se necessário
cd api && npm run db:seed:users && cd ..             # usuários de demonstração
npm run dev:local                                    # API em http://localhost:3000
cd web && npm start                                  # frontend em http://localhost:4000
```

O schema (`api/src/db/schema.sql`) e as migrations (`api/migrations/*.sql`) são aplicados
automaticamente quando a API sobe.

Usuários criados pelo seed (senhas gravadas com bcrypt): os definidos em `ADMIN_EMAIL`/`ADMIN_PASSWORD`
e `OTHER_USER_EMAIL`/`OTHER_USER_PASSWORD` no `.env`, além de `bloqueado@teste.com` (usuário bloqueado,
usado nos testes).

## Frontend

O `web/server.js` serve `web/public` na porta 4000 e repassa `/api/*` para a API (porta 3000).
Assim o navegador enxerga tudo na mesma origem e os cookies de sessão (HttpOnly, SameSite=Lax)
funcionam sem HTTPS em desenvolvimento.

## Autenticação

- Login devolve o token no corpo **e** em cookies HttpOnly (`sgvc_token`, `sgvc_refresh`).
- O frontend usa os cookies; Swagger/Postman/testes usam `Authorization: Bearer <token>`.
- Requisições que usam o cookie de sessão precisam do header `X-CSRF-Token` igual ao cookie
  `sgvc_csrf` (obtido em `GET /api/auth/csrf`). Requisições só com Bearer não precisam.
- Sessões ficam na tabela `auth_sessions` (PostgreSQL) com cache em memória: reiniciar ou fazer
  deploy da API **não** desloga ninguém. Refresh token é de uso único; sessões expiradas são
  removidas automaticamente.

## E-mail (recuperação de senha e verificação de e-mail)

- Com `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` e `SMTP_FROM` preenchidos, envia por SMTP
  (ex.: Brevo `smtp-relay.brevo.com:587`).
- Fora de produção (ou com `EMAIL_USE_ETHEREAL=true`), usa uma conta de teste Ethereal e mostra no
  log o link de visualização do e-mail.

## Rate limit

- Global: 300 requisições/minuto por IP (`GLOBAL_RATE_LIMIT_MAX`).
- Rotas sensíveis (login, cadastro, recuperação de senha, refresh, exportação) têm limites próprios.
- `DISABLE_RATE_LIMIT=true` desliga tudo (use só em ambientes controlados).

Todas as variáveis: [VARIAVEIS_DE_AMBIENTE.md](VARIAVEIS_DE_AMBIENTE.md). Problemas comuns:
[TROUBLESHOOTING.md](TROUBLESHOOTING.md).
