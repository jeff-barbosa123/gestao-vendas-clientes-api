# 🚨 RESOLVER ERRO DE LOGIN - PASSOS IMEDIATOS

## ✅ O QUE JÁ FOI CORRIGIDO

1. ✅ Arquivo `.env.local` criado e configurado
2. ✅ Credenciais atualizadas: `admin@negocio.com` / `admin1234`
3. ✅ Validação de força de senha removida do login
4. ✅ Tratamento de erros melhorado

## ❌ PROBLEMA ATUAL

O erro "Erro interno do sistema" indica que o **PostgreSQL não está rodando** ou não está acessível.

## 🔧 SOLUÇÃO IMEDIATA (ESCOLHA UMA OPÇÃO)

### OPÇÃO 1: Usar Docker (MAIS RÁPIDO)

```powershell
# Navegar para a raiz do projeto
cd ..

# Iniciar PostgreSQL via Docker
docker-compose -f docker-compose.local.yml up -d

# Aguardar alguns segundos e verificar se está rodando
docker ps | Select-String postgres

# Criar usuários no banco
cd api
npm run db:seed:users
```

### OPÇÃO 2: Comentar DATABASE_URL (Para testar sem banco)

Edite o arquivo `api/.env.local` e **comente** a linha do DATABASE_URL:

```env
# DATABASE_URL=postgresql://sgvc:sgvc123@localhost:5432/sgvc_local
```

**NOTA:** Isso fará o servidor iniciar, mas o login **NÃO funcionará** porque precisa do banco para buscar usuários.

### OPÇÃO 3: Instalar e Configurar PostgreSQL Manualmente

1. Instale o PostgreSQL
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

## 🔍 VERIFICAÇÃO RÁPIDA

Execute estes comandos para diagnosticar:

```powershell
# 1. Verificar se PostgreSQL está rodando (Windows)
Get-Service postgresql*

# 2. Verificar se Docker está rodando PostgreSQL
docker ps

# 3. Testar conexão (se psql estiver instalado)
psql -h localhost -U sgvc -d sgvc_local -c "SELECT 1;"
```

## 📝 APÓS CONFIGURAR O BANCO

1. **Execute o seed para criar usuários:**
```powershell
cd api
npm run db:seed:users
```

2. **Tente fazer login novamente com:**
- Email: `admin@negocio.com`
- Senha: `admin1234`

## ⚠️ IMPORTANTE

O login **SEMPRE requer banco de dados** porque precisa buscar o usuário. Não é possível fazer login sem banco de dados configurado.
