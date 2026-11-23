# Checklist de pré-produção e pós-deploy

Complementa `DEPLOY.md`, `CHECKLIST_PRODUCAO.md` e `VARIAVEIS_DE_AMBIENTE.md`. Hospedagem escolhida para validação: **Render (plano gratuito)** — veja a seção 7 (guia de cliques) e o `render.yaml` na raiz. As seções 1–6 valem para qualquer provedor.

## 1. Arquitetura a subir

| Serviço | Comando | Observações |
|---|---|---|
| API (`/api`) | `npm --workspace api start` (carrega `.env.production`, `NODE_ENV=production`) | Porta `PORT` (padrão 3000). Precisa de PostgreSQL. |
| Web (`/web`) | `node web/server.js` | Serve o front e faz proxy de `/api` para a API. Variáveis: `PORT`, `API_BASE` (URL da API), `NODE_ENV=production`. Em produção o navegador usa `/api` na mesma origem (`/config.js` devolve `API_BASE` vazio); `PUBLIC_API_BASE` e `REQUEST_TIMEOUT_MS` são opcionais. |

Só o **Web** precisa ser público (HTTPS). A API pode ficar em rede privada, acessada via `API_BASE`.

## 2. Variáveis de ambiente obrigatórias (API)

A API **não sobe** em produção sem as marcadas com ⛔.

| Variável | Obrigatória | Valor / regra |
|---|---|---|
| `NODE_ENV` | ⛔ | `production` (ativa cookies `secure`, esconde stack de erro, exige as demais). |
| `DATABASE_URL` | ⛔ | PostgreSQL gerenciado (`postgres://usuario:senha@host:5432/banco`, com SSL se o provedor exigir). |
| `JWT_SECRET` | ⛔ | Segredo longo e aleatório (≥ 32 chars). Nunca reutilizar o de dev. |
| `JWT_REFRESH_SECRET` | ⛔ | ≥ 32 chars, **diferente** de `JWT_SECRET` e de `dev-refresh-secret`. |
| `ALLOWED_ORIGINS` | ⛔ | Origem pública do Web, ex.: `https://app.seudominio.com` (lista separada por vírgula). |
| `WEB_BASE_URL` | sim | URL pública do Web (links de e-mail e callback do Google). |
| `PLATFORM_ADMIN_EMAILS` | sim | E-mails (vírgula) com acesso a `/error-monitoring.html`. **Em produção, sem isto ninguém acessa.** |
| `GOOGLE_CLIENT_ID` | se usar login Google | Sem `GOOGLE_*` o botão fica oculto. |
| `GOOGLE_CLIENT_SECRET` | se usar login Google | **Rotacionar** (ver seção 3) antes de usar em produção. |
| `GOOGLE_REDIRECT_URI` | se usar login Google | `https://app.seudominio.com/api/auth/google/callback` (igual ao cadastrado no Google). Se omitida, deriva de `WEB_BASE_URL`. |
| `SMTP_HOST` `SMTP_PORT` `SMTP_SECURE` `SMTP_USER` `SMTP_PASS` `SMTP_FROM` | sim | E-mail de boas-vindas, confirmação e reset de senha. Sem SMTP real o e-mail não chega. |
| `RESET_TOKEN_SECRET`, `EMAIL_VERIFY_TOKEN_SECRET` | recomendado | Se ausentes, usam `JWT_SECRET`. Prefira segredos próprios. |
| `TRUST_PROXY_HOPS` | conforme hospedagem | Nº de proxies à frente da API (padrão 1). Errado = rate limit enxerga o IP do proxy. |
| `JWT_PREVIOUS_SECRET`, `JWT_REFRESH_PREVIOUS_SECRET` | só em rotação | Mantêm sessões válidas durante a troca de segredo. |

Variáveis do **Web**: `API_BASE` (ex.: `http://sgvc-api:3000`), `PORT`, `NODE_ENV=production`.

### Nunca em produção
- `DISABLE_RATE_LIMIT=true` (só para a suíte de testes completa).
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `OTHER_USER_*` / `BLOCKED_USER_*` e o seed de usuários de teste (`db:seed:users`).
- `ENABLE_SWAGGER_UI` ligado sem necessidade; `EMAIL_USE_ETHEREAL`.
- Arquivos `.env.*` no repositório: use o painel de segredos do provedor.

## 3. Rotação do `GOOGLE_CLIENT_SECRET`
1. Google Cloud Console → APIs e serviços → Credenciais → cliente OAuth Web do SGVC.
2. Gerar **novo** segredo (o anterior foi exposto em sessão anterior; considere-o comprometido).
3. Em *URIs de redirecionamento autorizados* manter só `https://<dominio>/api/auth/google/callback` (remover o de localhost em produção ou usar outro cliente para dev).
4. Gravar o novo valor em `GOOGLE_CLIENT_SECRET` no provedor, redeploy, e **revogar/excluir** o segredo antigo.
5. Atualizar o `.env.local` de desenvolvimento com um segredo/cliente separado.

