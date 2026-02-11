# 🆘 Troubleshooting - SGVC

Este documento contém soluções para problemas comuns ao executar o projeto SGVC.

---

## ❌ Problema: "npm não é reconhecido"

### Erro
```
npm : O termo 'npm' não é reconhecido como nome de cmdlet...
```

### Causa
Node.js não está instalado ou não está no PATH do sistema.

### Solução

#### 1. Instalar Node.js
- Baixe de: https://nodejs.org/
- Instale a versão **LTS** (18.x ou 20.x)
- ⚠️ Marque "Add to PATH" durante instalação
- Reinicie o terminal após instalação

#### 2. Verificar Instalação
```powershell
node --version
npm --version
```

#### 3. Usar Script Alternativo
Se Node.js está instalado mas não funciona, use o script PowerShell:
```powershell
.\scripts\start-local.ps1
```

📚 **Consulte:** `INSTALACAO_NODEJS.md` para guia completo de instalação.

---

## ❌ Problema: "Cannot connect to localhost:3000"

### Erro
- API não responde em `http://localhost:3000`
- Erro de conexão ao iniciar frontend ou testes

### Causa
API não está rodando.

### Solução

1. **Verificar se API está rodando:**
   ```powershell
   # Testar conexão
   curl http://localhost:3000/api/health
   # ou
   Invoke-WebRequest -Uri http://localhost:3000/api/health
   ```

2. **Iniciar API:**
   ```powershell
   cd api
   npm run dev:local
   ```

3. **Verificar porta:**
   - Certifique-se de que porta 3000 não está em uso por outro processo
   ```powershell
   netstat -ano | findstr :3000
   ```

4. **Verificar variáveis de ambiente:**
   ```powershell
   cd api
   # Certifique-se de que .env.local existe
   Test-Path .env.local
   ```

---

## ❌ Problema: "Cannot connect to localhost:4000"

### Erro
- Frontend não responde em `http://localhost:4000`

### Causa
Frontend não está rodando.

### Solução

1. **Iniciar Frontend:**
   ```powershell
   cd web
   npm install  # Se ainda não instalou
   npm start
   ```

2. **Verificar porta:**
   ```powershell
   netstat -ano | findstr :4000
   ```

3. **Alterar porta se necessário:**
   - Edite `web/server.js` ou `web/package.json`
   - Configure porta diferente (ex: 4001)

---

## ❌ Problema: "401 Unauthorized" ou "403 Forbidden"

### Erro
- Erro 401 ao fazer login
- Erro 403 ao acessar rotas protegidas

### Causa
- JWT_SECRET não configurado
- Token inválido ou expirado
- CORS bloqueando requisições

### Solução

1. **Verificar JWT_SECRET:**
   ```powershell
   cd api
   # Verificar se .env.local tem JWT_SECRET
   Get-Content .env.local | Select-String "JWT_SECRET"
   ```

2. **Configurar JWT_SECRET:**
   ```powershell
   cd api
   Copy-Item env.local.example .env.local
   # Editar .env.local e adicionar:
   # JWT_SECRET=seu-secret-aqui
   ```

3. **Verificar CORS:**
   - Certifique-se de que `ALLOWED_ORIGINS` inclui `http://localhost:4000`
   ```env
   ALLOWED_ORIGINS=http://localhost:4000,http://127.0.0.1:4000
   ```

4. **Reiniciar API após alterar .env:**
   - Pare a API (Ctrl+C)
   - Inicie novamente: `npm run dev:local`

---

## ❌ Problema: "Database connection error"

### Erro
- Erro ao conectar ao PostgreSQL
- "Connection refused" ou "Authentication failed"

### Causa
- PostgreSQL não está rodando
- Credenciais incorretas
- Banco de dados não existe

### Solução

1. **Iniciar PostgreSQL (Docker):**
   ```powershell
   docker-compose -f docker-compose.local.yml up -d
   ```

2. **Verificar se está rodando:**
   ```powershell
   docker ps | Select-String "postgres"
   ```

3. **Verificar DATABASE_URL:**
   ```powershell
   cd api
   Get-Content .env.local | Select-String "DATABASE_URL"
   ```
   
   Deve ser algo como:
   ```
   DATABASE_URL=postgresql://sgvc:sgvc123@localhost:5432/sgvc_local
   ```

4. **Criar banco de dados (se necessário):**
   ```powershell
   # Conectar ao PostgreSQL
   docker exec -it sgvc-postgres-local psql -U sgvc
   
   # Criar banco
   CREATE DATABASE sgvc_local;
   \q
   ```

5. **Ou usar banco em memória:**
   - Remova ou comente `DATABASE_URL` no `.env.local`
   - A API usará banco em memória (dados não persistem)

---

## ❌ Problema: "Module not found" ou "Cannot find module"

### Erro
```
Error: Cannot find module 'express'
Error: Cannot find module './routes'
```

### Causa
Dependências não instaladas ou instalação incompleta.

### Solução

