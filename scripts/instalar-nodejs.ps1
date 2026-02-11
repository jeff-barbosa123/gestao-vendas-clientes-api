# Script PowerShell para instalar Node.js e configurar ambiente
# Execute como Administrador para garantir instalação completa

param(
    [switch]$Force = $false
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 Instalação do Node.js - SGVC" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se já está instalado
$nodeInstalled = $false
$nodeVersion = $null
$npmVersion = $null

try {
    $nodeVersion = node --version 2>$null
    $npmVersion = npm --version 2>$null
    if ($nodeVersion -and $npmVersion) {
        $nodeInstalled = $true
        Write-Host "✅ Node.js já está instalado!" -ForegroundColor Green
        Write-Host "   Versão Node.js: $nodeVersion" -ForegroundColor Green
        Write-Host "   Versão npm: $npmVersion" -ForegroundColor Green
        Write-Host ""
        
        if (-not $Force) {
            $continue = Read-Host "Deseja continuar mesmo assim? (S/N)"
            if ($continue -ne "S" -and $continue -ne "s") {
                Write-Host "Instalação cancelada." -ForegroundColor Yellow
                exit 0
            }
        }
    }
} catch {
    # Node.js não encontrado, continuar instalação
}

if (-not $nodeInstalled -or $Force) {
    Write-Host "📦 Iniciando instalação do Node.js..." -ForegroundColor Yellow
    Write-Host ""
    
    # Verificar se winget está disponível
    $wingetAvailable = $false
    try {
        $wingetCheck = winget --version 2>$null
        if ($wingetCheck) {
            $wingetAvailable = $true
            Write-Host "✅ Winget encontrado" -ForegroundColor Green
        }
    } catch {
        Write-Host "⚠️  Winget não encontrado" -ForegroundColor Yellow
    }
    
    if ($wingetAvailable) {
        Write-Host "📥 Instalando Node.js LTS via Winget..." -ForegroundColor Cyan
        Write-Host "   Isso pode levar alguns minutos..." -ForegroundColor Yellow
        Write-Host ""
        
        try {
            # Tentar instalar Node.js LTS
            $installOutput = winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Node.js instalado com sucesso via Winget!" -ForegroundColor Green
            } else {
                Write-Host "⚠️  Winget pode ter tido problemas. Verificando instalação..." -ForegroundColor Yellow
            }
        } catch {
            Write-Host "⚠️  Erro ao instalar via Winget: $_" -ForegroundColor Yellow
            Write-Host "   Tentando método alternativo..." -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Winget não está disponível" -ForegroundColor Red
        Write-Host ""
        Write-Host "💡 Soluções alternativas:" -ForegroundColor Yellow
        Write-Host "   1. Instalar manualmente de: https://nodejs.org/" -ForegroundColor White
        Write-Host "   2. Ou executar este script como Administrador" -ForegroundColor White
        Write-Host ""
        
        # Tentar baixar e instalar manualmente
        Write-Host "📥 Tentando download direto do Node.js..." -ForegroundColor Cyan
        
        $downloadUrl = "https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi"
        $downloadPath = "$env:TEMP\nodejs-installer.msi"
        
        try {
            Write-Host "   Baixando de: $downloadUrl" -ForegroundColor Yellow
            Invoke-WebRequest -Uri $downloadUrl -OutFile $downloadPath -UseBasicParsing
            Write-Host "✅ Download concluído" -ForegroundColor Green
            Write-Host "   Executando instalador: $downloadPath" -ForegroundColor Yellow
            Write-Host "   ⚠️  Por favor, complete a instalação manualmente" -ForegroundColor Yellow
            Start-Process $downloadPath -Wait
        } catch {
            Write-Host "❌ Erro ao baixar Node.js: $_" -ForegroundColor Red
            Write-Host ""
            Write-Host "💡 Instale manualmente:" -ForegroundColor Yellow
            Write-Host "   1. Acesse: https://nodejs.org/" -ForegroundColor White
            Write-Host "   2. Baixe a versão LTS" -ForegroundColor White
            Write-Host "   3. Execute o instalador" -ForegroundColor White
            Write-Host "   4. Marque 'Add to PATH' durante instalação" -ForegroundColor White
            exit 1
        }
    }
    
    Write-Host ""
    Write-Host "⏳ Aguardando instalação concluir..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    
    # Atualizar PATH do sistema
    Write-Host "🔄 Atualizando PATH do sistema..." -ForegroundColor Cyan
    
    $nodePath = "C:\Program Files\nodejs"
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    
    if ($currentPath -notlike "*$nodePath*") {
        try {
            $newPath = $currentPath + ";$nodePath"
            [Environment]::SetEnvironmentVariable("Path", $newPath, "Machine")
            $env:Path += ";$nodePath"
            Write-Host "✅ PATH atualizado" -ForegroundColor Green
        } catch {
            Write-Host "⚠️  Não foi possível atualizar PATH automaticamente (pode precisar de Admin)" -ForegroundColor Yellow
            Write-Host "   Execute este script como Administrador para atualizar PATH automaticamente" -ForegroundColor Yellow
        }
    } else {
        Write-Host "✅ PATH já contém Node.js" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "🔄 Atualizando variáveis de ambiente na sessão atual..." -ForegroundColor Cyan
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

# Verificar instalação final
Write-Host ""
Write-Host "🔍 Verificando instalação..." -ForegroundColor Cyan

$nodeFound = $false
$npmFound = $false

# Tentar múltiplos caminhos
$possiblePaths = @(
    "C:\Program Files\nodejs\node.exe",
    "C:\Program Files (x86)\nodejs\node.exe",
    "$env:APPDATA\npm\node.exe"
)

foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $nodeDir = Split-Path $path -Parent
        $env:Path = "$nodeDir;$env:Path"
        Write-Host "   ✅ Node.js encontrado em: $path" -ForegroundColor Green
        break
    }
}

# Verificar novamente após atualizar PATH
try {
    $nodeVersion = & "$nodeDir\node.exe" --version 2>$null
    if ($nodeVersion) {
        $nodeFound = $true
        Write-Host "   ✅ Node.js funcionando: $nodeVersion" -ForegroundColor Green
    }
} catch {
    Write-Host "   ⚠️  Node.js encontrado mas não executável" -ForegroundColor Yellow
}

try {
    $npmPath = Join-Path $nodeDir "npm.cmd"
    if (Test-Path $npmPath) {
        $npmVersion = & $npmPath --version 2>$null
        if ($npmVersion) {
            $npmFound = $true
            Write-Host "   ✅ npm funcionando: $npmVersion" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "   ⚠️  npm encontrado mas não executável" -ForegroundColor Yellow
}

if (-not $nodeFound -or -not $npmFound) {
    Write-Host ""
    Write-Host "❌ Instalação incompleta ou Node.js não está no PATH" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Solução:" -ForegroundColor Yellow
    Write-Host "   1. Feche e reabra o terminal/PowerShell" -ForegroundColor White
    Write-Host "   2. Reinicie o VS Code" -ForegroundColor White
    Write-Host "   3. Execute novamente: node --version" -ForegroundColor White
    Write-Host ""
    Write-Host "   Se ainda não funcionar, adicione manualmente ao PATH:" -ForegroundColor Yellow
    Write-Host "   C:\Program Files\nodejs" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Instalação Concluída!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Informações:" -ForegroundColor Cyan
Write-Host "   Node.js: $nodeVersion" -ForegroundColor White
Write-Host "   npm: $npmVersion" -ForegroundColor White
Write-Host ""

# Instalar dependências do projeto
Write-Host "📦 Instalando dependências do projeto..." -ForegroundColor Cyan
Write-Host ""

$projectRoot = Split-Path -Parent $PSScriptRoot
$apiPath = Join-Path $projectRoot "gestao-vendas-clientes-api"

if (Test-Path $apiPath) {
    Set-Location $apiPath
    
    # Instalar dependências da raiz
    Write-Host "   📁 Instalando dependências da raiz..." -ForegroundColor Yellow
    try {
        & npm install
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ Dependências da raiz instaladas" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  Erro ao instalar dependências da raiz" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "   ⚠️  Erro: $_" -ForegroundColor Yellow
    }
    
    # Instalar dependências da API
    $apiDir = Join-Path $apiPath "api"
    if (Test-Path $apiDir) {
        Set-Location $apiDir
        Write-Host "   📁 Instalando dependências da API..." -ForegroundColor Yellow
        try {
            & npm install
            if ($LASTEXITCODE -eq 0) {
                Write-Host "   ✅ Dependências da API instaladas" -ForegroundColor Green
            } else {
                Write-Host "   ⚠️  Erro ao instalar dependências da API" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "   ⚠️  Erro: $_" -ForegroundColor Yellow
        }
        Set-Location $apiPath
    }
    
    # Criar arquivos .env se não existirem
    $apiEnvPath = Join-Path $apiDir ".env.local"
    if (-not (Test-Path $apiEnvPath)) {
        $envExample = Join-Path $apiDir "env.local.example"
        if (Test-Path $envExample) {
            Write-Host "   📄 Criando .env.local a partir do exemplo..." -ForegroundColor Yellow
            Copy-Item $envExample $apiEnvPath
            Write-Host "   ✅ Arquivo .env.local criado" -ForegroundColor Green
            Write-Host "   ⚠️  Edite o arquivo .env.local conforme necessário" -ForegroundColor Yellow
        }
    }
    
} else {
    Write-Host "⚠️  Diretório do projeto não encontrado: $apiPath" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🎉 Configuração Completa!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Próximos passos:" -ForegroundColor Cyan
Write-Host "   1. Feche e reabra o terminal/PowerShell" -ForegroundColor White
Write-Host "   2. Reinicie o VS Code" -ForegroundColor White
Write-Host "   3. Navegue para o projeto:" -ForegroundColor White
Write-Host "      cd '$apiPath'" -ForegroundColor Gray
Write-Host "   4. Inicie a aplicação:" -ForegroundColor White
Write-Host "      npm run dev:local" -ForegroundColor Gray
Write-Host ""