## 4. Antes do deploy
- [ ] `git status` limpo na `main` e testes verdes (Mocha após `npm run db:reset:test`; Cypress completo).
- [ ] Banco PostgreSQL criado, backup automático ligado, usuário próprio da aplicação.
- [ ] Todas as variáveis da seção 2 cadastradas no provedor (segredos como *secret*, não em arquivo).
- [ ] Domínio com **HTTPS** (obrigatório: cookies `secure` e service worker/PWA só funcionam em HTTPS).
- [ ] Origem do Web em `ALLOWED_ORIGINS` e `WEB_BASE_URL` idênticas ao domínio real.
- [ ] Migrações: rodar `npm run db:init` (ou `npm --workspace api run db:migrate`) uma vez no banco de produção (aplica 0001–0015). Conferir que `financial_entries` e `cash_registers` existem.

## 5. Validação pós-deploy (passo a passo)
1. **Saúde da API:** `GET https://<dominio>/health` (via API ou proxy) → `200` com `database: "ok"`.
2. **Front:** abrir `https://<dominio>/` → página de login sem erros no console; `GET /config.js` aponta para o `API_BASE` esperado.
3. **Cadastro e e-mail:** criar conta de teste → recebe e-mails de boas-vindas/confirmação (SMTP real).
4. **Login + sessão:** entrar, recarregar a página (sessão continua), sair.
5. **Reset de senha:** pedir reset → link do e-mail abre em `WEB_BASE_URL` e funciona.
6. **Login Google** (se ativo): fluxo completa e volta logado; `redirect_uri_mismatch` = `GOOGLE_REDIRECT_URI` diferente do cadastrado.
7. **Permissões:** convidar um Vendedor → ele **não** vê custo/CMV/lucro nem Financeiro (403 em `/api/finance/summary`).
8. **Módulos:** em Aparência desligar/ligar Financeiro, PDV e CRM e conferir o menu.
9. **Fluxo de negócio:** cadastrar produto → abrir caixa (PDV) → vender → fechar caixa cego → ver venda em Vendas → lançar conta a pagar e ver no Fluxo de caixa/DRE.
10. **Painel de erros:** com e-mail de `PLATFORM_ADMIN_EMAILS` abrir `/error-monitoring.html`; com outro e-mail deve negar.
11. **Segurança de borda:** resposta de erro 500 sem stack; cookies com `Secure`/`HttpOnly`; `/metrics` restrito (`METRICS_ALLOWED_IPS`).
12. **PWA:** no Chrome/Android abrir o site → botão **Instalar app** aparece no menu → instalar → abre em janela própria; DevTools → Application: manifesto válido, service worker ativo, nenhum cache de `/api`; desligar a rede e recarregar mostra `/offline.html`.
13. **Mobile:** no celular, sem rolagem horizontal nas telas de PDV, Vendas, Clientes e Financeiro.
14. **Logs e alertas:** ver logs da primeira hora, sem 5xx; configurar alerta de indisponibilidade em `/health`.

## 6. Rollback
- Manter a imagem/commit anterior pronto para redeploy.
- Migrações são aditivas (`0015` apenas cria tabela); em caso de reversão de código, o banco novo continua compatível.
- Se trocar `JWT_SECRET`: usar `JWT_PREVIOUS_SECRET` por um ciclo para não derrubar sessões.

---

## 7. Render (plano gratuito): guia de cliques

O repositório já traz o `render.yaml` (Blueprint) que cria **PostgreSQL + API + Web** de uma vez. Nome dos serviços: `sgvc-db`, `sgvc-api`, `sgvc-web` (região Virginia, a mais próxima do Brasil entre as do plano gratuito).

### 7.1 Limites do plano gratuito (leia antes)
- **Dorme após 15 min sem tráfego**; a primeira requisição depois disso leva até ~1 minuto (por isso o front usa timeout de 60 s em produção). Com API e Web dormindo, o 1º acesso acorda os dois em sequência.
- **O PostgreSQL gratuito expira 30 dias após a criação** (dados apagados). Serve para validar; antes de usar de verdade, faça backup ou migre para um plano pago. Só há 1 banco gratuito por workspace.
- Sistema de arquivos efêmero (o SGVC guarda tudo no banco, então não afeta).
- 750 horas gratuitas/mês por workspace, 500 min de build.
- Serviços gratuitos **não recebem tráfego da rede privada**: por isso o Web chama a API pela URL pública (`API_BASE=https://sgvc-api.onrender.com`).