1. **Instalar dependências:**
   ```powershell
   # Na raiz do projeto
   cd gestao-vendas-clientes-api
   npm install
   
   # Na API
   cd api
   npm install
   
   # No Frontend (se existir)
   cd ../web
   npm install
   ```

2. **Limpar cache e reinstalar:**
   ```powershell
   cd api
   Remove-Item -Recurse -Force node_modules
   Remove-Item package-lock.json
   npm install
   ```

3. **Verificar node_modules:**
   ```powershell
   Test-Path api\node_modules
   Test-Path api\node_modules\express
   ```

---

## ❌ Problema: "Port already in use"

### Erro
- "Port 3000 is already in use"
- "EADDRINUSE: address already in use"

### Causa
Outro processo está usando a porta.

### Solução

1. **Encontrar processo usando a porta:**
   ```powershell
   # Windows
   netstat -ano | findstr :3000
   
   # Isso mostra o PID do processo
   # Exemplo: TCP    0.0.0.0:3000    0.0.0.0:0    LISTENING    12345
   ```

2. **Matar o processo:**
   ```powershell
   # Substitua 12345 pelo PID encontrado
   taskkill /PID 12345 /F
   ```

3. **Ou usar outra porta:**
   ```powershell
   # Editar .env.local
   PORT=3001
   ```

---

## ❌ Problema: "Cypress tests failing"

### Erro
- Testes Cypress falham
- "Cannot connect to baseUrl"
- "Element not found"

### Causa
- Frontend não está rodando
- Base URL incorreta
- Elementos HTML não existem

### Solução

1. **Verificar Frontend está rodando:**
   ```powershell
   # Iniciar frontend primeiro
   cd web
   npm start
   ```

2. **Verificar Base URL do Cypress:**
   ```powershell
   # Deve estar configurado para http://localhost:4000
   Get-Content cypress.config.js | Select-String "baseUrl"
   ```

3. **Executar Cypress com URL específica:**
   ```powershell
   $env:CYPRESS_BASE_URL="http://localhost:4000"
   npm run cypress:open
   ```

4. **Verificar se elementos existem:**
   - Abra `http://localhost:4000` no navegador
   - Inspecione elementos com DevTools (F12)
   - Verifique se IDs correspondem aos usados nos testes

---

## ❌ Problema: "Scripts não funcionam no Windows"

### Erro
- Scripts npm falham
- "Syntax error" ou "Command not found"

### Causa
Scripts podem usar sintaxe Unix/Linux que não funciona no Windows PowerShell.

### Solução

1. **Usar scripts PowerShell alternativos:**
   ```powershell
   .\scripts\start-local.ps1
   ```

2. **Usar Git Bash ou WSL:**
   - Instale Git Bash: https://git-scm.com/downloads
   - Ou WSL (Windows Subsystem for Linux)
   - Execute scripts no terminal alternativo

3. **Usar cross-env (se necessário):**
   ```powershell
   npm install --save-dev cross-env
   ```
   
   E modificar scripts no package.json:
   ```json
   "dev": "cross-env NODE_ENV=development nodemon ./src/server.js"
   ```

---

## ❌ Problema: "Environment variables not loading"

### Erro
- Variáveis de ambiente não são carregadas
- `process.env.JWT_SECRET` é `undefined`

### Causa
- Arquivo `.env` não existe ou está em local errado
- Nome do arquivo incorreto

### Solução

1. **Verificar arquivo .env:**
   ```powershell
   cd api
   # Deve existir .env.local, .env.hmg, ou .env.production
   Get-ChildItem .env*
   ```

2. **Criar arquivo correto:**
   ```powershell
   cd api
   Copy-Item env.local.example .env.local
   # Editar .env.local
   ```

3. **Verificar carregamento no código:**
   ```javascript
   // api/src/app.js deve ter:
   require("dotenv").config();
   ```

4. **Reiniciar aplicação:**
   - Pare a API (Ctrl+C)
   - Inicie novamente: `npm run dev:local`

---

## 📚 Recursos Adicionais

- **Instalação Node.js:** `INSTALACAO_NODEJS.md`
- **Configuração Ambientes:** `CONFIGURACAO_AMBIENTES.md`
- **Executar Testes:** `EXECUTAR_TESTES.md`

---

## 🆘 Se Nada Funcionar

1. **Verificar logs:**
   ```powershell
   # Logs da API
   Get-Content api\logs\error.log -Tail 50
   ```

2. **Reinstalar tudo:**
   ```powershell
   # Limpar tudo
   Remove-Item -Recurse -Force node_modules
   Remove-Item -Recurse -Force api\node_modules
   Remove-Item package-lock.json
   Remove-Item api\package-lock.json
   
   # Reinstalar
   npm install
   cd api
   npm install
   ```

3. **Verificar versões:**
   ```powershell
   node --version    # Deve ser >= 16
   npm --version     # Deve ser >= 7
   docker --version  # Se usar Docker
   ```

4. **Criar issue no repositório:**
   - Inclua mensagens de erro completas
   - Versões do Node.js, npm, sistema operacional
   - Passos para reproduzir o problema

---

**Última atualização:** Dezembro 2024
