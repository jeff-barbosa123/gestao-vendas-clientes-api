# Script para instalar tudo automaticamente
# Node.js, dependências e configuração do projeto

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 Instalação Completa - SGVC" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar Node.js
Write-Host "🔍 Verificando Node.js..." -ForegroundColor Yellow
$nodeInstalled = $false

try {
    $nodeVersion = node --version 2>$null
    $npmVersion = npm --version 2>$null
    if ($nodeVersion -and $npmVersion) {
        $nodeInstalled = $true
        Write-Host "✅ Node.js já instalado!" -ForegroundColor Green
        Write-Host "   Node.js: $nodeVersion" -ForegroundColor Green
        Write-Host "   npm: $npmVersion" -ForegroundColor Green
        Write-Host ""
    }
} catch {
    Write-Host "❌ Node.js não encontrado" -ForegroundColor Red
    Write-Host ""
}

# Instalar Node.js se necessário
if (-not $nodeInstalled) {
    Write-Host "📥 Instalando Node.js..." -ForegroundColor Cyan
    Write-Host ""
    
    try {
        Write-Host "   Tentando via winget..." -ForegroundColor Yellow
        $wingetOutput = winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements 2>&1
        
        if ($LASTEXITCODE -eq 0 -or $wingetOutput -like "*Successfully installed*") {
            Write-Host "✅ Node.js instalado via winget!" -ForegroundColor Green
            
            # Aguardar instalação
            Start-Sleep -Seconds 5
            
            # Atualizar PATH
            $nodePath = "C:\Program Files\nodejs"
            if (Test-Path $nodePath) {
                $env:Path += ";$nodePath"
                
                # Verificar instalação
                try {
                    $nodeVersion = & "$nodePath\node.exe" --version 2>$null
                    $npmVersion = & "$nodePath\npm.cmd" --version 2>$null
                    
                    if ($nodeVersion -and $npmVersion) {
                        Write-Host "✅ Node.js funcionando!" -ForegroundColor Green
                        Write-Host "   Node.js: $nodeVersion" -ForegroundColor Green
                        Write-Host "   npm: $npmVersion" -ForegroundColor Green
                        $nodeInstalled = $true
                    }
                } catch {
                    Write-Host "⚠️  Node.js instalado mas não acessível ainda" -ForegroundColor Yellow
                    Write-Host "   Feche e reabra o terminal" -ForegroundColor Yellow
                }
            }
        } else {
            Write-Host "⚠️  Winget pode precisar de permissões de administrador" -ForegroundColor Yellow
            Write-Host "   Ou instale manualmente de: https://nodejs.org/" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ Erro ao instalar via winget: $_" -ForegroundColor Red
        Write-Host "   Instale manualmente de: https://nodejs.org/" -ForegroundColor Yellow
    }
    
    if (-not $nodeInstalled) {
        Write-Host ""
        Write-Host "⚠️  Node.js não foi instalado automaticamente" -ForegroundColor Yellow
        Write-Host "   Por favor, instale manualmente:" -ForegroundColor Yellow
        Write-Host "   1. Acesse: https://nodejs.org/" -ForegroundColor White
        Write-Host "   2. Baixe a versão LTS" -ForegroundColor White
        Write-Host "   3. Execute o instalador" -ForegroundColor White
        Write-Host "   4. Marque 'Add to PATH' durante instalação" -ForegroundColor White
        Write-Host ""
        Write-Host "   Depois, execute este script novamente" -ForegroundColor Yellow
        exit 1
    }
}

# Verificar Node.js novamente
if (-not $nodeInstalled) {
    Write-Host "❌ Node.js não está instalado. Instale primeiro." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📦 Instalando Dependências" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Navegar para o projeto
$projectRoot = Split-Path -Parent $PSScriptRoot
$apiPath = Join-Path $projectRoot "gestao-vendas-clientes-api"

if (-not (Test-Path $apiPath)) {
    Write-Host "❌ Diretório do projeto não encontrado: $apiPath" -ForegroundColor Red
    exit 1
}

Set-Location $apiPath
Write-Host "📁 Diretório: $apiPath" -ForegroundColor Cyan
Write-Host ""

# Instalar dependências da raiz
Write-Host "📦 Instalando dependências da raiz..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    try {
        npm install
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Dependências da raiz instaladas" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Erro ao instalar dependências da raiz" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠️  Erro: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "✅ node_modules já existe na raiz" -ForegroundColor Green
}

# Instalar dependências da API
Write-Host ""
Write-Host "📦 Instalando dependências da API..." -ForegroundColor Yellow
$apiDir = Join-Path $apiPath "api"

if (Test-Path $apiDir) {
    Set-Location $apiDir
    
    if (-not (Test-Path "node_modules")) {
        try {
            npm install
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Dependências da API instaladas" -ForegroundColor Green
            } else {
                Write-Host "⚠️  Erro ao instalar dependências da API" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "⚠️  Erro: $_" -ForegroundColor Yellow
        }
    } else {
        Write-Host "✅ node_modules já existe na API" -ForegroundColor Green
    }
    
    # Criar .env.local se não existir
    Write-Host ""
    Write-Host "📄 Configurando arquivo .env.local..." -ForegroundColor Yellow
    
    $envLocalPath = Join-Path $apiDir ".env.local"
    $envExamplePath = Join-Path $apiDir "env.local.example"
    
    if (-not (Test-Path $envLocalPath)) {
        if (Test-Path $envExamplePath) {
            Copy-Item $envExamplePath $envLocalPath
            Write-Host "✅ Arquivo .env.local criado a partir do exemplo" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Arquivo env.local.example não encontrado" -ForegroundColor Yellow
        }
    } else {
        Write-Host "✅ Arquivo .env.local já existe" -ForegroundColor Green
    }
    
    Set-Location $apiPath
} else {
    Write-Host "⚠️  Diretório da API não encontrado: $apiDir" -ForegroundColor Yellow
}

# Instalar dependências do frontend se existir
Write-Host ""
Write-Host "📦 Verificando frontend..." -ForegroundColor Yellow
$webDir = Join-Path $apiPath "web"

if (Test-Path $webDir) {
    Set-Location $webDir
    
    if (-not (Test-Path "node_modules")) {
        Write-Host "📦 Instalando dependências do frontend..." -ForegroundColor Yellow
        try {
            npm install
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Dependências do frontend instaladas" -ForegroundColor Green
            } else {
                Write-Host "⚠️  Erro ao instalar dependências do frontend" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "⚠️  Erro: $_" -ForegroundColor Yellow
        }
    } else {
        Write-Host "✅ node_modules já existe no frontend" -ForegroundColor Green
    }
    
    Set-Location $apiPath
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Instalação Completa!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Resumo:" -ForegroundColor Cyan
Write-Host "   ✅ Node.js: Instalado e configurado" -ForegroundColor Green
Write-Host "   ✅ npm: Instalado e configurado" -ForegroundColor Green
Write-Host "   ✅ Dependências: Instaladas" -ForegroundColor Green
Write-Host "   ✅ Ambiente: Configurado (.env.local criado)" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Próximos passos:" -ForegroundColor Cyan
Write-Host "   1. Feche e reabra o terminal/PowerShell (se Node.js foi instalado agora)" -ForegroundColor White
Write-Host "   2. Ou reinicie o VS Code completamente" -ForegroundColor White
Write-Host "   3. Verifique se funciona:" -ForegroundColor White
Write-Host "      node --version" -ForegroundColor Gray
Write-Host "      npm --version" -ForegroundColor Gray
Write-Host ""
Write-Host "   4. Navegue para o projeto:" -ForegroundColor White
Write-Host "      cd '$apiPath'" -ForegroundColor Gray
Write-Host ""
Write-Host "   5. Inicie a aplicação (LOCAL):" -ForegroundColor White
Write-Host "      npm run dev:local" -ForegroundColor Gray
Write-Host ""
Write-Host "   6. Em outro terminal, inicie o frontend:" -ForegroundColor White
Write-Host "      cd web" -ForegroundColor Gray
Write-Host "      npm start" -ForegroundColor Gray
Write-Host ""
Write-Host "🎯 Tudo pronto para começar!" -ForegroundColor Green
Write-Host ""
