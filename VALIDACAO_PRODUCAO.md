# ✅ VALIDAÇÃO PARA PRODUÇÃO - SGVC (1 USUÁRIO)

**Data:** 2025-01-10  
**Foco:** Validação crítica para produção  
**Escopo:** Sistema para 1 usuário  
**Status:** 🔄 **VALIDAÇÃO EM ANDAMENTO**

---

## ⚠️ REGRAS DE OURO PARA PRODUÇÃO

### Antes ou logo após subir, garantir:

1. 🔒 **Segurança mínima**
2. 🧪 **Qualidade mínima**
3. 🔧 **Operação**

---

## 🔒 SEGURANÇA MÍNIMA

### ✅ 1. Senha não está em texto plano

**Status:** ⚠️ **VERIFICANDO**

**Verificações:**
- [ ] Senhas são hasheadas antes de salvar no banco
- [ ] Biblioteca de hash usada (bcrypt, argon2, etc.)
- [ ] Senhas nunca aparecem em logs
- [ ] Senhas não são retornadas em respostas da API

**Comando para verificar:**
```sql
-- Verificar no banco de dados
SELECT id, email, password FROM users LIMIT 1;
-- Senha deve ser um hash (ex: $2a$10$...), NÃO texto plano
```

**Resultado:** [A preencher após verificação]

---

### ✅ 2. Token não expira imediatamente

**Status:** ⚠️ **VERIFICANDO**

**Verificações:**
- [ ] Token JWT tem tempo de expiração configurado
- [ ] Tempo de expiração é razoável (ex: 24h, 7d)
- [ ] Refresh token implementado (recomendado)
- [ ] Token não expira em minutos ou segundos

**Arquivos para verificar:**
- `api/src/config/jwt.js`
- `api/src/services/authService.js`
- Variável de ambiente: `JWT_EXPIRES_IN` ou similar

**Valor esperado:**
- Mínimo: 1h (3600s)
- Recomendado: 24h (86400s) ou 7d (604800s)
- Máximo: 30d (2592000s)

**Resultado:** [A preencher após verificação]

---

### ✅ 3. Não há dados sensíveis além do necessário

**Status:** ⚠️ **VERIFICANDO**

**Verificações:**
- [ ] Variáveis de ambiente não estão commitadas (.env no .gitignore)
- [ ] Chaves secretas não estão hardcoded no código
- [ ] Logs não contêm senhas ou tokens
- [ ] Respostas da API não retornam senhas
- [ ] Banco de dados não expõe dados sensíveis

**Arquivos para verificar:**
- `.gitignore` (deve incluir `.env`, `.env.*`)
- `api/.env.example` (não deve conter valores reais)
- Código de autenticação (não deve logar senhas)

**Comando para verificar:**
```bash
# Verificar se .env está no .gitignore
grep -E "^\.env" .gitignore

# Verificar se há senhas hardcoded (BÁSICO - pode ter falsos positivos)
grep -r "password.*=.*['\"].*[^$]" api/src --exclude-dir=node_modules
```

**Resultado:** [A preencher após verificação]

---

## 🧪 QUALIDADE MÍNIMA

### ✅ 4. Login funciona

**Status:** ⚠️ **AGUARDANDO TESTE**

**Verificações:**
- [ ] Página de login carrega sem erros
- [ ] Login com credenciais válidas funciona
- [ ] Redireciona para dashboard após login
- [ ] Sessão é mantida após login
- [ ] Logout funciona

**Teste Manual:**
1. Acessar `/` ou `/index.html`
2. Preencher e-mail e senha válidos
3. Clicar em "Entrar"
4. Verificar redirecionamento para `/dashboard.html`
5. Verificar que não volta para login automaticamente

**Resultado:** [A preencher após teste]

---

### ✅ 5. Cadastro funciona

**Status:** ⚠️ **AGUARDANDO TESTE**

**Verificações:**
- [ ] Página de cadastro carrega
- [ ] Validações de formulário funcionam
- [ ] Cadastro de usuário funciona
- [ ] Após cadastro, pode fazer login
- [ ] Senha forte é exigida

**Teste Manual:**
1. Acessar página de cadastro (se existir) ou criar usuário via API
2. Preencher dados válidos
3. Submeter formulário
4. Verificar criação no banco
5. Tentar fazer login com credenciais criadas

**Resultado:** [A preencher após teste]

---

### ✅ 6. Vendas funcionam

**Status:** ⚠️ **AGUARDANDO TESTE**