### 7.2 Antes de começar
1. Ter o código na `main` do GitHub (`jeff-barbosa123/gestao-vendas-clientes-api`) com `render.yaml` na raiz.
2. Conta no Render (https://render.com) entrando com o GitHub.
3. Decidir os e-mails de administrador da plataforma (`PLATFORM_ADMIN_EMAILS`).

### 7.3 Criar tudo pelo Blueprint
1. No Dashboard: **New +** → **Blueprint**.
2. **Connect** o repositório `gestao-vendas-clientes-api` (autorize o GitHub App se pedir) e escolha a branch `main`.
3. O Render lê o `render.yaml` e lista 3 recursos (`sgvc-db`, `sgvc-api`, `sgvc-web`). Ele pede o valor de **`PLATFORM_ADMIN_EMAILS`** (ex.: `voce@email.com`; vários separados por vírgula).
4. Clique **Apply** / **Deploy Blueprint**. O banco sobe primeiro; depois API e Web.
5. Acompanhe em **sgvc-api → Logs**: deve aparecer `15 migracao(oes) aplicada(s)` (ou `Migracoes em dia`) e `API rodando na porta ...`. Em **sgvc-web → Logs**: servidor ouvindo na porta.

### 7.4 Conferir as URLs (passo que costuma dar errado)
O subdomínio `*.onrender.com` é único no mundo. Abra cada serviço e veja a URL no topo.
- Se forem exatamente `https://sgvc-web.onrender.com` e `https://sgvc-api.onrender.com`: nada a fazer.
- Se tiver sufixo (ex.: `sgvc-web-x1y2.onrender.com`): ajuste e faça **Manual Deploy → Deploy latest commit** nos dois:

| Serviço | Aba Environment | Variável | Valor |
|---|---|---|---|
| sgvc-api | Environment | `ALLOWED_ORIGINS` | URL real do Web |
| sgvc-api | Environment | `WEB_BASE_URL` | URL real do Web |
| sgvc-web | Environment | `API_BASE` | URL real da API |

### 7.5 Variáveis: o que o Blueprint já configura
| Serviço | Variável | Origem |
|---|---|---|
| API | `NODE_ENV=production`, `NODE_VERSION=22` | fixo no `render.yaml` |
| API | `DATABASE_URL` | ligada ao `sgvc-db` (URL interna, sem SSL) |
| API | `JWT_SECRET`, `JWT_REFRESH_SECRET`, `RESET_TOKEN_SECRET`, `EMAIL_VERIFY_TOKEN_SECRET` | geradas pelo Render (aleatórias, ≥ 32 caracteres) |
| API | `ALLOWED_ORIGINS`, `WEB_BASE_URL` | `https://sgvc-web.onrender.com` (ver 7.4) |
| API | `TRUST_PROXY_HOPS=2` | Web (proxy do SGVC) + balanceador do Render, para o rate limit enxergar o IP real |
| API | `PLATFORM_ADMIN_EMAILS` | você digita no passo 7.3 |
| API | `EMAIL_USE_ETHEREAL=true` | e-mails vão para caixa de teste; o link de visualização sai nos **logs** da API |
| Web | `NODE_ENV=production`, `NODE_VERSION=22`, `API_BASE` | fixos (ver 7.4) |

### 7.6 Variáveis para adicionar depois (sgvc-api → Environment → Add Environment Variable)
**E-mail real (SMTP)** — ex. Gmail com *senha de app*:
`SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_SECURE=true`, `SMTP_USER=seu@gmail.com`, `SMTP_PASS=<senha de app>`, `SMTP_FROM=seu@gmail.com`. Depois **apague `EMAIL_USE_ETHEREAL`** (ela tem prioridade sobre o SMTP).

**Login com Google** (opcional): após rotacionar o segredo (seção 3):
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (novo) e `GOOGLE_REDIRECT_URI=https://sgvc-web.onrender.com/api/auth/google/callback`. No Google Cloud Console, cadastre exatamente essa URI em *URIs de redirecionamento autorizados*. Salvar variáveis faz o Render reiniciar o serviço sozinho.

### 7.7 Validar no ar
1. Abra `https://sgvc-web.onrender.com` (espere o 1º carregamento acordar os serviços).
2. `https://sgvc-api.onrender.com/health` → `{"status":"ok", ... "database":"ok"}`.
3. Cadastre uma conta, entre, cadastre produto, faça uma venda no PDV, lance uma conta a pagar e veja Fluxo de caixa/DRE.
4. Siga a seção 5 (validação pós-deploy) para permissões, módulos, PWA ("Instalar app" aparece no Chrome) e mobile.

### 7.8 Problemas comuns
| Sintoma | Causa provável |
|---|---|
| Login não persiste / erro de CSRF | O navegador não está usando o proxy `/api` do Web: confira `https://sgvc-web.onrender.com/config.js` → `"API_BASE":""`. |
| `CORS`/403 na API | `ALLOWED_ORIGINS` diferente da URL real do Web (7.4). |
| 502 do Web ao chamar a API | API ainda acordando ou `API_BASE` errada; aguarde ~1 min e tente de novo. |
| Deploy da API falha com `JWT_REFRESH_SECRET must be set...` | Variável removida ou com menos de 32 caracteres. |
| `DATABASE_URL ... obrigatório` | `sgvc-db` não terminou de criar ou a ligação `fromDatabase` foi apagada. |
| Rate limit (429) para todos os usuários juntos | `TRUST_PROXY_HOPS` errado: teste 1, 2 ou 3 e veja o IP nos logs. |
| Banco sumiu após ~30 dias | Expiração do PostgreSQL gratuito (7.1). |
