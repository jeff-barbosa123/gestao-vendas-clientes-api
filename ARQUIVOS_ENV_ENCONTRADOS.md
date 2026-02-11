# 📁 ARQUIVOS .ENV ENCONTRADOS NO PROJETO

**Data:** 2025-01-10  
**Localização:** `api/`  
**Status:** ✅ **ARQUIVOS DE EXEMPLO IDENTIFICADOS**

---

## 📋 ARQUIVOS DE EXEMPLO

O projeto **NÃO possui** arquivos `.env` reais (eles estão no `.gitignore`), mas possui **arquivos de exemplo**:

### 1. `api/env.local.example` - Desenvolvimento Local
**Uso:** Copiar para `.env.local` ou `.env` no ambiente local

**Configuração JWT:**
```bash
JWT_TTL_SECONDS=900              # 15 minutos (access token)
JWT_REFRESH_TTL_SECONDS=86400    # 24 horas (refresh token)
```

### 2. `api/env.hmg.example` - Homologação/Staging
**Uso:** Copiar para `.env.hmg` no ambiente de homologação

**Configuração JWT:**
```bash
JWT_TTL_SECONDS=900              # 15 minutos (access token)
JWT_REFRESH_TTL_SECONDS=86400    # 24 horas (refresh token)
```

### 3. `api/env.production.example` - Produção
**Uso:** Copiar para `.env.production` no ambiente de produção

**Configuração JWT:**
```bash
JWT_TTL_SECONDS=900              # 15 minutos (access token)
JWT_REFRESH_TTL_SECONDS=86400    # 24 horas (refresh token)
```

---

## ⚠️ IMPORTANTE

### Variável de Expiração do Token

**NÃO existe** variável `JWT_EXPIRES_IN` no projeto.

**A variável correta é:**
- `JWT_TTL_SECONDS` - Tempo de vida do access token em **segundos**
- `JWT_REFRESH_TTL_SECONDS` - Tempo de vida do refresh token em **segundos**

### Valores Padrão nos Exemplos:

- **Access Token:** `900` segundos = **15 minutos** ✅ (OK - não expira imediatamente)
- **Refresh Token:** `86400` segundos = **24 horas** ✅ (OK)

---

## 📝 COMO CRIAR O ARQUIVO .ENV

### Para Produção no EC2:

1. **Copiar o exemplo:**
   ```bash
   cd api
   cp env.production.example .env.production
   ```

2. **Editar e configurar:**
   ```bash
   nano .env.production
   # ou
   vi .env.production
   ```

3. **Configurar valores obrigatórios:**
   - `JWT_SECRET` - Gerar com: `openssl rand -base64 32`
   - `JWT_REFRESH_SECRET` - Gerar com: `openssl rand -base64 32`
   - `DATABASE_URL` - URL do banco de dados
   - `ALLOWED_ORIGINS` - Domínios permitidos
   - `ADMIN_PASSWORD` - Senha forte do admin

---

## 🔍 VERIFICAÇÃO DA EXPIRAÇÃO DO TOKEN

### Valores Atuais nos Exemplos:

- ✅ `JWT_TTL_SECONDS=900` = **15 minutos** (NÃO expira imediatamente)
- ✅ `JWT_REFRESH_TTL_SECONDS=86400` = **24 horas**

### Status da Validação:

- ✅ **Token não expira imediatamente** - 15 minutos é um valor razoável
- ⚠️ **Recomendação:** Para produção com 1 usuário, pode aumentar para 24h se desejar:
  ```bash
  JWT_TTL_SECONDS=86400  # 24 horas
  ```

---

## 📊 RESUMO

| Arquivo | Ambiente | JWT_TTL_SECONDS | Status |
|---------|----------|-----------------|--------|
| `env.local.example` | Local | 900 (15min) | ✅ OK |
| `env.hmg.example` | HMG | 900 (15min) | ✅ OK |
| `env.production.example` | Produção | 900 (15min) | ✅ OK |

**Conclusão:** Os arquivos de exemplo estão configurados corretamente. O token **NÃO expira imediatamente** (15 minutos é razoável).

---

**Próximo Passo:** No servidor EC2, criar o arquivo `.env.production` baseado no exemplo e configurar os valores reais.