**Verificações:**
- [ ] Tela de vendas carrega
- [ ] Criar venda funciona
- [ ] Listar vendas funciona
- [ ] Editar venda funciona (se aplicável)
- [ ] Remover venda funciona (se aplicável)
- [ ] Cálculos estão corretos

**Teste Manual:**
1. Acessar tela de vendas
2. Criar uma venda de teste
3. Verificar que aparece na lista
4. Verificar cálculos (total, etc.)

**Resultado:** [A preencher após teste]

---

### ✅ 7. Relatórios abrem

**Status:** ⚠️ **AGUARDANDO TESTE**

**Verificações:**
- [ ] Tela de relatórios carrega
- [ ] Filtros funcionam
- [ ] Dados são exibidos
- [ ] Exportação funciona (CSV, Excel, PDF)
- [ ] Não há erros no console

**Teste Manual:**
1. Acessar `/reports.html`
2. Aplicar filtros (período, etc.)
3. Verificar exibição de dados
4. Tentar exportar (CSV, Excel, PDF)
5. Verificar console do navegador (sem erros críticos)

**Resultado:** [A preencher após teste]

---

## 🔧 OPERAÇÃO

### ✅ 8. Você consegue corrigir rápido

**Status:** ⚠️ **VERIFICANDO**

**Verificações:**
- [ ] Código está organizado e documentado
- [ ] Logs são claros e úteis
- [ ] Há documentação de como fazer deploy
- [ ] Há documentação de como reverter mudanças
- [ ] Processo de deploy é simples

**Arquivos para verificar:**
- `README.md` ou documentação de deploy
- Estrutura de logs
- Processo de versionamento

**Resultado:** [A preencher após verificação]

---

### ✅ 9. Backup básico (nem que seja manual)

**Status:** ⚠️ **VERIFICANDO**

**Verificações:**
- [ ] Há instruções de como fazer backup
- [ ] Backup do banco de dados funciona
- [ ] Backup pode ser restaurado
- [ ] Frequência de backup definida
- [ ] Local de armazenamento definido

**Comando para backup (PostgreSQL):**
```bash
# Backup do banco
pg_dump -U usuario -d nome_banco > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurar backup
psql -U usuario -d nome_banco < backup_YYYYMMDD_HHMMSS.sql
```

**Resultado:** [A preencher após verificação]

---

### ✅ 10. Acesso direto ao servidor

**Status:** ⚠️ **VERIFICANDO**

**Verificações:**
- [ ] Você tem acesso SSH ao servidor (se aplicável)
- [ ] Você tem acesso ao banco de dados
- [ ] Você tem acesso aos logs
- [ ] Você tem acesso ao processo/PM2 (se aplicável)
- [ ] Credenciais de acesso estão seguras

**Acesso necessário:**
- [ ] SSH/terminal do servidor
- [ ] Banco de dados (psql, mysql, etc.)
- [ ] Logs da aplicação
- [ ] Process manager (PM2, systemd, etc.)
- [ ] Gerenciador de arquivos/FTP (se aplicável)

**Resultado:** [A preencher após verificação]

---

## 📊 RESUMO DA VALIDAÇÃO

### Segurança Mínima:
- [ ] ✅ Senha não está em texto plano
- [ ] ✅ Token não expira imediatamente
- [ ] ✅ Não há dados sensíveis além do necessário

### Qualidade Mínima:
- [ ] ✅ Login funciona
- [ ] ✅ Cadastro funciona
- [ ] ✅ Vendas funcionam
- [ ] ✅ Relatórios abrem

### Operação:
- [ ] ✅ Você consegue corrigir rápido
- [ ] ✅ Backup básico (nem que seja manual)
- [ ] ✅ Acesso direto ao servidor

**Status Geral:** ⚠️ **VALIDAÇÃO EM ANDAMENTO**

---

## 🎯 PRÓXIMOS PASSOS

1. **Executar verificações de código:**
   - [ ] Verificar hash de senhas
   - [ ] Verificar expiração de tokens
   - [ ] Verificar variáveis de ambiente

2. **Executar testes manuais:**
   - [ ] Testar login
   - [ ] Testar cadastro
   - [ ] Testar vendas
   - [ ] Testar relatórios

3. **Preparar operação:**
   - [ ] Documentar processo de backup
   - [ ] Documentar acesso ao servidor
   - [ ] Documentar processo de correção

---

**Nota:** Este checklist deve ser preenchido antes de colocar em produção. Cada item deve ser validado e marcado.
