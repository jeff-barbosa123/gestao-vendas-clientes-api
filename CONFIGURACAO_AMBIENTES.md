# 🌍 Configuração de Ambientes - SGVC

Este documento descreve como configurar e executar a aplicação nos **3 ambientes disponíveis**:

1. **🔵 LOCAL** (Desenvolvimento)
2. **🟡 HMG** (Homologação/Staging)
3. **🔴 PRODUÇÃO** (Production)

---

## 📋 Índice

- [Arquivos de Configuração](#arquivos-de-configuração)
- [Ambiente LOCAL](#ambiente-local)
- [Ambiente HMG](#ambiente-hmg)
- [Ambiente PRODUÇÃO](#ambiente-produção)
- [Scripts Disponíveis](#scripts-disponíveis)
- [Docker Compose](#docker-compose)
- [Cypress por Ambiente](#cypress-por-ambiente)

---

## 📁 Arquivos de Configuração

### Arquivos de Exemplo

Os seguintes arquivos de exemplo estão disponíveis em `api/`:

- `env.local.example` → Copiar para `.env.local` (LOCAL)
- `env.hmg.example` → Copiar para `.env.hmg` (HMG)
- `env.production.example` → Copiar para `.env.production` (PRODUÇÃO)

### Como Criar Arquivos de Ambiente

```powershell
# Windows PowerShell
cd api
Copy-Item env.local.example .env.local
Copy-Item env.hmg.example .env.hmg
Copy-Item env.production.example .env.production

# Linux/Mac
cd api
cp env.local.example .env.local
cp env.hmg.example .env.hmg
cp env.production.example .env.production
```

⚠️ **IMPORTANTE:** 
- Os arquivos `.env.*` **NÃO** devem ser commitados no repositório
- Eles estão no `.gitignore`
- Cada ambiente deve ter suas próprias credenciais e configurações

---

## 🔵 Ambiente LOCAL

### Características

- **NODE_ENV:** `development`
- **Porta API:** `3000`
- **Frontend:** `http://localhost:4000`
- **Banco de Dados:** PostgreSQL local (porta `5432`) ou em memória
- **CORS:** Permite `localhost` e `127.0.0.1`
- **Logs:** Modo `debug` (mais verboso)
- **Swagger UI:** Habilitado
- **Rate Limiting:** Configurável (por padrão habilitado)

### Configuração

1. **Criar arquivo de ambiente:**
   ```powershell
   cd api
   Copy-Item env.local.example .env.local
   ```

2. **Editar `.env.local`** e ajustar conforme necessário:
   ```env
   NODE_ENV=development
   PORT=3000
   WEB_BASE_URL=http://localhost:4000
   DATABASE_URL=postgresql://sgvc:sgvc123@localhost:5432/sgvc_local
   JWT_SECRET=dev-jwt-secret-local-development-only
   ALLOWED_ORIGINS=http://localhost:4000,http://127.0.0.1:4000
   ```

3. **Iniciar banco de dados (Docker):**
   ```powershell
   docker-compose -f docker-compose.local.yml up -d
   ```

4. **Executar API:**
   ```powershell
   # Modo desenvolvimento (com nodemon - reinicia automaticamente)
   npm run dev:local
   
   # Modo produção (node simples)
   npm run start:local
   ```

### Scripts Disponíveis (LOCAL)

```powershell
# API
npm run dev:local          # Desenvolvimento com nodemon
npm run start:local        # Produção

# Banco de Dados
docker-compose -f docker-compose.local.yml up -d    # Iniciar PostgreSQL
docker-compose -f docker-compose.local.yml down     # Parar PostgreSQL

# Testes
npm run test:local         # Executar testes no ambiente local

# Validação
npm run env:local          # Validar configuração do ambiente local
```

---

## 🟡 Ambiente HMG (Homologação)

### Características

- **NODE_ENV:** `staging`
- **Porta API:** `3000` (ou conforme configuração do servidor)
- **Frontend:** `https://hmg.sgvc.com.br` (exemplo)
- **Banco de Dados:** PostgreSQL de homologação (porta `5433` no Docker local)
- **CORS:** Apenas domínios de HMG permitidos
- **Logs:** Modo `info`
- **Swagger UI:** Habilitado (para testes)
- **Rate Limiting:** Habilitado

### Configuração

1. **Criar arquivo de ambiente:**
   ```powershell
   cd api
   Copy-Item env.hmg.example .env.hmg
   ```

2. **Editar `.env.hmg`** com valores de HMG:
   ```env
   NODE_ENV=staging
   PORT=3000
   WEB_BASE_URL=https://hmg.sgvc.com.br
   DATABASE_URL=postgresql://sgvc_hmg:CHANGE_PASSWORD@hmg-db.sgvc.com.br:5432/sgvc_hmg
   JWT_SECRET=CHANGE_THIS_HMG_JWT_SECRET_MINIMUM_32_CHARACTERS
   ALLOWED_ORIGINS=https://hmg.sgvc.com.br,https://www.hmg.sgvc.com.br
   ```

3. **Gerar secrets seguros:**
   ```powershell
   # Windows (PowerShell)
   [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((New-Guid).Guid * 10))
   
   # Linux/Mac
   openssl rand -base64 32
   ```

4. **Iniciar banco de dados (Docker local - se necessário):**
   ```powershell
   docker-compose -f docker-compose.hmg.yml up -d
   ```

5. **Executar API:**
   ```powershell
   # Modo desenvolvimento
   npm run dev:hmg
   
   # Modo produção
   npm run start:hmg
   ```

### Scripts Disponíveis (HMG)

```powershell
# API
npm run dev:hmg           # Desenvolvimento com nodemon
npm run start:hmg         # Produção

# Banco de Dados (Docker local - se necessário)
docker-compose -f docker-compose.hmg.yml up -d    # Iniciar PostgreSQL HMG
docker-compose -f docker-compose.hmg.yml down     # Parar PostgreSQL HMG

# Testes
npm run test:hmg          # Executar testes no ambiente HMG

# Validação
npm run env:hmg           # Validar configuração do ambiente HMG
```

---

## 🔴 Ambiente PRODUÇÃO

### Características

- **NODE_ENV:** `production`
- **Porta API:** `3000` (ou conforme configuração do servidor)
- **Frontend:** `https://sgvc.com.br` (exemplo)
- **Banco de Dados:** PostgreSQL de produção com SSL
- **CORS:** Apenas domínios de produção permitidos
- **Logs:** Modo `warn` ou `error` (menos verboso)
- **Swagger UI:** **Desabilitado** por segurança
- **Rate Limiting:** **Sempre habilitado**

### ⚠️ Configuração Crítica

1. **Criar arquivo de ambiente:**
   ```powershell
   cd api
   Copy-Item env.production.example .env.production
   ```

2. **Editar `.env.production`** com **valores únicos e seguros:**
   ```env
   NODE_ENV=production
   PORT=3000
   WEB_BASE_URL=https://sgvc.com.br
   DATABASE_URL=postgresql://sgvc_prod:CHANGE_STRONG_PASSWORD@prod-db.sgvc.com.br:5432/sgvc_production?ssl=true
   JWT_SECRET=CHANGE_THIS_PRODUCTION_JWT_SECRET_MINIMUM_32_CHARACTERS_AND_RANDOM
   ALLOWED_ORIGINS=https://sgvc.com.br,https://www.sgvc.com.br
   ENABLE_SWAGGER_UI=false
   ```

3. **Gerar secrets únicos e aleatórios:**
   ```powershell
   # Windows (PowerShell)
   [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((New-Guid).Guid * 10))
   
   # Linux/Mac
   openssl rand -base64 32
   ```

4. **⚠️ Checklist Antes de Produção:**
   - [ ] Todos os secrets foram alterados
   - [ ] `JWT_SECRET` e `JWT_REFRESH_SECRET` são únicos e aleatórios
   - [ ] Senhas de admin foram alteradas
   - [ ] CORS configurado apenas com domínios de produção
   - [ ] Banco de dados configurado com SSL
   - [ ] Email configurado e testado
   - [ ] Swagger UI desabilitado (`ENABLE_SWAGGER_UI=false`)
   - [ ] Rate limiting habilitado
   - [ ] Logs configurados e rotacionados
   - [ ] Backup do banco configurado
   - [ ] Monitoramento configurado
   - [ ] SSL/HTTPS configurado no servidor web
   - [ ] Firewall configurado

5. **Executar API:**
   ```powershell
   # Modo produção (NUNCA use dev em produção)
   npm run start:prod
   ```

### Scripts Disponíveis (PRODUÇÃO)

```powershell
# API (somente produção)
npm run start:prod        # Iniciar em modo produção

# Validação
npm run env:prod          # Validar configuração do ambiente produção
```

⚠️ **NUNCA** use `npm run dev:prod` ou `npm run dev` em produção!

---

## 🚀 Scripts Disponíveis

### Scripts de API

| Script | Descrição | Ambiente |
|--------|-----------|----------|
| `npm run start:local` | Iniciar API em modo produção (LOCAL) | LOCAL |
| `npm run dev:local` | Iniciar API em modo desenvolvimento (LOCAL) | LOCAL |
| `npm run start:hmg` | Iniciar API em modo produção (HMG) | HMG |
| `npm run dev:hmg` | Iniciar API em modo desenvolvimento (HMG) | HMG |
| `npm run start:prod` | Iniciar API em modo produção (PRODUÇÃO) | PRODUÇÃO |

### Scripts de Validação

| Script | Descrição | Ambiente |
|--------|-----------|----------|
| `npm run env:local` | Validar configuração do ambiente LOCAL | LOCAL |
| `npm run env:hmg` | Validar configuração do ambiente HMG | HMG |
| `npm run env:prod` | Validar configuração do ambiente PRODUÇÃO | PRODUÇÃO |

### Scripts de Testes

| Script | Descrição | Ambiente |
|--------|-----------|----------|
| `npm run test:local` | Executar testes no ambiente LOCAL | LOCAL |
| `npm run test:hmg` | Executar testes no ambiente HMG | HMG |

---

## 🐳 Docker Compose

### Arquivos Docker Compose por Ambiente

- **`docker-compose.yml`** - Configuração padrão (usado localmente)
- **`docker-compose.local.yml`** - PostgreSQL para ambiente LOCAL
- **`docker-compose.hmg.yml`** - PostgreSQL para ambiente HMG (porta `5433`)

### Comandos Docker

```powershell
# LOCAL
docker-compose -f docker-compose.local.yml up -d      # Iniciar
docker-compose -f docker-compose.local.yml down       # Parar
docker-compose -f docker-compose.local.yml logs       # Ver logs

# HMG
docker-compose -f docker-compose.hmg.yml up -d        # Iniciar
docker-compose -f docker-compose.hmg.yml down         # Parar
docker-compose -f docker-compose.hmg.yml logs         # Ver logs
```

### Portas Docker

- **LOCAL:** PostgreSQL na porta `5432`
- **HMG (Docker local):** PostgreSQL na porta `5433` (para não conflitar)

---

## 🧪 Cypress por Ambiente

### Scripts Cypress

| Script | Descrição | Base URL |
|--------|-----------|----------|
| `npm run cypress:open:local` | Abrir Cypress (LOCAL) | `http://localhost:4000` |
| `npm run cypress:open:hmg` | Abrir Cypress (HMG) | `https://hmg.sgvc.com.br` |
| `npm run cypress:open:prod` | Abrir Cypress (PRODUÇÃO) | `https://sgvc.com.br` |
| `npm run cypress:run:local` | Executar testes headless (LOCAL) | `http://localhost:4000` |
| `npm run cypress:run:hmg` | Executar testes headless (HMG) | `https://hmg.sgvc.com.br` |
| `npm run cypress:run:prod` | Executar testes headless (PRODUÇÃO) | `https://sgvc.com.br` |

### Configuração Manual do Cypress

Para configurar manualmente o ambiente no Cypress, edite `cypress.config.js`:

```javascript
module.exports = defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:4000',
    // ...
  },
});
```

Ou use variável de ambiente:
```powershell
$env:CYPRESS_BASE_URL="https://hmg.sgvc.com.br"
npm run cypress:open
```

---

## 🔐 Segurança por Ambiente

### LOCAL (Desenvolvimento)

- ✅ Senhas mais simples permitidas (para desenvolvimento)
- ✅ Swagger UI habilitado
- ✅ Logs verbosos (debug)
- ✅ CORS permissivo (localhost)

### HMG (Homologação)

- ⚠️ Senhas fortes obrigatórias
- ✅ Swagger UI habilitado (para testes)
- ✅ Logs normais (info)
- ⚠️ CORS restrito (apenas domínios HMG)

### PRODUÇÃO

- 🔴 Senhas fortes **obrigatórias**
- 🔴 Swagger UI **desabilitado**
- 🔴 Logs mínimos (warn/error)
- 🔴 CORS **muito restrito** (apenas domínios produção)
- 🔴 Rate limiting **sempre habilitado**
- 🔴 SSL/HTTPS **obrigatório**
- 🔴 Secrets únicos e aleatórios **obrigatórios**

---

## 📝 Exemplo de Uso Completo

### Cenário: Desenvolvimento Local

```powershell
# 1. Criar arquivo de ambiente
cd api
Copy-Item env.local.example .env.local

# 2. Editar .env.local (opcional - valores padrão funcionam)
# ...

# 3. Iniciar banco de dados
docker-compose -f docker-compose.local.yml up -d

# 4. Iniciar API em modo desenvolvimento
npm run dev:local

# 5. Em outro terminal, abrir Cypress para testes
cd ..
npm run cypress:open:local
```

### Cenário: Deploy em HMG

```powershell
# 1. Criar arquivo de ambiente
cd api
Copy-Item env.hmg.example .env.hmg

# 2. Editar .env.hmg com valores reais de HMG
# ...

# 3. Validar configuração
npm run env:hmg

# 4. Iniciar API
npm run start:hmg

# 5. Testar com Cypress (opcional)
cd ..
npm run cypress:run:hmg
```

### Cenário: Deploy em Produção

```powershell
# 1. Criar arquivo de ambiente (no servidor de produção)
cd api
Copy-Item env.production.example .env.production

# 2. Editar .env.production com valores seguros e únicos
# ⚠️ ATENÇÃO: Use secrets gerados aleatoriamente!
# ...

# 3. Validar configuração
npm run env:prod

# 4. Checklist de segurança (ver seção acima)
# ...

# 5. Iniciar API
npm run start:prod

# 6. Monitorar logs
# ...
```

---

## 🆘 Troubleshooting

### Problema: "Arquivo .env não encontrado"

**Solução:**
```powershell
# Certifique-se de criar o arquivo .env correspondente
cd api
Copy-Item env.local.example .env.local
```

### Problema: "CORS error"

**Solução:**
- Verifique se `ALLOWED_ORIGINS` está configurado corretamente
- Em LOCAL, certifique-se de incluir `http://localhost:4000`
- Em HMG/PROD, certifique-se de usar HTTPS e domínios corretos

### Problema: "JWT_SECRET não configurado"

**Solução:**
- Gere um secret seguro: `openssl rand -base64 32`
- Adicione no arquivo `.env` correspondente
- Reinicie a aplicação

### Problema: "Porta já em uso"

**Solução:**
- Verifique se outra instância da API está rodando
- Altere a porta no arquivo `.env` se necessário
- Em HMG, use porta diferente se necessário

---

## 📚 Referências

- [ENV_VARIABLES.md](./api/ENV_VARIABLES.md) - Documentação completa de variáveis de ambiente
- [EXECUTAR_TESTES.md](./EXECUTAR_TESTES.md) - Instruções para executar testes Cypress

---

**Última atualização:** Dezembro 2024
