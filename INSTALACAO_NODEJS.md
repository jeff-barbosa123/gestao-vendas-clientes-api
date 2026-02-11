# 📦 Instalação do Node.js e npm

## ❌ Problema Identificado

Ao executar `npm run dev`, aparece o erro:
```
npm : O termo 'npm' não é reconhecido como nome de cmdlet...
```

Isso significa que **Node.js não está instalado** ou **não está no PATH do sistema**.

---

## ✅ Solução: Instalar Node.js

### Opção 1: Instalação via Site Oficial (Recomendado)

1. **Baixar Node.js:**
   - Acesse: https://nodejs.org/
   - Baixe a versão **LTS** (Long Term Support)
   - Versão recomendada: **Node.js 18.x** ou **20.x**

2. **Instalar:**
   - Execute o instalador baixado (`.msi` para Windows)
   - Siga o assistente de instalação
   - ⚠️ **IMPORTANTE:** Marque a opção **"Add to PATH"** durante a instalação
   - Complete a instalação

3. **Verificar Instalação:**
   ```powershell
   # Fechar e reabrir o terminal (PowerShell)
   node --version
   npm --version
   ```

   Deve mostrar algo como:
   ```
   v18.17.0
   9.6.7
   ```

### Opção 2: Instalação via Chocolatey (Windows)

Se você tem o Chocolatey instalado:

```powershell
# Instalar Node.js LTS
choco install nodejs-lts -y

# Verificar
node --version
npm --version
```

### Opção 3: Instalação via Winget (Windows 10/11)

```powershell
# Instalar Node.js LTS
winget install OpenJS.NodeJS.LTS

# Verificar
node --version
npm --version
```

### Opção 4: Instalação via NVM (Node Version Manager)

Se você quer gerenciar múltiplas versões do Node.js:

```powershell
# Instalar NVM para Windows
# Baixar de: https://github.com/coreybutler/nvm-windows/releases

# Instalar Node.js via NVM
nvm install 18.17.0
nvm use 18.17.0

# Verificar
node --version
npm --version
```

---

## 🔧 Se Node.js já está instalado mas não funciona

### 1. Verificar se está instalado

```powershell
# Verificar instalação em locais comuns
Test-Path "C:\Program Files\nodejs\node.exe"
Test-Path "$env:APPDATA\npm\npm.cmd"
Test-Path "C:\Program Files (x86)\nodejs\node.exe"
```

### 2. Adicionar ao PATH manualmente

Se Node.js está instalado mas não no PATH:

1. **Encontrar o caminho de instalação:**
   - Normalmente: `C:\Program Files\nodejs\`
   - Ou: `C:\Program Files (x86)\nodejs\`

2. **Adicionar ao PATH do Windows:**
   - Pressione `Win + R`
   - Digite: `sysdm.cpl` e pressione Enter
   - Aba "Avançado" → "Variáveis de Ambiente"
   - Em "Variáveis do sistema", encontre `Path`
   - Clique em "Editar"
   - Clique em "Novo"
   - Adicione: `C:\Program Files\nodejs\`
   - Clique em "OK" em todas as janelas

3. **Reiniciar o terminal:**
   - Feche e reabra o PowerShell ou VS Code
   - Teste: `node --version`

### 3. Usar caminho completo temporariamente

Enquanto não adicionar ao PATH, você pode usar o caminho completo:

```powershell
# Exemplo (ajuste o caminho conforme sua instalação)
& "C:\Program Files\nodejs\npm.cmd" run dev

# Ou criar um alias no PowerShell atual
Set-Alias npm "C:\Program Files\nodejs\npm.cmd"
Set-Alias node "C:\Program Files\nodejs\node.exe"
```

---

## ✅ Após Instalar Node.js

### 1. Instalar Dependências do Projeto

```powershell
# Navegar para o diretório do projeto
cd "C:\Projetos\gestao-vendas-clientes-api\gestao-vendas-clientes-api"

# Instalar dependências da raiz
npm install

# Instalar dependências da API
cd api
npm install
cd ..
```

### 2. Criar Arquivos de Ambiente

```powershell
cd api
Copy-Item env.local.example .env.local
# Editar .env.local conforme necessário
```

### 3. Testar Instalação

```powershell
# Verificar versões
node --version
npm --version

# Testar scripts
npm run env:local
```

### 4. Iniciar Aplicação

```powershell
# Desenvolvimento (LOCAL)
npm run dev:local

# Produção (LOCAL)
npm run start:local
```

---

## 🆘 Troubleshooting

### Problema: "Acesso negado" ao instalar Node.js

**Solução:**
- Execute o instalador como Administrador
- Clique com botão direito no arquivo `.msi` → "Executar como administrador"

### Problema: Instalei mas ainda não funciona

**Solução:**
1. Verifique se marcou "Add to PATH" durante instalação
2. Feche e reabra TODOS os terminais (PowerShell, CMD, VS Code)
3. Reinicie o computador (às vezes necessário)
4. Verifique o PATH manualmente (passo 2 acima)

### Problema: Versão muito antiga do Node.js

**Solução:**
- Desinstale a versão antiga
- Instale a versão LTS mais recente (18.x ou 20.x)
- Verifique: `node --version` (deve ser >= 16)

### Problema: npm não funciona mesmo com Node.js instalado

**Solução:**
```powershell
# Verificar se npm.cmd existe
Test-Path "C:\Program Files\nodejs\npm.cmd"

# Se não existir, reinstale Node.js
# npm vem junto com Node.js
```

---

## 📚 Verificações Finais

Após instalar, execute estes comandos para verificar:

```powershell
# 1. Verificar Node.js
node --version
# Deve mostrar: v18.x.x ou v20.x.x

# 2. Verificar npm
npm --version
# Deve mostrar: 9.x.x ou 10.x.x

# 3. Verificar instalação global
npm config get prefix

# 4. Verificar PATH
$env:PATH -split ';' | Select-String -Pattern 'node'
# Deve mostrar caminhos com 'node'

# 5. Testar instalação de pacote
npm install -g nodemon
nodemon --version
```

---

## 🎯 Próximos Passos

Após instalar Node.js e npm com sucesso:

1. ✅ Instalar dependências: `npm install`
2. ✅ Configurar ambiente: Copiar arquivos `.env.example`
3. ✅ Iniciar aplicação: `npm run dev:local`
4. ✅ Executar testes: `npm run cypress:open:local`

---

## 📞 Recursos Adicionais

- **Site oficial Node.js:** https://nodejs.org/
- **Documentação npm:** https://docs.npmjs.com/
- **Node.js Windows Installation:** https://nodejs.org/en/download/package-manager/#windows

---

**Última atualização:** Dezembro 2024
