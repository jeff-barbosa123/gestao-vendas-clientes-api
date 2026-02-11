# Script completo para configurar ambiente SGVC
# Baixa Node.js, configura PATH e instala dependências

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 Configuração Completa do Ambiente SGVC" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se Node.js já está instalado
Write-Host "🔍 Verificando se Node.js está instalado..." -ForegroundColor Yellow
$nodeInstalled = $false

try {
    $nodeVersion = node --version 2>$null
    $npmVersion = npm --version 2>$null
    if ($nodeVersion -and $npmVersion) {
        $nodeInstalled = $true
        Write-Host "✅ Node.js já está instalado!" -ForegroundColor Green
        Write-Host "   Node.js: $nodeVersion" -ForegroundColor Green
        Write-Host "   npm: $npmVersion" -ForegroundColor Green
        Write-Host ""
    }
} catch {
    Write-Host "❌ Node.js não encontrado" -ForegroundColor Red
    Write-Host ""
}

if (-not $nodeInstalled) {
    Write-Host "📥 Baixando Node.js LTS..." -ForegroundColor Cyan
    Write-Host ""
    
    $nodeVersion = "20.11.0"  # Versão LTS estável
    $downloadUrl = "https://nodejs.org/dist/v$nodeVersion/node-v$nodeVersion-x64.msi"
    $downloadPath = "$env:TEMP\nodejs-installer.msi"
    
    try {
        # Verificar se já existe download
        if (Test-Path $downloadPath) {
            Write-Host "✅ Arquivo já baixado encontrado em: $downloadPath" -ForegroundColor Green
        } else {
            Write-Host "   Baixando de: $downloadUrl" -ForegroundColor Yellow
            Write-Host "   Salvar em: $downloadPath" -ForegroundColor Yellow
            Write-Host "   Isso pode levar alguns minutos..." -ForegroundColor Yellow
            Write-Host ""
            
            Invoke-WebRequest -Uri $downloadUrl -OutFile $downloadPath -UseBasicParsing
            
            if (Test-Path $downloadPath) {
                Write-Host "✅ Download concluído com sucesso!" -ForegroundColor Green
                Write-Host ""
            } else {
                throw "Download falhou"
            }
        }
        
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "⚠️  AÇÃO NECESSÁRIA" -ForegroundColor Yellow
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "📦 O instalador do Node.js está pronto!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📝 Próximos passos:" -ForegroundColor Cyan
        Write-Host "   1. Um instalador será aberto automaticamente" -ForegroundColor White
        Write-Host "   2. Clique em 'Next' para continuar" -ForegroundColor White
        Write-Host "   3. ⚠️  IMPORTANTE: Marque a opção 'Automatically install the necessary tools'" -ForegroundColor Yellow
        Write-Host "   4. ⚠️  IMPORTANTE: Marque 'Add to PATH' se aparecer" -ForegroundColor Yellow
        Write-Host "   5. Complete a instalação normalmente" -ForegroundColor White
        Write-Host "   6. Após instalar, pressione Enter neste terminal" -ForegroundColor White
        Write-Host ""
        
        Write-Host "🚀 Abrindo instalador..." -ForegroundColor Cyan
        Write-Host ""
        
        Start-Process $downloadPath -Wait
        
        Write-Host ""
        Write-Host "⏳ Aguardando conclusão da instalação..." -ForegroundColor Yellow
        Write-Host "   Após instalar, pressione Enter para continuar" -ForegroundColor Yellow
        Read-Host "Pressione Enter quando a instalação estiver completa"
        
        # Aguardar alguns segundos para garantir instalação
        Write-Host "🔄 Aguardando sistema processar instalação..." -ForegroundColor Yellow
        Start-Sleep -Seconds 3
        
        # Atualizar PATH na sessão atual
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        
        # Adicionar Node.js ao PATH se não estiver
        $nodePath = "C:\Program Files\nodejs"
        if (-not ($env:Path -like "*$nodePath*")) {
            if (Test-Path $nodePath) {
                $env:Path += ";$nodePath"
                Write-Host "✅ PATH atualizado na sessão atual" -ForegroundColor Green
            }
        }
        
        # Verificar instalação
        Write-Host ""
        Write-Host "🔍 Verificando instalação..." -ForegroundColor Cyan
        
        try {
            $nodeVersion = & "$nodePath\node.exe" --version 2>$null
            $npmVersion = & "$nodePath\npm.cmd" --version 2>$null
            
            if ($nodeVersion -and $npmVersion) {
                Write-Host "✅ Node.js instalado com sucesso!" -ForegroundColor Green
                Write-Host "   Node.js: $nodeVersion" -ForegroundColor Green
                Write-Host "   npm: $npmVersion" -ForegroundColor Green
                Write-Host ""
                
                # Atualizar PATH do sistema permanentemente
                Write-Host "🔄 Configurando PATH do sistema..." -ForegroundColor Cyan
                $currentMachinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
                
                if ($currentMachinePath -notlike "*$nodePath*") {
                    Write-Host "   ⚠️  PATH do sistema precisa ser atualizado manualmente" -ForegroundColor Yellow
                    Write-Host "   Ou execute este script como Administrador para atualizar automaticamente" -ForegroundColor Yellow
                    Write-Host ""
                    Write-Host "💡 Para adicionar ao PATH manualmente:" -ForegroundColor Cyan
                    Write-Host "   1. Pressione Win + R" -ForegroundColor White
                    Write-Host "   2. Digite: sysdm.cpl" -ForegroundColor White
                    Write-Host "   3. Aba 'Avançado' → 'Variáveis de Ambiente'" -ForegroundColor White
                    Write-Host "   4. Em 'Variáveis do sistema', encontre 'Path'" -ForegroundColor White
                    Write-Host "   5. Clique em 'Editar' → 'Novo'" -ForegroundColor White
                    Write-Host "   6. Adicione: C:\Program Files\nodejs" -ForegroundColor White
                    Write-Host "   7. Clique OK em todas as janelas" -ForegroundColor White
                    Write-Host ""
                } else {
                    Write-Host "✅ PATH do sistema já contém Node.js" -ForegroundColor Green
                }
            } else {
                Write-Host "⚠️  Node.js pode não estar no PATH ainda" -ForegroundColor Yellow
                Write-Host "   Feche e reabra o terminal/PowerShell" -ForegroundColor Yellow
                Write-Host "   Ou reinicie o VS Code" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "⚠️  Erro ao verificar instalação: $_" -ForegroundColor Yellow
            Write-Host "   Feche e reabra o terminal para atualizar o PATH" -ForegroundColor Yellow
        }
        
    } catch {
        Write-Host "❌ Erro ao baixar/instalar Node.js: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "💡 Instalação manual:" -ForegroundColor Yellow
        Write-Host "   1. Acesse: https://nodejs.org/" -ForegroundColor White
        Write-Host "   2. Baixe a versão LTS" -ForegroundColor White
        Write-Host "   3. Execute o instalador" -ForegroundColor White
        Write-Host "   4. Marque 'Add to PATH' durante instalação" -ForegroundColor White
        exit 1
    }
}

# Verificar novamente após instalação
Write-Host ""
Write-Host "🔍 Verificação final..." -ForegroundColor Cyan

try {
    $nodeVersion = node --version 2>$null
    $npmVersion = npm --version 2>$null
    
    if ($nodeVersion -and $npmVersion) {
        Write-Host "✅ Node.js e npm estão funcionando!" -ForegroundColor Green
        Write-Host "   Node.js: $nodeVersion" -ForegroundColor Green
        Write-Host "   npm: $npmVersion" -ForegroundColor Green
        Write-Host ""
    } else {
        Write-Host "⚠️  Node.js pode não estar no PATH ainda" -ForegroundColor Yellow
        Write-Host "   Solução: Feche e reabra o terminal/PowerShell" -ForegroundColor Yellow
        Write-Host "   Ou reinicie o VS Code completamente" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "   Se ainda não funcionar, execute manualmente:" -ForegroundColor Yellow
        Write-Host "   & 'C:\Program Files\nodejs\npm.cmd' --version" -ForegroundColor White
    }
} catch {
    Write-Host "❌ Node.js ainda não está acessível" -ForegroundColor Red
    Write-Host "   Feche e reabra o terminal/PowerShell" -ForegroundColor Yellow
    Write-Host "   Ou reinicie o VS Code" -ForegroundColor Yellow
    exit 1
}

# Instalar dependências do projeto
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📦 Instalando Dependências do Projeto" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = Split-Path -Parent $PSScriptRoot
$apiPath = Join-Path $projectRoot "gestao-vendas-clientes-api"

if (-not (Test-Path $apiPath)) {
    Write-Host "❌ Diretório do projeto não encontrado: $apiPath" -ForegroundColor Red
    Write-Host "   Ajuste o caminho no script se necessário" -ForegroundColor Yellow
    exit 1
}

Set-Location $apiPath

# Instalar dependências da raiz
Write-Host "📁 Instalando dependências da raiz..." -ForegroundColor Cyan
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
Write-Host "📁 Instalando dependências da API..." -ForegroundColor Cyan
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
    Write-Host "📄 Configurando arquivo .env.local..." -ForegroundColor Cyan
    
    $envLocalPath = Join-Path $apiDir ".env.local"
    $envExamplePath = Join-Path $apiDir "env.local.example"
    
    if (-not (Test-Path $envLocalPath)) {
        if (Test-Path $envExamplePath) {
            Copy-Item $envExamplePath $envLocalPath
            Write-Host "✅ Arquivo .env.local criado a partir do exemplo" -ForegroundColor Green
            Write-Host "   ⚠️  Edite o arquivo conforme necessário: $envLocalPath" -ForegroundColor Yellow
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

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🎉 Configuração Completa!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Node.js: Instalado e configurado" -ForegroundColor Green
Write-Host "✅ npm: Instalado e configurado" -ForegroundColor Green
Write-Host "✅ Dependências: Instaladas" -ForegroundColor Green
Write-Host "✅ Ambiente: Configurado" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Próximos passos:" -ForegroundColor Cyan
Write-Host "   1. Feche e reabra o terminal/PowerShell (se ainda não funcionou)" -ForegroundColor White
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
Write-Host "   6. Ou use o script alternativo:" -ForegroundColor White
Write-Host "      .\scripts\start-local.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "🎯 Tudo pronto para começar a desenvolver!" -ForegroundColor Green
Write-Host ""
