# Deploy (Produção) — SGVC

Este documento foca em **como publicar com HTTPS**, configurar variáveis de ambiente e validar segurança.

## 1) Nginx + HTTPS (exemplo completo)

### Premissas
- **Frontend**: arquivos estáticos em `web/public` (servidos pelo Nginx).
- **API**: Node/Express rodando internamente (ex.: `127.0.0.1:3000`).
- **Domínio**: `sgvc.com.br` (ajuste para o seu).
- Certificados TLS (Let’s Encrypt/ACM/etc.) disponíveis como:
  - `/etc/letsencrypt/live/sgvc.com.br/fullchain.pem`
  - `/etc/letsencrypt/live/sgvc.com.br/privkey.pem`

### Configuração Nginx

Crie um arquivo, por exemplo: `/etc/nginx/sites-available/sgvc.conf`:

```nginx
map $http_upgrade $connection_upgrade {
  default upgrade;
  ''      close;
}

server {
  listen 80;
  listen [::]:80;
  server_name sgvc.com.br www.sgvc.com.br;

  # HTTP -> HTTPS
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl http2;
  listen [::]:443 ssl http2;
  server_name sgvc.com.br www.sgvc.com.br;

  ssl_certificate     /etc/letsencrypt/live/sgvc.com.br/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/sgvc.com.br/privkey.pem;

  # Boas práticas TLS (ajuste conforme sua política)
  ssl_session_timeout 1d;
  ssl_session_cache shared:SSL:10m;
  ssl_session_tickets off;
  ssl_protocols TLSv1.2 TLSv1.3;

  # Frontend estático
  root /var/www/sgvc/web/public;
  index index.html;

  # (Opcional) headers de cache para assets estáticos
  location ^~ /static/ {
    try_files $uri =404;
    add_header Cache-Control "public, max-age=31536000, immutable";
  }

  # Arquivos HTML sem cache agressivo
  location = /index.html { add_header Cache-Control "no-store"; }
  location = /dashboard.html { add_header Cache-Control "no-store"; }

  # Health do Nginx (opcional)
  location = /nginx-health {
    access_log off;
    return 200 "ok\n";
  }

  # Proxy da API
  # Mantém a API em /api/* e evita CORS quando front e API são same-origin.
  location ^~ /api/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # Se usar websocket em algum endpoint (opcional)
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
  }

  # Fallback SPA simples (se necessário):
  # Se você usa múltiplos HTML (não SPA), pode remover esse bloco.
  location / {
    try_files $uri $uri/ =404;
  }
}
```

Ative e recarregue:

```bash
sudo ln -s /etc/nginx/sites-available/sgvc.conf /etc/nginx/sites-enabled/sgvc.conf
sudo nginx -t
sudo systemctl reload nginx
```

## 2) Variáveis de ambiente (produção)

### Backend (API)
Defina no ambiente do processo Node (systemd, PM2, Docker, etc.):

- **`NODE_ENV=production`**
- **`PORT=3000`** (ou outra porta interna)
- **`ALLOWED_ORIGINS`**: lista separada por vírgula (ex.: `https://sgvc.com.br,https://www.sgvc.com.br`)
- **`WEB_BASE_URL`**: base pública do site (ex.: `https://sgvc.com.br`)
- **`AUTH_USE_COOKIES=true`** (migração para auth por cookie HttpOnly)
- **`JWT_SECRET`** e (se aplicável) **`JWT_REFRESH_SECRET`**
- **`DATABASE_URL`** (Postgres) — ex.: `postgres://user:pass@host:5432/dbname`
- **`CSRF_COOKIE_NAME=sgvc_csrf`** (opcional; default já é `sgvc_csrf`)
- **E-mail (se aplicável)**: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, etc.

Observações:
- Com `NODE_ENV=production`, o middleware aplica políticas mais restritivas (ex.: **HSTS** e CSP restritiva).
- `ALLOWED_ORIGINS` também é usado no CSP (`connect-src`) e no CORS.

### Frontend (APP_CONFIG)
O frontend lê configuração via `window.APP_CONFIG`. Em produção, prefira **same-origin**:

- **`APP_CONFIG.API_BASE`**: normalmente **não precisa** (deixe vazio e use same-origin); se definir, use `https://sgvc.com.br`
- **`APP_CONFIG.REQUEST_TIMEOUT_MS`**: ex.: `10000`
- **`APP_CONFIG.DEBUG`**: `false` em produção

Como entregar `APP_CONFIG`:
- **Opção A (recomendada)**: servir um `config.js` gerado no deploy (ex.: `/var/www/sgvc/web/public/config.js`) contendo:

```js
window.APP_CONFIG = {
  API_BASE: window.location.origin,
  REQUEST_TIMEOUT_MS: 10000,
  DEBUG: false,
};
```

- **Opção B**: injetar via Nginx com template (mais avançado).

## 3) Rodar localmente do zero

### Requisitos
- Node.js (recomendado LTS)
- npm
- (Opcional) Postgres local, se quiser testar com banco

### Passos

1) Instalar dependências na raiz (workspaces):

```bash
npm install
```

2) Configurar ambiente da API:
- Crie `api/.env.local` (ou o arquivo esperado pelo seu script) com `DATABASE_URL` e secrets.
- Se **não** configurar Postgres local, a API deve subir “sem banco” em modo desenvolvimento (algumas rotas podem não funcionar).

3) Subir API:

```bash
npm run start:local
```

4) Subir frontend estático (porta 4000, compatível com Cypress):

```bash
npx http-server ./web/public -p 4000 -c-1
```

5) (Opcional) Rodar Cypress:

```bash
npm run cypress:run
```

## 4) Checklist de segurança antes do deploy

- **HTTPS ativo**
  - Nginx redirecionando `80 -> 443`
  - Certificado válido (cadeia completa)
- **CSP configurada**
  - CSP aplicada em produção e também em dev/staging (com relaxamentos controlados)
- **Cookie HttpOnly funcionando**
  - Login não retorna token no body (auth via cookies)
  - Requests do browser enviam cookies com `credentials: 'include'`
- **CSRF ativo**
  - Cookie `sgvc_csrf` presente
  - Header `X-CSRF-Token` enviado em `POST/PUT/PATCH/DELETE`
  - Endpoint `GET /api/auth/csrf` respondendo (no-store)
- **Sem `localhost` hardcoded**
  - `API_BASE` default para `window.location.origin`
- **Variáveis de ambiente corretas**
  - `NODE_ENV=production`
  - `ALLOWED_ORIGINS` com domínios reais
  - `WEB_BASE_URL` correto
  - Secrets (`JWT_SECRET`, etc.) fortes e fora do repo
  - Banco (`DATABASE_URL`) apontando para produção

