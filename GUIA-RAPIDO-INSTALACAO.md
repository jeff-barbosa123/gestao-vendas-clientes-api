# 🚀 Guia Rápido de Instalação - Node.js

## ✅ Instalação em 3 Passos

### Passo 1: Instalar Node.js

**Opção A: Script Automático (Recomendado)**
1. Execute o arquivo: `INSTALAR-NODEJS-AGORA.bat`
2. Siga as instruções na tela
3. Complete a instalação do Node.js quando o instalador abrir

**Opção B: Instalação Manual**
1. Acesse: https://nodejs.org/
2. Baixe a versão **LTS** (Long Term Support)
3. Execute o instalador baixado (`.msi`)
4. ⚠️ **IMPORTANTE:** Marque "Add to PATH" durante a instalação
5. Complete a instalação normalmente

**Opção C: Via Winget (Windows 10/11)**
```powershell
winget install OpenJS.NodeJS.LTS
```
*(Pode solicitar permissões de administrador)*

### Passo 2: Verificar Instalação

Feche e reabra o terminal (PowerShell) e execute:

```powershell
node --version
npm --version
```

Deve mostrar algo como:
```
v20.11.0
10.2.4
```

### Passo 3: Instalar Dependências do Projeto

```powershell
# Navegar para o projeto
cd "C:\Projetos\gestao-vendas-clientes-api\gestao-vendas-clientes-api"

# Instalar dependências da raiz
npm install

# Instalar dependências da API
cd api
npm install
cd ..

# Criar arquivo de ambiente (LOCAL)
cd api
Copy-Item env.local.example .env.local
```

---

## 🎯 Próximos Passos

Após instalar Node.js e dependências:

### 1. Configurar Ambiente LOCAL

```powershell
cd api
Copy-Item env.local.example .env.local
# Editar .env.local conforme necessário
```

### 2. Iniciar Aplicação

```powershell
# Na raiz do projeto
npm run dev:local
```

Ou use o script PowerShell alternativo:
```powershell
.\scripts\start-local.ps1
```

### 3. Iniciar Frontend (em outro terminal)

```powershell
cd web
npm install
npm start
```

---

## ⚠️ Problemas Comuns

### "npm não é reconhecido"

**Solução:**
1. Feche e reabra o terminal/PowerShell
2. Reinicie o VS Code completamente
3. Se ainda não funcionar, adicione manualmente ao PATH:
   - Pressione `Win + R`
   - Digite: `sysdm.cpl`
   - Aba "Avançado" → "Variáveis de Ambiente"
   - Em "Variáveis do sistema", encontre `Path`
   - Clique "Editar" → "Novo"
   - Adicione: `C:\Program Files\nodejs`
   - Clique OK em todas as janelas
   - Reinicie o computador

### "Erro ao instalar dependências"

**Solução:**
```powershell
# Limpar cache
npm cache clean --force

# Remover node_modules e reinstalar
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

### "Porta 3000 já em uso"

**Solução:**
```powershell
# Encontrar processo usando a porta
netstat -ano | findstr :3000

# Matar processo (substitua PID pelo número encontrado)
taskkill /PID <PID> /F

# Ou usar outra porta no .env.local
# PORT=3001
```

---

## 📚 Documentação Completa

- **Instalação Detalhada:** `INSTALACAO_NODEJS.md`
- **Troubleshooting:** `TROUBLESHOOTING.md`
- **Configuração de Ambientes:** `CONFIGURACAO_AMBIENTES.md`

---

## ✅ Checklist Final

Após seguir todos os passos, verifique:

- [ ] Node.js instalado (`node --version` funciona)
- [ ] npm instalado (`npm --version` funciona)
- [ ] Dependências instaladas (`node_modules` existe)
- [ ] Arquivo `.env.local` criado
- [ ] API inicia sem erros (`npm run dev:local`)
- [ ] Frontend inicia sem erros (`npm start`)

---

**Pronto para começar!** 🎉
