# ⚡ Solução Rápida - Configuração Local

## 🎯 Problema Identificado
- ❌ Módulo `bcrypt` não encontrado (dependências não instaladas)
- ❌ Arquivo `.env.local` não existe
- ❌ Algumas dependências opcionais podem faltar

## ✅ Solução em 3 Passos

### Passo 1: Navegar para o diretório correto
```powershell
cd api
```

### Passo 2: Instalar todas as dependências
```powershell
npm install
```

Isso instalará todas as dependências do `package.json`, incluindo:
- ✅ bcrypt
- ✅ cookie-parser (já adicionado ao package.json)
- ✅ json2csv (já adicionado ao package.json)
- ✅ E todas as outras...

### Passo 3: Criar arquivo .env.local

**Opção A - Copiar do exemplo:**
```powershell
Copy-Item env.local.example .env.local
```

**Opção B - Criar manualmente:**
Crie um arquivo chamado `.env.local` (com ponto inicial) no diretório `api/` com este conteúdo:

```env
NODE_ENV=development
PORT=3000
WEB_BASE_URL=http://localhost:4000

JWT_SECRET=dev-jwt-secret-local-development-only-change-in-production
JWT_REFRESH_SECRET=dev-refresh-secret-local-development-only-change-in-production

ALLOWED_ORIGINS=http://localhost:4000,http://127.0.0.1:4000,http://localhost:3001

# Banco opcional - comente para rodar sem banco
# DATABASE_URL=postgresql://sgvc:sgvc123@localhost:5432/sgvc_local

JWT_TTL_SECONDS=900
JWT_REFRESH_TTL_SECONDS=86400

BCRYPT_SALT_ROUNDS=10
LOGIN_MIN_PASSWORD_LENGTH=8
LOGIN_MAX_PASSWORD_LENGTH=128
LOGIN_MAX_FAILED_ATTEMPTS=5
LOGIN_BLOCK_MINUTES=5

ADMIN_EMAIL=admin@sgvc.local
ADMIN_PASSWORD=Admin@123!
OTHER_USER_EMAIL=user@sgvc.local
OTHER_USER_PASSWORD=User@123!

RESET_TOKEN_TTL_MINUTES=60
RESET_TOKEN_SECRET=dev-reset-token-secret-local

CONSOLE_LOG_LEVEL=debug
LOG_FILE=./logs/application.log
ERROR_LOG_FILE=./logs/error.log
AUDIT_LOG_FILE=./logs/audit.log

JSON_LIMIT=10mb
DISABLE_RATE_LIMIT=false
ENABLE_SWAGGER_UI=true
```

## 🚀 Iniciar Aplicação

Após os passos acima:

```powershell
npm run dev
```

OU use o script específico para local:

```powershell
npm run dev:local
```

## 📋 Verificação Rápida

Execute estes comandos para verificar se está tudo certo:

```powershell
# 1. Verificar se .env.local existe
Test-Path .env.local

# 2. Verificar se bcrypt está instalado
Test-Path node_modules\bcrypt

# 3. Testar sintaxe do código
node -c src/server.js
```

## ⚠️ Importante

1. **Nome do arquivo**: O arquivo deve ser `.env.local` (com ponto inicial), não `env.local`
2. **Localização**: O arquivo deve estar no diretório `api/`, não na raiz do projeto
3. **Banco de Dados**: Se não configurar `DATABASE_URL`, a aplicação funcionará sem banco (modo desenvolvimento)

## 🔧 Se Ainda Tiver Problemas

### Erro: "Cannot find module 'X'"
Execute: `npm install X`

### Erro: "DATABASE_URL não configurado"
Isso é apenas um aviso. A aplicação continuará funcionando. Para usar banco PostgreSQL, descomente a linha `DATABASE_URL` no `.env.local`

### Script Automático
Execute o script de setup (se estiver no diretório `api/`):
```powershell
.\setup-local.ps1
```
