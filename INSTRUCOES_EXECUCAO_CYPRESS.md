# 🧪 INSTRUÇÕES DE EXECUÇÃO - TESTES CYPRESS (SGVC)

**Data:** 2025-01-10  
**QA Lead:** Automação e Qualidade  
**Status:** ✅ **PRONTO PARA EXECUÇÃO**

---

## 📋 PREPARAÇÃO DO AMBIENTE

### 1. Verificar Pré-requisitos:

```powershell
# Verificar se node_modules existe
cd gestao-vendas-clientes-api-V1
Test-Path "node_modules"

# Se não existir, instalar dependências
npm install
```

### 2. Iniciar Servidores:

**Terminal 1 - Backend:**
```powershell
cd gestao-vendas-clientes-api-V1\api
npm run dev
# Backend deve estar rodando em http://localhost:3000
```

**Terminal 2 - Frontend:**
```powershell
cd gestao-vendas-clientes-api-V1\web
npm start
# Frontend deve estar rodando em http://localhost:4000
```

**Terminal 3 - Cypress (execução):**
```powershell
cd gestao-vendas-clientes-api-V1
```

---

## 🚀 EXECUÇÃO DOS TESTES

### Opção 1: Execução Completa (Recomendada)

```powershell
npm run cypress:run:local
```

**Ou:**
```powershell
npx cypress run
```

**Resultado:**
- Executa todos os 16 arquivos de teste
- Gera relatório em `cypress/reports/`
- Screenshots de falhas em `cypress/screenshots/`

---

### Opção 2: Execução por Prioridade

#### Prioridade ALTA (Executar Primeiro):

```powershell
# 1. Login (base de tudo)
npx cypress run --spec "cypress/e2e/login.cy.js"

# 2. Edição de clientes (já corrigido)
npx cypress run --spec "cypress/e2e/client-edit.cy.js"

# 3. Cadastro de clientes
npx cypress run --spec "cypress/e2e/clients-form.cy.js"

# 4. Dashboard
npx cypress run --spec "cypress/e2e/dashboard.cy.js"

# 5. Sessão
npx cypress run --spec "cypress/e2e/session.cy.js"
```

---

### Opção 3: Modo Interativo (Debug)

```powershell
npm run cypress:open:local
```

**Ou:**
```powershell
npx cypress open
```

**Vantagens:**
- Interface gráfica
- Execução seletiva
- Visualização em tempo real
- Debug facilitado

---

## 📊 ANÁLISE DOS RESULTADOS

### Após Execução, Analisar:

1. **Relatório HTML:**
   - Localização: `cypress/reports/[name]-report.html`
   - Abrir no navegador para visualização completa

2. **Console Output:**
   - Verificar resumo de testes
   - Identificar falhas
   - Anotar erros específicos

3. **Screenshots:**
   - Localização: `cypress/screenshots/[arquivo]/[teste].png`
   - Analisar estado da tela no momento da falha

---

## 🔍 CLASSIFICAÇÃO DE FALHAS

### Para cada teste que falhar, classificar:

#### 🔹 Teste Desatualizado
- Mensagem/texto mudou na aplicação
- Seletor mudou (ID/class)
- Comportamento mudou (mas aplicação está correta)

**Ação:** Ajustar teste Cypress

#### 🔹 Teste Frágil
- Timing (elemento não carregou a tempo)
- Seletor instável
- Dados de teste inconsistentes
- Dependência de estado externo

**Ação:** Tornar teste mais robusto

#### 🔹 Bug Real da Aplicação
- Comportamento incorreto
- Validação quebrada
- Fluxo não funciona
- Erro JavaScript

**Ação:** Corrigir aplicação

#### ⚠️ Falha de Ambiente/Dados
- Backend não está rodando
- Frontend não está rodando
- Dados de teste ausentes
- Configuração incorreta

**Ação:** Ajustar ambiente

---

## 📝 TEMPLATE DE REGISTRO DE FALHA

```markdown
### [Nome do Teste]

**Arquivo:** `[arquivo].cy.js`  
**Suite:** `[describe]`  
**Linha:** [linha]  
**Status:** ❌ Falhou

**Erro:**
```
[Erro completo do Cypress]
```

**Screenshot:** `cypress/screenshots/[arquivo]/[teste].png`

**Classificação QA:**
- [ ] 🔹 Teste desatualizado
- [ ] 🔹 Teste frágil
- [ ] 🔹 Bug real da aplicação
- [ ] ⚠️ Falha de ambiente/dados

**Análise:**
[Análise detalhada do motivo da falha]

**Ação Recomendada:**
- [ ] Ajustar teste Cypress
- [ ] Corrigir aplicação
- [ ] Ajustar ambiente/dados
- [ ] Investigar mais

**Prioridade:**
- [ ] ALTA (bloqueante)
- [ ] MÉDIA (importante)
- [ ] BAIXA (pode esperar)
```

---

## ✅ TESTES JÁ CORRIGIDOS

### client-edit.cy.js:

1. ✅ **"Editar nome salva a alteracao"** (linha 57)
   - Espera: "Cliente atualizado com sucesso"
   - Status: ✅ Pronto para execução

2. ✅ **"Editar endereco reflete nos campos"** (linha 75)
   - Espera: "Cliente atualizado com sucesso"
   - Status: ✅ Pronto para execução

3. ✅ **"Salvar alteracoes mostra o feedback certo"** (linha 91)
   - Espera: "Cliente atualizado com sucesso"
   - Status: ✅ Pronto para execução

---

## 🎯 CRITÉRIO DE SUCESSO

### Execução Válida se:

- ✅ Todos os testes críticos foram executados
- ✅ Falhas estão classificadas com análise QA
- ✅ Nenhuma regressão crítica identificada
- ✅ Sistema permanece funcional

### Decisão Go / No-Go:

#### ✅ **GO para Produção:**
- Taxa de sucesso ≥ 80%
- Nenhuma falha crítica
- Falhas restantes são não-críticas e classificadas

#### ⚠️ **GO COM RESSALVA:**
- Taxa de sucesso ≥ 60%
- Falhas não-críticas
- Plano de correção documentado

#### ❌ **NO-GO:**
- Taxa de sucesso < 60%
- Falhas críticas (login, salvamento, remoção)
- Regressões identificadas

---

## 📌 PRÓXIMOS PASSOS

1. **Preparar ambiente** (backend + frontend rodando)
2. **Executar testes** (começar com prioridade ALTA)
3. **Analisar resultados** (classificar cada falha)
4. **Documentar falhas** (usar template acima)
5. **Tomar decisão** (Go / No-Go baseado em evidências)

---

**Status:** ✅ **PRONTO PARA EXECUÇÃO MANUAL**

**Comandos Prontos:**
- `npm run cypress:run:local` - Execução completa
- `npm run cypress:open:local` - Modo interativo
- `npx cypress run --spec "cypress/e2e/[arquivo].cy.js"` - Arquivo específico
