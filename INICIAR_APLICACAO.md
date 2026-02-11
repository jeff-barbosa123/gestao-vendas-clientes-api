# 🚀 COMO INICIAR A APLICAÇÃO

## ⚡ Início Rápido

### 1. Navegar para o diretório da API
```powershell
cd gestao-vendas-clientes-api-V1\api
```

### 2. Iniciar a aplicação

**Modo Desenvolvimento (recomendado):**
```powershell
npm run dev
```

**Ou modo local (com ambiente configurado):**
```powershell
npm run dev:local
```

**Modo Produção:**
```powershell
npm start
```

### 3. Verificar se está rodando

Acesse:
- **API:** http://localhost:3000
- **Swagger UI:** http://localhost:3000/api-docs
- **Health Check:** http://localhost:3000/health

---

## 📋 Pré-requisitos

### Arquivo .env (Opcional para desenvolvimento)

Se quiser usar banco de dados PostgreSQL, crie um arquivo `.env` ou `.env.local`:

```powershell
# Copiar exemplo
cd gestao-vendas-clientes-api-V1\api
copy env.local.example .env.local
```

**Nota:** Se não configurar `.env`, a aplicação tentará usar banco em memória.

### Variáveis Mínimas Necessárias

Se estiver usando banco PostgreSQL:
```
DATABASE_URL=postgresql://user:password@localhost:5432/sgvc_local
JWT_SECRET=seu-secret-aqui
JWT_REFRESH_SECRET=seu-refresh-secret-aqui
PORT=3000
```

---

## ✅ Comandos Disponíveis

```powershell
# Desenvolvimento (recomendado)
npm run dev              # Modo desenvolvimento simples
npm run dev:local        # Com ambiente local configurado

# Produção
npm start                # Modo produção
npm run start:local      # Produção com ambiente local

# Verificar configuração
npm run env:local        # Mostra variáveis de ambiente

# Testes
npm test                 # Executar todos os testes
npm run test:local       # Testes com ambiente local
```

---

## 🔍 Verificar se está rodando

Após iniciar, você deve ver mensagens como:
```
🚀 Iniciando aplicação...
📦 Ambiente: LOCAL
API rodando na porta 3000
```

Se aparecer erro de banco de dados:
- **Opção 1:** Remova `DATABASE_URL` do `.env` para usar banco em memória
- **Opção 2:** Inicie PostgreSQL via Docker:
  ```powershell
  docker-compose -f docker-compose.local.yml up -d
  ```

---

## 🆘 Problemas Comuns

### "Porta 3000 já está em uso"
```powershell
# Windows - Verificar qual processo está usando
netstat -ano | findstr :3000

# Matar processo (substitua PID pelo número)
taskkill /PID <PID> /F

# Ou mude a porta no .env
PORT=3001
```

### "Cannot find module"
```powershell
# Reinstalar dependências
npm install
```

### "DATABASE_URL não configurado"
Isso é **NORMAL** - a aplicação funcionará em modo de desenvolvimento sem banco.
Se quiser usar banco, configure `DATABASE_URL` no `.env`.

---

## 🎯 Próximos Passos Após Iniciar

1. ✅ Verificar Health Check: http://localhost:3000/health
2. ✅ Acessar Swagger: http://localhost:3000/api-docs
3. ✅ Testar endpoints da API
4. ✅ Iniciar frontend (se necessário) em outro terminal
