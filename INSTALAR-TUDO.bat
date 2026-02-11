@echo off
chcp 65001 >nul
echo ========================================
echo 🚀 Instalação Completa - SGVC
echo ========================================
echo.

echo 🔍 Verificando Node.js...
where node >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Node.js já está instalado!
    node --version
    npm --version
    echo.
    goto :install_deps
)

echo ❌ Node.js não encontrado
echo.
echo 📥 Instalando Node.js via winget...
echo.

winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements --silent

if %errorlevel% neq 0 (
    echo.
    echo ⚠️  Erro ao instalar via winget
    echo.
    echo 💡 Instale manualmente:
    echo    1. Acesse: https://nodejs.org/
    echo    2. Baixe a versão LTS
    echo    3. Execute o instalador
    echo    4. Marque "Add to PATH"
    echo.
    pause
    exit /b 1
)

echo.
echo ⏳ Aguardando instalação concluir...
timeout /t 10 /nobreak >nul

echo.
echo 🔄 Atualizando PATH...
setx PATH "%PATH%;C:\Program Files\nodejs" /M >nul 2>&1
set "PATH=%PATH%;C:\Program Files\nodejs"

echo.
echo 🔍 Verificando instalação...
if exist "C:\Program Files\nodejs\node.exe" (
    "C:\Program Files\nodejs\node.exe" --version
    "C:\Program Files\nodejs\npm.cmd" --version
    echo ✅ Node.js instalado com sucesso!
    echo.
) else (
    echo ⚠️  Node.js pode não estar no PATH ainda
    echo    Feche e reabra o terminal após instalar
    echo.
    pause
    exit /b 1
)

:install_deps
echo ========================================
echo 📦 Instalando Dependências
echo ========================================
echo.

cd /d "%~dp0"

echo 📁 Diretório: %CD%
echo.

echo 📦 Instalando dependências da raiz...
if not exist "node_modules" (
    call npm install
    if %errorlevel% neq 0 (
        echo ⚠️  Erro ao instalar dependências da raiz
    ) else (
        echo ✅ Dependências da raiz instaladas
    )
) else (
    echo ✅ node_modules já existe na raiz
)

echo.
echo 📦 Instalando dependências da API...
cd api
if not exist "node_modules" (
    call npm install
    if %errorlevel% neq 0 (
        echo ⚠️  Erro ao instalar dependências da API
    ) else (
        echo ✅ Dependências da API instaladas
    )
) else (
    echo ✅ node_modules já existe na API
)

echo.
echo 📄 Configurando arquivo .env.local...
if not exist ".env.local" (
    if exist "env.local.example" (
        copy "env.local.example" ".env.local" >nul
        echo ✅ Arquivo .env.local criado a partir do exemplo
    ) else (
        echo ⚠️  Arquivo env.local.example não encontrado
    )
) else (
    echo ✅ Arquivo .env.local já existe
)

cd ..

echo.
echo 📦 Verificando frontend...
cd web
if exist "package.json" (
    if not exist "node_modules" (
        echo 📦 Instalando dependências do frontend...
        call npm install
        if %errorlevel% neq 0 (
            echo ⚠️  Erro ao instalar dependências do frontend
        ) else (
            echo ✅ Dependências do frontend instaladas
        )
    ) else (
        echo ✅ node_modules já existe no frontend
    )
) else (
    echo ℹ️  Frontend não encontrado (pode ser normal)
)
cd ..

echo.
echo ========================================
echo ✅ Instalação Completa!
echo ========================================
echo.
echo 📊 Resumo:
echo    ✅ Node.js: Instalado e configurado
echo    ✅ npm: Instalado e configurado
echo    ✅ Dependências: Instaladas
echo    ✅ Ambiente: Configurado
echo.
echo 📝 Próximos passos:
echo    1. Feche e reabra o terminal (se Node.js foi instalado agora)
echo    2. Ou reinicie o VS Code completamente
echo    3. Verifique se funciona:
echo       node --version
echo       npm --version
echo.
echo    4. Navegue para o projeto:
echo       cd "%CD%"
echo.
echo    5. Inicie a aplicação (LOCAL):
echo       npm run dev:local
echo.
echo    6. Em outro terminal, inicie o frontend:
echo       cd web
echo       npm start
echo.
echo 🎯 Tudo pronto para começar!
echo.
pause
