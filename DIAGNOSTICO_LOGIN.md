# 🔍 Diagnóstico Completo do Erro de Login

## ❌ Problema Atual
Erro: "Erro interno do sistema. Tente novamente mais tarde."

## ✅ Correções Já Aplicadas

1. ✅ Removida validação de força de senha do login
2. ✅ Melhorado tratamento de erros de banco de dados
3. ✅ Arquivo `.env.local` criado

## 🔍 Verificações Necessárias

### 1. Verificar se o PostgreSQL está rodando

```powershell
# Verificar se o serviço está rodando
Get-Service postgresql*

# OU se estiver usando Docker
docker ps | Select-String postgres
```

### 2. Verificar configuração no .env.local

O arquivo `.env.local` foi criado com:
- `DATABASE_URL=postgresql://sgvc:sgvc123@localhost:5432/sgvc_local`
- `ADMIN_EMAIL=admin@sgvc.local`
- `ADMIN_PASSWORD=Admin@123!`

**IMPORTANTE:** Você está tentando fazer login com:
- Email: `admin@negocio.com`
- Senha: `admin1234`

Mas o arquivo `.env.local` tem:
- Email: `admin@sgvc.local`
- Senha: `Admin@123!`

### 3. Opções para Resolver

**Opção A: Usar as credenciais corretas do .env.local**
- Email: `admin@sgvc.local`
- Senha: `Admin@123!`

**Opção B: Alterar o .env.local para usar suas credenciais**
Edite o arquivo `api/.env.local` e altere:
```env
ADMIN_EMAIL=admin@negocio.com
ADMIN_PASSWORD=admin1234
```

Depois execute:
```powershell
cd api
npm run db:seed:users
```

**Opção C: Criar banco e usuário manualmente**

1. Inicie o PostgreSQL (Docker ou serviço)
2. Crie o banco:
```sql
CREATE DATABASE sgvc_local;
CREATE USER sgvc WITH PASSWORD 'sgvc123';
GRANT ALL PRIVILEGES ON DATABASE sgvc_local TO sgvc;
```

3. Execute o seed:
```powershell
cd api
npm run db:seed:users
```

## 🔧 Comandos de Diagnóstico

Execute estes comandos para verificar o que está acontecendo:

```powershell
# 1. Verificar se .env.local existe e tem DATABASE_URL
Get-Content api\.env.local | Select-String "DATABASE_URL"

# 2. Testar conexão com banco (se PostgreSQL estiver instalado)
psql -h localhost -U sgvc -d sgvc_local -c "SELECT COUNT(*) FROM users;"

# 3. Ver logs do servidor (se estiver rodando)
Get-Content api\logs\error.log -Tail 50
```

## 📝 Próximos Passos

1. **Verifique se o PostgreSQL está rodando**
2. **Use as credenciais corretas** (do .env.local OU as que você configurou)
3. **Execute o seed para criar usuários** se necessário
4. **Tente fazer login novamente**

## ⚠️ Nota Importante

O sistema **NÃO pode funcionar sem banco de dados** porque precisa buscar usuários para autenticação. Se não quiser usar PostgreSQL agora, você precisaria implementar um sistema de autenticação em memória, mas isso não é recomendado para produção.
