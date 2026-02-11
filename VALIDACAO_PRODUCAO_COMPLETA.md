# ✅ VALIDAÇÃO COMPLETA PARA PRODUÇÃO - SGVC (1 USUÁRIO)

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

**Status:** ✅ **VERIFICADO NO CÓDIGO**

**Verificações de Código:**
- [x] Verificar se bcrypt é usado - ✅ **PASSOU** (bcrypt implementado)
- [x] Verificar implementação de hash - ✅ **PASSOU** (`bcrypt.hash` com saltRounds=10)
- [x] Verificar que senhas não são retornadas na API - ✅ **PASSOU** (`delete user.password` antes de retornar)
- [x] Verificar que senhas não aparecem em logs - ✅ **PASSOU** (não encontrado)

**Evidência no Código:**
- `api/src/services/authService.js` - Função `hashPassword` usa `bcrypt.hash`
- `api/src/services/authService.js` - Senha removida antes de retornar (`delete user.password`)

**Próximo Passo:**
- [ ] **VERIFICAR NO BANCO** (após deploy) - Validar que senhas no banco são hashes

**Comando para verificar no banco (após deploy):**
```sql
-- PostgreSQL
SELECT id, email, LEFT(password, 20) as password_preview FROM users LIMIT 1;
-- Senha deve começar com $2a$ ou $2b$ (bcrypt), NÃO texto plano
```

**Resultado:** ✅ **PASSOU** (no código) - ⚠️ **PRECISA VALIDAR NO BANCO APÓS DEPLOY**

---

### ✅ 2. Token não expira imediatamente

**Status:** ⚠️ **VERIFICANDO NO CÓDIGO**

**Verificações de Código:**
- [ ] Verificar configuração de expiração do JWT
- [ ] Verificar valor de `expiresIn`
- [ ] Verificar se há refresh token

**Próximos Passos:**
1. Verificar código de geração de token
2. Verificar variáveis de ambiente
3. Testar token e verificar expiração

**Valor Esperado:**
- Mínimo: 1h (3600s) ou '1h'
- Recomendado: 24h (86400s) ou '24h'
- Aceitável: 7d (604800s) ou '7d'
- Máximo: 30d (2592000s) ou '30d'

**Resultado:** [A preencher após verificação no código]

---

### ✅ 3. Não há dados sensíveis além do necessário

**Status:** ⚠️ **VERIFICANDO**

**Verificações:**
- [x] Verificar se .env está no .gitignore
- [ ] Verificar se há senhas hardcoded
- [ ] Verificar se há tokens hardcoded
- [ ] Verificar logs (não devem logar senhas)
- [ ] Verificar respostas da API (não devem retornar senhas)

**Arquivos para verificar:**
- `.gitignore`
- Código de autenticação
- Código de logs
- Respostas da API

**Resultado:** [A preencher após verificação]

---

## 🧪 QUALIDADE MÍNIMA

### ✅ 4. Login funciona

**Status:** ⚠️ **AGUARDANDO TESTE MANUAL**

**Checklist de Teste:**
- [ ] Página de login carrega sem erros de console
- [ ] Validações de formulário funcionam
- [ ] Login com credenciais válidas funciona
- [ ] Redireciona para `/dashboard.html` após login
- [ ] Sessão é mantida (não volta para login ao recarregar)
- [ ] Logout funciona
- [ ] Mensagem de erro aparece para credenciais inválidas

**Teste Manual:**
1. Acessar `http://localhost:4000/` ou `http://localhost:4000/index.html`
2. Abrir console do navegador (F12)
3. Verificar que não há erros críticos
4. Preencher e-mail e senha válidos
5. Clicar em "Entrar"
6. Verificar redirecionamento para `/dashboard.html`
7. Recarregar página - deve permanecer no dashboard
8. Clicar em "Sair" - deve voltar para login

**Resultado:** [A preencher após teste]

---

### ✅ 5. Cadastro funciona

**Status:** ⚠️ **AGUARDANDO TESTE MANUAL**

**Nota:** Se não houver tela de cadastro, validar criação via API ou seed inicial.

**Checklist de Teste:**
- [ ] Tela de cadastro carrega (se existir)
- [ ] Validações funcionam (e-mail, senha forte, etc.)
- [ ] Cadastro de usuário funciona
- [ ] Após cadastro, pode fazer login
- [ ] Senha forte é exigida

**Teste Manual (se houver tela):**
1. Acessar tela de cadastro
2. Preencher dados válidos
3. Submeter formulário
4. Verificar criação no banco (opcional)
5. Tentar fazer login com credenciais criadas

