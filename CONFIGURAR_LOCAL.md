# 🚀 Configuração Rápida para Ambiente Local

Este guia ajuda a configurar o ambiente local rapidamente.

## ✅ Passo 1: Instalar Dependências

Execute no diretório `api/`:

```bash
cd api
npm install
```

## ✅ Passo 2: Criar Arquivo .env.local

Copie o arquivo de exemplo para `.env.local`:

```bash
# No Windows PowerShell:
Copy-Item env.local.example .env.local

# No Linux/Mac:
cp env.local.example .env.local
```

**OU** crie manualmente o arquivo `.env.local` no diretório `api/` com este conteúdo:

```env
# Ambiente
NODE_ENV=development

# Porta da API
PORT=3000

# URL do Frontend
WEB_BASE_URL=http://localhost:4000

# JWT Secrets (LOCAL - NÃO use em produção!)
JWT_SECRET=dev-jwt-secret-local-development-only-change-in-production
JWT_REFRESH_SECRET=dev-refresh-secret-local-development-only-change-in-production

# CORS - Local permite localhost
ALLOWED_ORIGINS=http://localhost:4000,http://127.0.0.1:4000,http://localhost:3001

# Banco de Dados (opcional para desenvolvimento)
# Comente a linha abaixo para rodar sem banco
# DATABASE_URL=postgresql://sgvc:sgvc123@localhost:5432/sgvc_local

# Configuração JWT
JWT_TTL_SECONDS=900
JWT_REFRESH_TTL_SECONDS=86400

# Configuração de Senhas
BCRYPT_SALT_ROUNDS=10
LOGIN_MIN_PASSWORD_LENGTH=8
LOGIN_MAX_PASSWORD_LENGTH=128
LOGIN_MAX_FAILED_ATTEMPTS=5
LOGIN_BLOCK_MINUTES=5

# Usuários Padrão (LOCAL)
ADMIN_EMAIL=admin@sgvc.local
ADMIN_PASSWORD=Admin@123!
OTHER_USER_EMAIL=user@sgvc.local
OTHER_USER_PASSWORD=User@123!

# Recuperação de Senha
RESET_TOKEN_TTL_MINUTES=60
RESET_TOKEN_SECRET=dev-reset-token-secret-local

# Email (opcional)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-mailtrap-user
SMTP_PASS=your-mailtrap-password
SMTP_FROM=noreply@sgvc.local

# Logging
CONSOLE_LOG_LEVEL=debug
LOG_FILE=./logs/application.log
ERROR_LOG_FILE=./logs/error.log
AUDIT_LOG_FILE=./logs/audit.log

# Limites
JSON_LIMIT=10mb

# Desenvolvimento
DISABLE_RATE_LIMIT=false
ENABLE_SWAGGER_UI=true
```

## ✅ Passo 3: Instalar Dependências Opcionais

Algumas dependências são opcionais mas recomendadas:

```bash
npm install cookie-parser json2csv
```

## ✅ Passo 4: Executar a Aplicação

```bash
npm run dev
```

**OU** usar o script específico para local:

```bash
npm run dev:local
```

## 📝 Notas Importantes

1. **Banco de Dados**: Se não configurar `DATABASE_URL`, a aplicação rodará em modo desenvolvimento sem banco. Algumas funcionalidades não funcionarão, mas o servidor iniciará.

2. **Swagger UI**: Disponível em `http://localhost:3000/api-docs` quando `ENABLE_SWAGGER_UI=true`

3. **Health Check**: Disponível em `http://localhost:3000/health`

4. **Dependências Opcionais**:
   - `cookie-parser`: Para suporte a cookies (usado pelo i18n)
   - `json2csv`: Para exportação CSV avançada (tem implementação básica sem ele)
   - `pdfkit`: Para exportação PDF (tem implementação básica sem ele)

## 🔧 Troubleshooting

### Erro: "Cannot find module 'bcrypt'"
**Solução**: Execute `npm install` no diretório `api/`

### Erro: "DATABASE_URL não configurado"
**Solução**: Isso é apenas um aviso. A aplicação continuará funcionando em modo desenvolvimento sem banco. Para usar banco, configure `DATABASE_URL` no `.env.local`

### Aplicação não inicia
**Solução**: 
1. Verifique se o arquivo `.env.local` existe no diretório `api/`
2. Verifique se todas as dependências foram instaladas: `npm install`
3. Verifique se não há erros de sintaxe: `node -c src/server.js`
