@echo off
echo ========================================
echo 🚀 Instalacao do Node.js - SGVC
echo ========================================
echo.

echo Verificando se Node.js ja esta instalado...
where node >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Node.js ja esta instalado!
    node --version
    npm --version
    echo.
    echo Pressione qualquer tecla para continuar mesmo assim...
    pause >nul
)

echo.
echo 📥 Baixando Node.js LTS...
echo.

set "NODE_VERSION=20.11.0"
set "DOWNLOAD_URL=https://nodejs.org/dist/v%NODE_VERSION%/node-v%NODE_VERSION%-x64.msi"
set "DOWNLOAD_PATH=%TEMP%\nodejs-installer.msi"

echo Baixando de: %DOWNLOAD_URL%
echo Salvar em: %DOWNLOAD_PATH%
echo.

powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%DOWNLOAD_URL%' -OutFile '%DOWNLOAD_PATH%'}"

if not exist "%DOWNLOAD_PATH%" (
    echo ❌ Erro ao baixar Node.js
    echo.
    echo 💡 Instale manualmente de: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Download concluido!
echo.
echo ========================================
echo ⚠️  AÇÃO NECESSÁRIA
echo ========================================
echo.
echo 📦 O instalador do Node.js esta pronto!
echo.
echo 📝 Proximos passos:
echo    1. Um instalador sera aberto automaticamente
echo    2. Clique em 'Next' para continuar
echo    3. ⚠️  IMPORTANTE: Marque a opcao 'Automatically install the necessary tools'
echo    4. ⚠️  IMPORTANTE: Marque 'Add to PATH' se aparecer
echo    5. Complete a instalacao normalmente
echo.

start /wait "" "%DOWNLOAD_PATH%"

echo.
echo ⏳ Aguardando conclusao da instalacao...
echo.
echo ✅ Instalacao concluida!
echo.
echo 🔄 Atualizando variaveis de ambiente...
echo.

rem Atualizar PATH na sessao atual
setx PATH "%PATH%;C:\Program Files\nodejs" /M >nul 2>&1
set "PATH=%PATH%;C:\Program Files\nodejs"

echo 🔍 Verificando instalacao...
echo.

if exist "C:\Program Files\nodejs\node.exe" (
    "C:\Program Files\nodejs\node.exe" --version
    "C:\Program Files\nodejs\npm.cmd" --version
    echo.
    echo ✅ Node.js instalado com sucesso!
) else (
    echo ⚠️  Node.js pode nao estar no PATH ainda
    echo    Feche e reabra o terminal
    echo    Ou reinicie o VS Code
)

echo.
echo ========================================
echo 🎉 Configuracao Concluida!
echo ========================================
echo.
echo 📝 Proximos passos:
echo    1. Feche e reabra o terminal/PowerShell
echo    2. Ou reinicie o VS Code completamente
echo    3. Verifique se funciona:
echo       node --version
echo       npm --version
echo.
pause