**Teste via API (alternativo):**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@exemplo.com","password":"Teste@123","name":"Teste"}'
```

**Resultado:** [A preencher após teste]

---

### ✅ 6. Vendas funcionam

**Status:** ⚠️ **AGUARDANDO TESTE MANUAL**

**Checklist de Teste:**
- [ ] Tela de vendas carrega
- [ ] Listar vendas funciona
- [ ] Criar venda funciona
- [ ] Editar venda funciona (se aplicável)
- [ ] Remover venda funciona (se aplicável)
- [ ] Cálculos estão corretos (total, subtotal, etc.)

**Teste Manual:**
1. Fazer login
2. Acessar tela de vendas
3. Criar uma venda de teste
4. Verificar que aparece na lista
5. Verificar cálculos (total, etc.)
6. Verificar console (sem erros críticos)

**Resultado:** [A preencher após teste]

---

### ✅ 7. Relatórios abrem

**Status:** ⚠️ **AGUARDANDO TESTE MANUAL**

**Checklist de Teste:**
- [ ] Tela de relatórios carrega (`/reports.html`)
- [ ] Filtros funcionam (período, breakdown)
- [ ] Dados são exibidos corretamente
- [ ] Exportação CSV funciona
- [ ] Exportação Excel funciona (se aplicável)
- [ ] Exportação PDF funciona (se aplicável)
- [ ] Não há erros no console

**Teste Manual:**
1. Fazer login
2. Acessar `/reports.html`
3. Aplicar filtros (período, etc.)
4. Verificar exibição de dados
5. Tentar exportar CSV
6. Tentar exportar Excel (se disponível)
7. Tentar exportar PDF (se disponível)
8. Abrir console (F12) e verificar sem erros críticos

**Resultado:** [A preencher após teste]

---

## 🔧 OPERAÇÃO

### ✅ 8. Você consegue corrigir rápido

**Status:** ⚠️ **VERIFICANDO DOCUMENTAÇÃO**

**Verificações:**
- [ ] Há README.md com instruções
- [ ] Há documentação de deploy
- [ ] Logs são claros e úteis
- [ ] Estrutura de código é organizada
- [ ] Processo de deploy é documentado

**Arquivos para verificar:**
- `README.md`
- `COMO_INICIAR.md` ou similar
- Estrutura de logs
- Processo de versionamento

**Comandos úteis para correção rápida:**
```bash
# Ver logs da aplicação
# (depende do processo manager usado)

# Ver logs do PM2 (se usar PM2)
pm2 logs

# Ver logs do sistema (se usar systemd)
journalctl -u nome-servico -f

# Reiniciar aplicação
pm2 restart all
# ou
systemctl restart nome-servico
```

**Resultado:** [A preencher após verificação]

---

### ✅ 9. Backup básico (nem que seja manual)

**Status:** ⚠️ **VERIFICANDO DOCUMENTAÇÃO**

**Verificações:**
- [ ] Há instruções de como fazer backup
- [ ] Comando de backup funciona
- [ ] Comando de restore funciona
- [ ] Frequência de backup definida
- [ ] Local de armazenamento definido

**Backup do Banco de Dados (PostgreSQL):**
```bash
# Criar backup
pg_dump -U usuario -d nome_banco -F c -f backup_$(date +%Y%m%d_%H%M%S).dump

# Ou formato SQL (mais simples, mas maior)
pg_dump -U usuario -d nome_banco > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurar backup (formato custom)
pg_restore -U usuario -d nome_banco backup_YYYYMMDD_HHMMSS.dump

# Restaurar backup (formato SQL)
psql -U usuario -d nome_banco < backup_YYYYMMDD_HHMMSS.sql
```

**Backup do Banco de Dados (MySQL/MariaDB):**
```bash
# Criar backup
mysqldump -u usuario -p nome_banco > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurar backup
mysql -u usuario -p nome_banco < backup_YYYYMMDD_HHMMSS.sql
```

**Frequência Recomendada:**
- Diário (mínimo)
- Semanal (aceitável para 1 usuário)
- Antes de atualizações (obrigatório)

**Resultado:** [A preencher após verificação]

---

### ✅ 10. Acesso direto ao servidor

**Status:** ⚠️ **AGUARDANDO INFORMAÇÕES DE PRODUÇÃO**

**Verificações:**
- [ ] Você tem acesso SSH ao servidor (se aplicável)
- [ ] Você tem acesso ao banco de dados
- [ ] Você tem acesso aos logs
- [ ] Você tem acesso ao processo/PM2/systemd
- [ ] Credenciais de acesso estão seguras

**Acesso Necessário:**
- [ ] **SSH/Terminal do servidor**
  - IP/hostname
  - Usuário
  - Chave SSH ou senha

- [ ] **Banco de dados**
  - Host
  - Porta
  - Usuário
  - Senha
  - Nome do banco

- [ ] **Logs da aplicação**
  - Localização dos logs
  - Comando para ver logs

- [ ] **Process Manager**
  - PM2, systemd, Docker, etc.
  - Comando para reiniciar
  - Comando para ver status

**Documentar Credenciais (SEGURO):**
- [ ] Usar gerenciador de senhas (1Password, LastPass, etc.)
- [ ] NÃO commitear credenciais
- [ ] Compartilhar de forma segura

**Resultado:** [A preencher após configurar acesso]

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

**Próximo Passo:** Executar verificações de código e testes manuais

---

## 🎯 CHECKLIST DE AÇÃO

### Antes de Colocar em Produção:

1. **Verificar Código:**
   - [ ] Verificar hash de senhas (bcrypt)
   - [ ] Verificar expiração de tokens (mínimo 1h)
   - [ ] Verificar .gitignore (.env não commitado)
   - [ ] Verificar que senhas não são logadas

2. **Testar Funcionalidades:**
   - [ ] Testar login
   - [ ] Testar cadastro (ou criação inicial)
   - [ ] Testar vendas
   - [ ] Testar relatórios

3. **Preparar Operação:**
   - [ ] Documentar processo de backup
   - [ ] Documentar acesso ao servidor
   - [ ] Documentar processo de deploy
   - [ ] Documentar processo de rollback

4. **Validação Final:**
   - [ ] Preencher este checklist
   - [ ] Todas as verificações marcadas
   - [ ] Testes manuais realizados
   - [ ] Documentação atualizada

---

**Nota:** Este checklist deve ser preenchido ANTES de colocar em produção. Cada item deve ser validado e marcado.
