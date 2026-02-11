# Script PowerShell para iniciar a aplicação em ambiente LOCAL
# Use este script se npm não estiver no PATH

Write-Host "🚀 Iniciando SGVC - Ambiente LOCAL" -ForegroundColor Cyan
Write-Host ""

# Verificar se Node.js está instalado
$nodePath = $null
$possiblePaths = @(
    "C:\Program Files\nodejs\node.exe",
    "C:\Program Files (x86)\nodejs\node.exe",
    "$env:APPDATA\npm\node.exe",
    "$env:LOCALAPPDATA\Programs\Microsoft VS Code\bin\node.exe"
)

foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $nodePath = $path
        Write-Host "✅ Node.js encontrado em: $path" -ForegroundColor Green
        break
    }
}

if (-not $nodePath) {
    Write-Host "❌ Node.js não encontrado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Solução:" -ForegroundColor Yellow
    Write-Host "   1. Instale Node.js de: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "   2. Ou adicione Node.js ao PATH do sistema" -ForegroundColor Yellow
    Write-Host "   3. Consulte: INSTALACAO_NODEJS.md" -ForegroundColor Yellow
    exit 1
}

# Encontrar npm
$npmPath = Join-Path (Split-Path $nodePath -Parent) "npm.cmd"
if (-not (Test-Path $npmPath)) {
    Write-Host "❌ npm não encontrado em: $npmPath" -ForegroundColor Red
    exit 1
}

Write-Host "✅ npm encontrado em: $npmPath" -ForegroundColor Green
Write-Host ""

# Navegar para o diretório do projeto
$projectRoot = Split-Path -Parent $PSScriptRoot
$apiPath = Join-Path $projectRoot "gestao-vendas-clientes-api"

if (-not (Test-Path $apiPath)) {
    Write-Host "❌ Diretório do projeto não encontrado: $apiPath" -ForegroundColor Red
    exit 1
}

Set-Location $apiPath

Write-Host "📁 Diretório: $apiPath" -ForegroundColor Cyan
Write-Host ""

# Verificar se node_modules existe
$nodeModulesPath = Join-Path $apiPath "node_modules"
if (-not (Test-Path $nodeModulesPath)) {
    Write-Host "⚠️  node_modules não encontrado. Instalando dependências..." -ForegroundColor Yellow
    & $npmPath install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erro ao instalar dependências" -ForegroundColor Red
        exit 1
    }
}

# Verificar dependências da API
$apiNodeModules = Join-Path $apiPath "api\node_modules"
if (-not (Test-Path $apiNodeModules)) {
    Write-Host "⚠️  node_modules da API não encontrado. Instalando dependências..." -ForegroundColor Yellow
    Set-Location (Join-Path $apiPath "api")
    & $npmPath install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erro ao instalar dependências da API" -ForegroundColor Red
        exit 1
    }
    Set-Location $apiPath
}

Write-Host "✅ Dependências instaladas" -ForegroundColor Green
Write-Host ""

# Perguntar se quer modo dev ou start
Write-Host "Escolha o modo:" -ForegroundColor Cyan
Write-Host "  1. Desenvolvimento (nodemon - reinicia automaticamente)" -ForegroundColor White
Write-Host "  2. Produção (node simples)" -ForegroundColor White
$mode = Read-Host "Digite 1 ou 2 (padrão: 1)"

if ($mode -eq "2") {
    Write-Host "🚀 Iniciando em modo PRODUÇÃO (LOCAL)..." -ForegroundColor Cyan
    & $npmPath run start:local
} else {
    Write-Host "🚀 Iniciando em modo DESENVOLVIMENTO (LOCAL)..." -ForegroundColor Cyan
    & $npmPath run dev:local
}
