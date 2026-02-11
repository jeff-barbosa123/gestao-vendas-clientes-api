# 🧪 Como Testar o Login Agora

## ✅ Status do Banco

O PostgreSQL está rodando no Docker! Container `sgvc-postgres` está ativo.

## 🧪 Teste Rápido via cURL ou Postman

### Opção 1: Usando cURL (PowerShell)

```powershell
# Teste com admin@sgvc.local
curl -X POST http://localhost:3000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"admin@sgvc.local\",\"password\":\"Admin@123!\"}'
```

### Opção 2: Usando Invoke-WebRequest (PowerShell)

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

### Opção 3: Usando Postman ou Insomnia

- **URL:** `http://localhost:3000/api/auth/login`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`
- **Body (JSON):**
  ```json
  {
    "email": "admin@sgvc.local",
    "password": "Admin@123!"
  }
  ```

## 🔍 Verificar se o Servidor Está Rodando

```powershell
# Verificar se a porta 3000 está em uso
netstat -ano | findstr :3000

# OU testar health check
Invoke-WebRequest -Uri "http://localhost:3000/health"
```

## ⚠️ IMPORTANTE

**Se o servidor não estiver rodando ou não conseguir conectar:**

1. **Navegue para o diretório api:**
   ```powershell
   cd api
   ```

2. **Inicie o servidor:**
   ```powershell
   npm run dev
   ```

3. **Verifique se vê esta mensagem no console:**
   ```
   📄 Ambiente carregado de: .env.local
   🚀 API rodando na porta 3000
   ```

4. **Se não ver a mensagem do .env.local, verifique:**
   ```powershell
   Test-Path .env.local
   Get-Content .env.local | Select-String "DATABASE_URL"
   ```

## 🔐 Credenciais Disponíveis

**Opção 1:**
- Email: `admin@sgvc.local`
- Senha: `Admin@123!`

**Opção 2:**
- Email: `admin@negocio.com`  
- Senha: `admin1234`

## 📊 Resposta Esperada (Sucesso)

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "email": "admin@sgvc.local",
    "name": "Admin",
    "statusUsuario": "ATIVO",
    "dataUltimoLogin": "...",
    "tentativasFalha": 0
  },
  "exp": 1234567890,
  "jti": "...",
  "refreshJti": "..."
}
```

## ❌ Resposta Esperada (Erro)

Se ainda der erro, você verá uma mensagem mais clara agora. Verifique o console do servidor para ver o erro exato.
