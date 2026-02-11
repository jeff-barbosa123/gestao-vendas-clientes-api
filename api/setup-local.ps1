# Script de Configuração para Ambiente Local
# Execute: .\setup-local.ps1

Write-Host "🚀 Configurando ambiente local..." -ForegroundColor Cyan

# Passo 1: Verificar se estamos no diretório correto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Erro: Execute este script no diretório 'api/'" -ForegroundColor Red
    exit 1
}

# Passo 2: Instalar dependências
Write-Host "`n📦 Instalando dependências..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao instalar dependências" -ForegroundColor Red
    exit 1
}

# Passo 3: Criar arquivo .env.local se não existir
Write-Host "`n📝 Criando arquivo .env.local..." -ForegroundColor Yellow
if (-not (Test-Path ".env.local")) {
    if (Test-Path "env.local.example") {
        Copy-Item "env.local.example" ".env.local"
        Write-Host "✅ Arquivo .env.local criado a partir de env.local.example" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Arquivo env.local.example não encontrado. Criando .env.local básico..." -ForegroundColor Yellow
        @"
# Ambiente Local (Desenvolvimento)
NODE_ENV=development
PORT=3000
WEB_BASE_URL=http://localhost:4000

# JWT Secrets (LOCAL - NÃO use em produção!)
JWT_SECRET=dev-jwt-secret-local-development-only-change-in-production
JWT_REFRESH_SECRET=dev-refresh-secret-local-development-only-change-in-production

# CORS
ALLOWED_ORIGINS=http://localhost:4000,http://127.0.0.1:4000,http://localhost:3001

# Banco de Dados (opcional - comente para rodar sem banco)
# DATABASE_URL=postgresql://sgvc:sgvc123@localhost:5432/sgvc_local

# JWT
JWT_TTL_SECONDS=900
JWT_REFRESH_TTL_SECONDS=86400

# Senhas
BCRYPT_SALT_ROUNDS=10
LOGIN_MIN_PASSWORD_LENGTH=8
LOGIN_MAX_PASSWORD_LENGTH=128
LOGIN_MAX_FAILED_ATTEMPTS=5
LOGIN_BLOCK_MINUTES=5

# Usuários Padrão
ADMIN_EMAIL=admin@sgvc.local
ADMIN_PASSWORD=Admin@123!
OTHER_USER_EMAIL=user@sgvc.local
OTHER_USER_PASSWORD=User@123!

# Recuperação de Senha
RESET_TOKEN_TTL_MINUTES=60
RESET_TOKEN_SECRET=dev-reset-token-secret-local

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
"@ | Out-File -FilePath ".env.local" -Encoding UTF8
        Write-Host "✅ Arquivo .env.local criado" -ForegroundColor Green
    }
} else {
    Write-Host "ℹ️  Arquivo .env.local já existe" -ForegroundColor Cyan
}

# Passo 4: Instalar dependências opcionais
Write-Host "`n📦 Instalando dependências opcionais (cookie-parser, json2csv)..." -ForegroundColor Yellow
npm install cookie-parser json2csv --save

# Passo 5: Verificar se bcrypt está instalado
Write-Host "`n🔍 Verificando dependências críticas..." -ForegroundColor Yellow
if (Test-Path "node_modules/bcrypt") {
    Write-Host "✅ bcrypt instalado" -ForegroundColor Green
} else {
    Write-Host "❌ bcrypt NÃO encontrado. Tentando instalar..." -ForegroundColor Red
    npm install bcrypt
}

Write-Host "`n✅ Configuração concluída!" -ForegroundColor Green
Write-Host "`n🚀 Para iniciar a aplicação, execute:" -ForegroundColor Cyan
Write-Host "   npm run dev" -ForegroundColor White
Write-Host "`n   OU" -ForegroundColor Cyan
Write-Host "   npm run dev:local" -ForegroundColor White
