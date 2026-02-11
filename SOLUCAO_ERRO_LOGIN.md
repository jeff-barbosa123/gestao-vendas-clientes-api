# 🔧 Solução para Erro "Erro interno do sistema" no Login

## 🔍 Diagnóstico

O erro "Erro interno do sistema" indica que:
1. ✅ A validação de força de senha foi removida com sucesso (erro anterior resolvido)
2. ❌ Agora há um erro no servidor, provavelmente relacionado ao banco de dados

## 🎯 Possíveis Causas

### 1. DATABASE_URL não configurado
O arquivo `.env.local` não existe ou não tem `DATABASE_URL` configurado.

### 2. Banco de dados não está rodando
O PostgreSQL não está iniciado ou não está acessível.

### 3. Usuário não existe no banco
O usuário `admin@negocio.com` não foi criado no banco de dados.

## ✅ Soluções

### Solução 1: Configurar Banco de Dados

**Passo 1:** Criar/verificar arquivo `.env.local` no diretório `api/`:

```env
DATABASE_URL=postgresql://sgvc:sgvc123@localhost:5432/sgvc_local
```

**Passo 2:** Verificar se o PostgreSQL está rodando:

```powershell
# Verificar se o serviço está rodando (Windows)
Get-Service postgresql*

# OU iniciar via Docker
docker-compose -f docker-compose.local.yml up -d
```

**Passo 3:** Criar o banco de dados e usuário:

```sql
CREATE DATABASE sgvc_local;
CREATE USER sgvc WITH PASSWORD 'sgvc123';
GRANT ALL PRIVILEGES ON DATABASE sgvc_local TO sgvc;
```

**Passo 4:** Inicializar o banco:

```powershell
cd api
npm run db:seed:users
```

### Solução 2: Criar Usuário Manualmente

Se o banco já está configurado, você pode criar o usuário diretamente:

```powershell
cd api
npm run db:seed:users
```

OU via SQL:

```sql
INSERT INTO users (id, email, password, name, status_usuario, created_at)
VALUES (
  gen_random_uuid(),
  'admin@negocio.com',
  'admin1234',  -- Senha em texto plano (será convertida para hash no primeiro login)
  'Administrador',
  'ATIVO',
  NOW()
);
```

### Solução 3: Verificar Logs do Servidor

Verifique os logs do servidor para ver o erro exato:

```powershell
# Ver logs em tempo real
Get-Content api/logs/error.log -Wait

# OU verificar console onde o npm run dev está rodando
```

## 🔍 Verificações Rápidas

Execute estes comandos para diagnosticar:

```powershell
# 1. Verificar se .env.local existe
Test-Path api\.env.local

# 2. Verificar conteúdo do .env.local (ver se DATABASE_URL está lá)
Get-Content api\.env.local | Select-String "DATABASE_URL"

# 3. Testar conexão com banco (se PostgreSQL estiver instalado)
psql -h localhost -U sgvc -d sgvc_local -c "SELECT 1;"

# 4. Verificar se tabela users existe
psql -h localhost -U sgvc -d sgvc_local -c "SELECT COUNT(*) FROM users;"
```

## 📝 Correções Aplicadas no Código

1. ✅ Removida validação de força de senha do login
2. ✅ Melhorado tratamento de erros de banco de dados
3. ✅ Adicionadas mensagens de erro mais claras

## 🚀 Próximos Passos

1. Configure o `DATABASE_URL` no `.env.local`
2. Inicie o PostgreSQL (via Docker ou serviço)
3. Execute `npm run db:seed:users` para criar usuários padrão
4. Tente fazer login novamente

## ⚠️ Importante

**Para desenvolvimento sem banco:** A aplicação pode iniciar sem banco, mas o login **NÃO funcionará** porque precisa buscar o usuário no banco de dados.

**Senha do usuário admin:**
- Email: `admin@negocio.com`
- Senha padrão: `Admin@123!` (se criado pelo script seed-users)
- OU: `admin1234` (se você criar manualmente)
