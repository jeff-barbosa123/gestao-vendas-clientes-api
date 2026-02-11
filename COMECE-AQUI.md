# 🚀 COMECE AQUI - Configuração Completa do Ambiente

## ⚡ Instalação Rápida do Node.js

### ✅ Opção 1: Script Automático (Mais Fácil)

1. **Execute o arquivo:**
   - Clique duas vezes em: `INSTALAR-NODEJS-AGORA.bat`
   - Ou clique com botão direito → "Executar como administrador"

2. **Siga as instruções:**
   - O script baixará e abrirá o instalador do Node.js automaticamente
   - Complete a instalação normalmente
   - ⚠️ **IMPORTANTE:** Marque "Add to PATH" durante a instalação

3. **Após instalar:**
   - Feche e reabra o VS Code
   - Ou feche e reabra o terminal/PowerShell

### ✅ Opção 2: Instalação Manual

1. **Acesse:** https://nodejs.org/
2. **Baixe** a versão **LTS** (Long Term Support) - recomendado
3. **Execute** o instalador baixado (`.msi`)
4. **⚠️ IMPORTANTE:** Marque "Add to PATH" durante a instalação
5. **Complete** a instalação normalmente

### ✅ Opção 3: Via Winget (Windows 10/11)

Abra PowerShell **como Administrador** e execute:

```powershell
winget install OpenJS.NodeJS.LTS
```

---

## ✅ Verificar Instalação

Após instalar, **feche e reabra o terminal** e execute:

```powershell
node --version
npm --version
```

Deve mostrar algo como:
```
v20.11.0
10.2.4
```

✅ **Se funcionar, está instalado corretamente!**

---

## 📦 Configurar Projeto

### 1. Instalar Dependências

```powershell
# Navegar para o projeto
cd "C:\Projetos\gestao-vendas-clientes-api\gestao-vendas-clientes-api"

# Instalar dependências da raiz
npm install

# Instalar dependências da API
cd api
npm install
cd ..
```

### 2. Configurar Ambiente LOCAL

```powershell
cd api
Copy-Item env.local.example .env.local
# Editar .env.local se necessário (valores padrão funcionam para desenvolvimento)
cd ..
```

### 3. Iniciar Banco de Dados (Docker - Opcional)

```powershell
docker-compose -f docker-compose.local.yml up -d
```

Ou use banco em memória (remova `DATABASE_URL` do `.env.local`)

### 4. Iniciar Aplicação

```powershell
# Desenvolvimento (LOCAL) - reinicia automaticamente ao salvar
npm run dev:local

# Ou usar script PowerShell alternativo
.\scripts\start-local.ps1
```

### 5. Iniciar Frontend (em outro terminal)

```powershell
cd web
npm install
npm start
```

Acesse: `http://localhost:4000`

---

## 🎯 Comandos Úteis

### Ambiente LOCAL

```powershell
# Iniciar em modo desenvolvimento
npm run dev:local

# Iniciar em modo produção
npm run start:local

# Validar configuração do ambiente
npm run env:local

# Executar testes
npm run test:local
```

### Ambiente HMG (Homologação)

```powershell
npm run dev:hmg
npm run start:hmg
npm run env:hmg
```

### Ambiente PRODUÇÃO

```powershell
npm run start:prod
npm run env:prod
```

### Cypress (Testes E2E)

```powershell
# Modo interativo (LOCAL)
npm run cypress:open:local

# Modo headless (LOCAL)
npm run cypress:run:local
```

---

## ⚠️ Problemas Comuns

### "npm não é reconhecido"

**Solução:**
1. ✅ Feche e reabra o terminal/PowerShell
2. ✅ Reinicie o VS Code completamente
3. ✅ Verifique se Node.js está instalado: `where node`
4. ✅ Adicione manualmente ao PATH (veja `INSTALACAO_NODEJS.md`)

### "Cannot connect to localhost:3000"

**Solução:**
- Verifique se a API está rodando: `npm run dev:local`
- Verifique se a porta 3000 não está em uso

### "Cannot connect to localhost:4000"

**Solução:**
- Inicie o frontend: `cd web && npm start`
- Verifique se a porta 4000 não está em uso

### "Database connection error"

**Solução:**
- Use banco em memória (remova `DATABASE_URL` do `.env.local`)
- Ou inicie PostgreSQL: `docker-compose -f docker-compose.local.yml up -d`

---

## 📚 Documentação Completa

- **Instalação Detalhada:** `INSTALACAO_NODEJS.md`
- **Guia Rápido:** `GUIA-RAPIDO-INSTALACAO.md`
- **Troubleshooting:** `TROUBLESHOOTING.md`
- **Configuração de Ambientes:** `CONFIGURACAO_AMBIENTES.md`
- **Executar Testes:** `EXECUTAR_TESTES.md`

---

## ✅ Checklist Final

Após seguir todos os passos, verifique:

- [ ] ✅ Node.js instalado (`node --version` funciona)
- [ ] ✅ npm instalado (`npm --version` funciona)
- [ ] ✅ Dependências instaladas (`node_modules` existe na raiz e em `api/`)
- [ ] ✅ Arquivo `.env.local` criado em `api/`
- [ ] ✅ API inicia sem erros (`npm run dev:local`)
- [ ] ✅ Frontend inicia sem erros (`cd web && npm start`)
- [ ] ✅ Acessa aplicação em `http://localhost:4000`

---

## 🎉 Pronto!

Se tudo está funcionando, você está pronto para desenvolver!

**Próximos passos:**
1. Explore a documentação dos ambientes (`CONFIGURACAO_AMBIENTES.md`)
2. Execute os testes Cypress (`npm run cypress:open:local`)
3. Comece a desenvolver! 🚀

---

**Última atualização:** Dezembro 2024
