# 🔍 Verificação do Servidor

## Status Atual

✅ **PostgreSQL está rodando** (container `sgvc-postgres`)
✅ **Banco `sgvc_local` existe e tem dados**
✅ **Usuários criados:**
   - `admin@sgvc.local` / `Admin@123!`
   - `admin@negocio.com` / `admin1234`

## ⚠️ Próximo Passo: Verificar Servidor da API

O banco está OK, mas precisamos verificar se o servidor Node.js está rodando.

### Como Verificar:

1. **Verifique se há um processo Node.js rodando:**
   ```powershell
   Get-Process node -ErrorAction SilentlyContinue
   ```

2. **Verifique se a porta 3000 está em uso:**
   ```powershell
   netstat -ano | findstr :3000
   ```

3. **Teste o health check:**
   ```powershell
   Invoke-WebRequest -Uri "http://localhost:3000/health"
   ```

### Se o Servidor NÃO Estiver Rodando:

```powershell
# 1. Navegue para o diretório api
cd api

# 2. Inicie o servidor
npm run dev

# 3. Você deve ver:
#    📄 Ambiente carregado de: .env.local
#    🚀 API rodando na porta 3000
```

### Se o Servidor JÁ Estiver Rodando:

Verifique se ele carregou o `.env.local` corretamente. Olhe no console e procure por:
- `📄 Ambiente carregado de: .env.local` ✅
- OU `⚠️ Nenhum arquivo .env encontrado` ❌

Se não carregou o `.env.local`, **REINICIE o servidor** (Ctrl+C e depois `npm run dev` novamente).

## 🧪 Teste Rápido do Login

Depois de confirmar que o servidor está rodando, teste:

```powershell
$body = @{
    email = "admin@sgvc.local"
    password = "Admin@123!"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

Se funcionar, você receberá um token JWT!
