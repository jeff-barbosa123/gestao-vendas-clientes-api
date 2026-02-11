# 🧪 PLANO DE EXECUÇÃO - TESTES CYPRESS (SGVC)

**Data:** 2025-01-10  
**QA Lead:** Automação e Qualidade  
**Objetivo:** Executar e validar testes Cypress de forma controlada

---

## 📋 ESTRATÉGIA DE EXECUÇÃO

### Opção 1: Execução Completa (Recomendada)
```bash
npx cypress run
```
- Executa todos os testes em modo headless
- Gera relatório completo
- Ideal para validação final

### Opção 2: Execução por Arquivo (Debug)
```bash
npx cypress run --spec "cypress/e2e/client-edit.cy.js"
```
- Executa apenas um arquivo específico
- Útil para debug de falhas específicas

### Opção 3: Modo Interativo (Desenvolvimento)
```bash
npx cypress open
```
- Abre interface gráfica do Cypress
- Permite execução seletiva
- Útil para desenvolvimento

---

## 🎯 PRIORIZAÇÃO DE TESTES

### Prioridade ALTA (Críticos para Produção):

1. ✅ **login.cy.js** - Autenticação (base de tudo)
2. ✅ **client-edit.cy.js** - Edição de clientes (já corrigido)
3. ✅ **clients-form.cy.js** - Cadastro de clientes
4. ✅ **dashboard.cy.js** - Dashboard principal
5. ✅ **session.cy.js** - Gerenciamento de sessão

### Prioridade MÉDIA:

6. ⚠️ **clients-listing.cy.js** - Listagem
7. ⚠️ **products.cy.js** - Produtos
8. ⚠️ **recipes.cy.js** - Fichas técnicas
9. ⚠️ **profile.cy.js** - Perfil

### Prioridade BAIXA:

10. ⚠️ **sales.cy.js** - Vendas
11. ⚠️ **register.cy.js** - Registro
12. ⚠️ **security.cy.js** - Segurança
13. ⚠️ **regression.cy.js** - Regressão
14. ⚠️ **fluxo-completo.cy.js** - Fluxo completo
15. ⚠️ **accessibility.cy.js** - Acessibilidade
16. ⚠️ **password-strength.cy.js** - Força de senha

---

## ⚠️ PRÉ-REQUISITOS

### Antes de Executar:

1. ✅ **Backend rodando** (localhost:3000)
2. ✅ **Frontend rodando** (localhost:4000)
3. ✅ **Cypress instalado** (`npm install` se necessário)
4. ✅ **Dados de teste disponíveis** (fixtures)

### Verificações:

```bash
# Verificar se backend está rodando
curl http://localhost:3000/api/health

# Verificar se frontend está rodando
curl http://localhost:4000
```

---

## 📊 TEMPLATE DE ANÁLISE

Para cada teste que falhar, registrar:

```markdown
### [Nome do Teste]

**Arquivo:** `[arquivo].cy.js`  
**Linha:** [linha]  
**Status:** ❌ Falhou

**Erro:**
```
[Erro completo do Cypress]
```

**Classificação QA:**
- [ ] 🔹 Teste desatualizado
- [ ] 🔹 Teste frágil
- [ ] 🔹 Bug real da aplicação
- [ ] ⚠️ Falha de ambiente/dados

**Análise:**
[Análise detalhada do motivo da falha]

**Evidência:**
- Screenshot: [caminho]
- Log: [caminho]
```

---

## 🎯 CRITÉRIO DE SUCESSO

### Execução Válida se:

- ✅ Todos os testes críticos foram executados
- ✅ Falhas estão classificadas
- ✅ Nenhuma regressão crítica identificada
- ✅ Sistema permanece funcional

### Go / No-Go:

- ✅ **GO:** Taxa de sucesso ≥ 80% e nenhuma falha crítica
- ⚠️ **GO COM RESSALVA:** Taxa de sucesso ≥ 60% e falhas não críticas
- ❌ **NO-GO:** Taxa de sucesso < 60% ou falhas críticas

---

**Status:** 🔄 **PRONTO PARA EXECUÇÃO**
