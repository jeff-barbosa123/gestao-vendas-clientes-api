# ⚙️ CONFIGURAÇÃO DA AUTOMAÇÃO CYPRESS

## 🎯 Opções de Execução

O script de automação agora suporta diferentes modos de execução através de variáveis de ambiente.

---

## 📋 Configurações Disponíveis

### 1. **CREATE_NEW_USER** (Criar Novo Usuário)

**Padrão:** `false` (usa usuário existente)

- `false` ou não definido → Usa usuário existente (`admin@negocio.com`)
- `true` → Cria um novo usuário a cada execução

**Exemplo:**
```bash
# Criar novo usuário
CREATE_NEW_USER=true npm run cypress:run:fluxo-completo

# Usar usuário existente (padrão)
npm run cypress:run:fluxo-completo
```

### 2. **CREATE_RECIPE** (Criar Receita)

**Padrão:** `true` (sempre cria receita)

- `true` ou não definido → Sempre cria uma nova receita
- `false` → Não cria receita (apenas navega)

**Exemplo:**
```bash
# Criar receita (padrão)
npm run cypress:run:fluxo-completo

# Não criar receita
CREATE_RECIPE=false npm run cypress:run:fluxo-completo
```

---

## 🚀 Scripts Pré-configurados

### Modo Padrão (Usuário Existente + Criar Receita)
```bash
npm run cypress:run:fluxo-completo
```

### Modo com Novo Usuário
```bash
npm run cypress:run:fluxo-completo:novo-usuario
```

### Modo sem Criar Receita
```bash
npm run cypress:run:fluxo-completo:sem-receita
```

---

## 🔧 Exemplos de Uso

### Caso 1: Testar com usuário existente e criar receita (RECOMENDADO)
```bash
# Execução padrão - mais rápido, não cria lixo no banco
npm run cypress:run:fluxo-completo
```
**Vantagens:**
- ✅ Mais rápido
- ✅ Não cria usuários duplicados
- ✅ Sempre cria receita nova para teste

### Caso 2: Testar criação de usuário completo
```bash
# Criar novo usuário e testar fluxo completo
CREATE_NEW_USER=true npm run cypress:run:fluxo-completo
```
**Vantagens:**
- ✅ Testa todo o fluxo de registro
- ✅ Valida criação de usuário

### Caso 3: Teste rápido sem criar receita
```bash
# Apenas navegar, sem criar receita
CREATE_RECIPE=false npm run cypress:run:fluxo-completo
```
**Vantagens:**
- ✅ Mais rápido
- ✅ Útil para testar apenas navegação

### Caso 4: Combinando opções
```bash
# Novo usuário + sem criar receita
CREATE_NEW_USER=true CREATE_RECIPE=false npm run cypress:run:fluxo-completo
```

---

## 📝 Variáveis de Ambiente Completas

```bash
# Todas as opções
CYPRESS_BASE_URL=http://localhost:4000 \
CREATE_NEW_USER=false \
CREATE_RECIPE=true \
npm run cypress:run:fluxo-completo
```

---

## 🎯 Recomendação de Uso

### Para Desenvolvimento Diário
```bash
# Usar usuário existente + criar receita (padrão)
npm run cypress:run:fluxo-completo
```

### Para Validação de Registro
```bash
# Criar novo usuário uma vez para validar
CREATE_NEW_USER=true npm run cypress:run:fluxo-completo
```

### Para CI/CD
```bash
# Modo headless com usuário existente (mais rápido)
CREATE_NEW_USER=false CREATE_RECIPE=true npm run cypress:run:fluxo-completo
```

---

## 🔄 Comportamento Padrão

**Sem configurações:**
- ✅ Usa usuário: `admin@negocio.com`
- ✅ Cria receita nova
- ✅ Executa todas as funcionalidades
- ✅ Limpa sessão após teste

**Dados de teste:**
- Usuário: `admin@negocio.com` / `Admin@123!`
- Receita: Nome único com timestamp (evita conflitos)

---

## 📊 Resumo das Opções

| Configuração | Padrão | Quando Usar |
|--------------|--------|-------------|
| `CREATE_NEW_USER=false` | ✅ | Uso diário, desenvolvimento |
| `CREATE_NEW_USER=true` | ❌ | Testar fluxo de registro |
| `CREATE_RECIPE=true` | ✅ | Validação completa |
| `CREATE_RECIPE=false` | ❌ | Teste rápido apenas navegação |

---

**Última atualização:** 2025-01-XX
