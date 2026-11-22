# Checklist de pré-produção e pós-deploy

Complementa `DEPLOY.md`, `CHECKLIST_PRODUCAO.md` e `VARIAVEIS_DE_AMBIENTE.md`. Hospedagem ainda não definida (Render ou Railway): o checklist vale para qualquer uma.

## 1. Arquitetura a subir

| Serviço | Comando | Observações |
|---|---|---|
| API (`/api`) | `npm --workspace api start` (carrega `.env.production`, `NODE_ENV=production`) | Porta `PORT` (padrão 3000). Precisa de PostgreSQL. |
| Web (`/web`) | `node web/server.js` | Serve o front e faz proxy de `/api` para a API. Variáveis: `PORT`, `API_BASE` (URL interna da API), `NODE_ENV=production`. |

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
