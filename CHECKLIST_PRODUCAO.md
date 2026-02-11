# ✅ CHECKLIST PARA PRODUÇÃO - SGVC (1 USUÁRIO)

**Data:** 2025-01-10  
**Foco:** Validação crítica antes de produção  
**Status:** 📋 **CHECKLIST PRONTO**

---

## 🔒 SEGURANÇA MÍNIMA

### ✅ 1. Senha não está em texto plano

**Verificação no Código:** ✅ **PASSOU**
- ✅ bcrypt implementado (package.json: `"bcrypt": "^5.1.1"`)
- ✅ Função `hashPassword` usa `bcrypt.hash` com saltRounds=10
- ✅ Senha removida antes de retornar na API

**Ação Necessária:**
- [ ] **Validar no banco após deploy:**
  ```sql
  SELECT id, email, LEFT(password, 20) FROM users LIMIT 1;
  -- Deve começar com $2a$ ou $2b$ (bcrypt)
  ```

---

### ⚠️ 2. Token não expira imediatamente

**Verificação no Código:** ⚠️ **PRECISA VERIFICAR**

**Ação Necessária:**
- [ ] Verificar variável de ambiente `JWT_EXPIRES_IN` no arquivo `.env`
- [ ] Garantir que seja ≥ 1h ('1h' ou 3600)
- [ ] Recomendado: 24h ('24h' ou 86400)

**Valores Aceitáveis:**
- Mínimo: 1h
- Recomendado: 24h
- Máximo: 30d

---

### ✅ 3. Não há dados sensíveis além do necessário

**Verificação no Código:** ✅ **PASSOU**
- ✅ `.gitignore` existe e inclui `.env` (linha 9)
- ✅ `.env.local` também está no `.gitignore`
- ✅ Senha removida antes de retornar na API

**Ação Necessária:**
- [x] ✅ Confirmar que `.env` está no `.gitignore` - **CONFIRMADO**
- [ ] Verificar que nenhum arquivo `.env` está commitado no Git (executar: `git ls-files | grep .env`)

---

## 🧪 QUALIDADE MÍNIMA

### ⚠️ 4. Login funciona

**Ação Necessária:**
- [ ] Testar página de login (`/` ou `/index.html`)
- [ ] Verificar que login com credenciais válidas funciona
- [ ] Verificar redirecionamento para `/dashboard.html`
- [ ] Verificar que sessão é mantida

---

### ⚠️ 5. Cadastro funciona

**Ação Necessária:**
- [ ] Testar cadastro de usuário (tela ou API)
- [ ] Verificar que após cadastro pode fazer login
- [ ] Verificar validação de senha forte

---

### ⚠️ 6. Vendas funcionam

**Ação Necessária:**
- [ ] Testar criação de venda
- [ ] Testar listagem de vendas
- [ ] Verificar cálculos (total, subtotal, etc.)

---

### ⚠️ 7. Relatórios abrem

**Ação Necessária:**
- [ ] Testar tela de relatórios (`/reports.html`)
- [ ] Testar filtros
- [ ] Testar exportação (CSV, Excel, PDF)
- [ ] Verificar console sem erros críticos

---

## 🔧 OPERAÇÃO

### ⚠️ 8. Você consegue corrigir rápido

**Ação Necessária:**
- [ ] Documentar processo de deploy
- [ ] Documentar localização de logs
- [ ] Documentar como reiniciar aplicação

---

### ⚠️ 9. Backup básico (nem que seja manual)

**Ação Necessária:**
- [ ] Documentar comando de backup do banco
- [ ] Testar backup e restore
- [ ] Definir frequência de backup (mínimo: antes de atualizações)

**Backup PostgreSQL:**
```bash
pg_dump -U usuario -d nome_banco > backup_$(date +%Y%m%d_%H%M%S).sql
```

**Restore PostgreSQL:**
```bash
psql -U usuario -d nome_banco < backup_YYYYMMDD_HHMMSS.sql
```

---

### ⚠️ 10. Acesso direto ao servidor

**Ação Necessária:**
- [ ] Documentar acesso SSH (se aplicável)
- [ ] Documentar acesso ao banco (host, porta, usuário, senha)
- [ ] Documentar processo manager (PM2, systemd, etc.)
- [ ] Armazenar credenciais de forma segura (gerenciador de senhas)

---

## 📊 RESUMO

### ✅ Validado no Código:
- ✅ Senha não está em texto plano (bcrypt)
- ✅ Não há dados sensíveis além do necessário

### ⚠️ Precisa Verificar:
- ⚠️ Token não expira imediatamente (verificar `.env`)
- ⚠️ Todos os testes manuais
- ⚠️ Operação (backup, acesso, documentação)

---

## 🎯 PRÓXIMOS PASSOS

1. **Verificar Token Expiration:**
   - [ ] Verificar `.env` para `JWT_EXPIRES_IN`
   - [ ] Garantir que seja ≥ 1h

2. **Testes Manuais:**
   - [ ] Login
   - [ ] Cadastro
   - [ ] Vendas
   - [ ] Relatórios

3. **Validar no Banco (após deploy):**
   - [ ] Verificar que senhas são hashes

4. **Documentar Operação:**
   - [ ] Backup
   - [ ] Acesso
   - [ ] Deploy

---

**Documentos Criados:**
- `VALIDACAO_PRODUCAO_COMPLETA.md` - Checklist detalhado
- `RESULTADO_VALIDACAO_FINAL.md` - Resultado da validação
- `CHECKLIST_PRODUCAO.md` - Este resumo
