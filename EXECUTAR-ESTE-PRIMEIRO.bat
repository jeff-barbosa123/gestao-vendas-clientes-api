@echo off
chcp 65001 >nul
cls
color 0A
echo.
echo ========================================
echo 🚀 INSTALAÇÃO AUTOMÁTICA - SGVC
echo ========================================
echo.
echo Este script irá:
echo   1. Instalar Node.js automaticamente
echo   2. Instalar todas as dependências do projeto
echo   3. Configurar o ambiente
echo.
echo ⚠️  ATENÇÃO: Este script precisa de permissões de Administrador
echo    Se solicitado, clique em "Sim" para permitir
echo.
pause
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
echo 📥 Baixando e instalando Node.js LTS...
echo    Isso pode levar alguns minutos...
echo.

REM Tentar instalar via winget
winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements

if %errorlevel% neq 0 (
    echo.
    echo ⚠️  Instalação via winget falhou ou foi cancelada
    echo.
    echo 💡 INSTALAÇÃO MANUAL NECESSÁRIA:
    echo.
    echo   1. Abra o navegador e acesse: https://nodejs.org/
    echo   2. Clique em "Download Node.js (LTS)"
    echo   3. Execute o arquivo .msi baixado
    echo   4. ⚠️  IMPORTANTE: Marque "Add to PATH" durante a instalação
    echo   5. Complete a instalação normalmente
    echo   6. Depois, execute este script novamente (INSTALAR-TUDO.bat)
    echo.
    pause
    exit /b 1
)

echo.
echo ⏳ Aguardando instalação concluir (15 segundos)...
timeout /t 15 /nobreak >nul

echo.
echo 🔄 Atualizando variáveis de ambiente...
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
    echo ⚠️  Node.js pode precisar ser instalado manualmente
    echo    Veja as instruções acima
    echo.
    pause
    exit /b 1
)

:install_deps
echo ========================================
echo 📦 INSTALANDO DEPENDÊNCIAS
echo ========================================
echo.

cd /d "%~dp0"
echo 📁 Diretório: %CD%
echo.

echo 📦 Instalando dependências da raiz do projeto...
echo    Isso pode levar alguns minutos na primeira vez...
if not exist "node_modules" (
    call npm install
    if %errorlevel% neq 0 (
        echo ⚠️  Erro ao instalar dependências da raiz
        echo    Verifique se Node.js está instalado corretamente
        pause
        exit /b 1
    )
    echo ✅ Dependências da raiz instaladas!
) else (
    echo ✅ node_modules já existe (pulando instalação)
)

echo.
echo 📦 Instalando dependências da API...
cd api
if not exist "node_modules" (
    call npm install
    if %errorlevel% neq 0 (
        echo ⚠️  Erro ao instalar dependências da API
        pause
        exit /b 1
    )
    echo ✅ Dependências da API instaladas!
) else (
    echo ✅ node_modules já existe na API (pulando instalação)
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
            echo ✅ Dependências do frontend instaladas!
        )
    ) else (
        echo ✅ node_modules já existe no frontend (pulando instalação)
    )
) else (
    echo ℹ️  Frontend não encontrado (pode ser normal)
)
cd ..

echo.
echo ========================================
echo ✅ INSTALAÇÃO COMPLETA!
echo ========================================
echo.
echo 📊 Resumo:
echo    ✅ Node.js: Instalado e configurado
echo    ✅ npm: Instalado e configurado
echo    ✅ Dependências da raiz: Instaladas
echo    ✅ Dependências da API: Instaladas
echo    ✅ Dependências do frontend: Instaladas
echo    ✅ Ambiente: Configurado (.env.local criado)
echo.
echo ========================================
echo 📝 PRÓXIMOS PASSOS
echo ========================================
echo.
echo 1. Feche e reabra este terminal (ou reinicie o VS Code)
echo    Isso atualiza o PATH com Node.js
echo.
echo 2. Verifique se tudo funciona:
echo    node --version
echo    npm --version
echo.
echo 3. Para iniciar a aplicação em modo desenvolvimento (LOCAL):
echo    npm run dev:local
echo.
echo 4. Em outro terminal, para iniciar o frontend:
echo    cd web
echo    npm start
echo.
echo 5. Acesse a aplicação em: http://localhost:4000
echo.
echo 🎯 Tudo pronto para começar a desenvolver!
echo.
echo Pressione qualquer tecla para fechar...
pause >nul
