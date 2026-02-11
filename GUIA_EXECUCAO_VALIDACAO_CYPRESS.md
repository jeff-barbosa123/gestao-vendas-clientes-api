# 🧪 GUIA DE EXECUÇÃO E VALIDAÇÃO - TESTES CYPRESS (SGVC)

**Data:** 2025-01-10  
**QA Lead:** Automação e Qualidade  
**Versão do Sistema:** 1.0.0  
**Status:** ✅ **GUIA COMPLETO PARA EXECUÇÃO**

---

## 📋 OBJETIVO

Executar e validar a suíte completa de testes automatizados Cypress do sistema SGVC, garantindo readiness para produção através de análise profissional e classificação precisa de falhas.

---

## ⚙️ PRÉ-REQUISITOS

### Ambiente Necessário:

1. **Backend API rodando:**
   ```powershell
   cd gestao-vendas-clientes-api-V1\api
   npm run dev
   # Verificar: http://localhost:3000/api/health
   ```

2. **Frontend rodando:**
   ```powershell
   cd gestao-vendas-clientes-api-V1\web
   npm start
   # Verificar: http://localhost:4000
   ```

3. **Cypress instalado:**
   ```powershell
   cd gestao-vendas-clientes-api-V1
   npm install
   ```

---

## 🚀 EXECUÇÃO DOS TESTES

### Opção 1: Execução Completa (Recomendada)

```powershell
cd gestao-vendas-clientes-api-V1
npm run cypress:run:local
```

**Vantagens:**
- Executa todos os 16 arquivos de teste
- Gera relatório completo em HTML
- Screenshots automáticos de falhas
- Saída no console

**Resultados:**
- Relatório: `cypress/reports/[name]-report.html`
- Screenshots: `cypress/screenshots/[arquivo]/[teste].png`
- Console: Resumo de execução

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

#### Prioridade MÉDIA:

```powershell
npx cypress run --spec "cypress/e2e/clients-listing.cy.js"
npx cypress run --spec "cypress/e2e/products.cy.js"
npx cypress run --spec "cypress/e2e/recipes.cy.js"
npx cypress run --spec "cypress/e2e/profile.cy.js"
```

#### Prioridade BAIXA:

```powershell
npx cypress run --spec "cypress/e2e/sales.cy.js"
npx cypress run --spec "cypress/e2e/register.cy.js"
npx cypress run --spec "cypress/e2e/security.cy.js"
npx cypress run --spec "cypress/e2e/regression.cy.js"
npx cypress run --spec "cypress/e2e/fluxo-completo.cy.js"
npx cypress run --spec "cypress/e2e/accessibility.cy.js"
npx cypress run --spec "cypress/e2e/password-strength.cy.js"
```

---

### Opção 3: Modo Interativo (Debug)

```powershell
npm run cypress:open:local
```

**Vantagens:**
- Interface gráfica do Cypress
- Execução seletiva de testes
- Visualização em tempo real
- Debug facilitado
- Pode executar um teste por vez

---

## 📊 ANÁLISE DOS RESULTADOS

### 1. Verificar Relatório HTML

**Localização:** `cypress/reports/[name]-report.html`

**Abrir no navegador:**
- Ver resumo geral
- Ver detalhes de cada teste
- Ver screenshots de falhas
- Ver tempo de execução

### 2. Analisar Console Output

**Verificar:**
- Total de testes executados
- Quantos passaram
- Quantos falharam
- Erros específicos

**Formato esperado:**
```
✓ 15 passed
✗ 3 failed
⏱  2m 30s
```

### 3. Examinar Screenshots de Falhas

**Localização:** `cypress/screenshots/[arquivo]/[teste].png`

**Analisar:**
- Estado da tela no momento da falha
- Mensagens exibidas
- Campos preenchidos
- Elementos visíveis

---

## 🔍 CLASSIFICAÇÃO DE FALHAS

### Para cada teste que falhar, classificar:

#### 🔹 Teste Desatualizado

**Características:**
- Mensagem/texto mudou na aplicação
- Seletor mudou (ID, classe, estrutura HTML)
- Comportamento mudou (mas aplicação está correta)

**Exemplos:**
- Teste espera "Cliente atualizado." mas aplicação mostra "Cliente atualizado com sucesso!"
- Teste busca `#old-id` mas elemento agora é `#new-id`
- Teste espera redirecionamento para `/old-path` mas agora é `/new-path`

**Ação:** Ajustar teste Cypress

---

#### 🔹 Teste Frágil

**Características:**
- Timing (elemento não carregou a tempo)
- Seletor instável (depende de ordem, timing, estado)
- Dados de teste inconsistentes
- Dependência de estado externo
- Race conditions

**Exemplos:**
- `cy.get('#element').should('be.visible')` falha porque elemento demora para aparecer
- Teste depende de dados que mudam entre execuções
- Teste falha intermitentemente (flaky)

**Ação:** Tornar teste mais robusto (waits, retries, dados estáveis)

---

#### 🔹 Bug Real da Aplicação

**Características:**
- Comportamento incorreto da aplicação
- Validação quebrada
- Fluxo não funciona
- Erro JavaScript no console
- API retorna erro inesperado
- Dados não são salvos
- Redirecionamento incorreto

**Exemplos:**
- Botão "Salvar" não salva dados
- Validação permite dados inválidos
- Erro 500 na API quando deveria ser 200
- Console mostra `TypeError: Cannot read properties of undefined`

**Ação:** Corrigir aplicação

---

#### ⚠️ Falha de Ambiente/Dados

**Características:**
- Backend não está rodando
- Frontend não está rodando
- Dados de teste ausentes (fixtures)
- Configuração incorreta
- Porta ocupada
- Variáveis de ambiente faltando

**Exemplos:**
- `net::ERR_CONNECTION_REFUSED` ao chamar API
- Página não carrega (404)
- Fixture `customers-list.json` não encontrado
- `CYPRESS_BASE_URL` incorreto

**Ação:** Ajustar ambiente/dados

---

## 📝 TEMPLATE DE REGISTRO DE FALHA

### Para cada teste que falhar, preencher:

```markdown
### [Nome do Teste]

**Arquivo:** `[arquivo].cy.js`  
**Suite:** `[describe]`  
**Teste:** `[it]`  
**Linha:** [linha]  
**Status:** ❌ Falhou

**Erro Completo:**
```
[Erro completo do Cypress com stack trace]
```

**Screenshot:** `cypress/screenshots/[arquivo]/[teste].png`

**Console do Navegador:**
```
[Erros JavaScript, se houver]
```

**Requests da API:**
- Endpoint: `[endpoint]`
- Status: `[status code]`
- Resposta: `[resposta]`

**Classificação QA:**
- [ ] 🔹 Teste desatualizado
- [ ] 🔹 Teste frágil
- [ ] 🔹 Bug real da aplicação
- [ ] ⚠️ Falha de ambiente/dados

**Análise Detalhada:**
[Análise do motivo da falha, comparação com código atual, comportamento esperado vs real]

**Comportamento Esperado:**
[O que deveria acontecer]

**Comportamento Real:**
[O que realmente aconteceu]

**Ação Recomendada:**
- [ ] Ajustar teste Cypress
- [ ] Corrigir aplicação
- [ ] Ajustar ambiente/dados
- [ ] Investigar mais

**Prioridade:**
- [ ] ALTA (bloqueante para produção)
- [ ] MÉDIA (importante mas não bloqueante)
- [ ] BAIXA (pode ser corrigido depois)

**Observações:**
[Notas adicionais, contexto, relacionamento com outros testes]
```

---

## ✅ TEMPLATE DE REGISTRO DE SUCESSO

### Para testes que passarem (opcional, para documentação):

```markdown
### [Nome do Teste]

**Arquivo:** `[arquivo].cy.js`  
**Suite:** `[describe]`  
**Teste:** `[it]`  
**Status:** ✅ Passou

**Tempo de Execução:** [tempo]

**Observações:**
[Notas, se relevante]
```

---

## 🔍 VERIFICAÇÕES OBRIGATÓRIAS

### Durante a Execução, Validar:

#### 1. Console do Navegador

**Abrir DevTools durante execução e verificar:**

- ✅ Sem erros JavaScript críticos
- ✅ Sem erros de `.map()`, `.reduce()`, `.filter()` em undefined
- ✅ Sem erros de CORS
- ✅ Sem erros de rede (Failed to fetch, Connection refused)
- ⚠️ Warnings não-críticos são aceitáveis

**Ações:**
- Abrir Cypress em modo interativo (`cypress open`)
- Executar teste que falha
- Abrir DevTools (F12)
- Verificar console para erros

---

#### 2. Requests da API

**Verificar na aba Network do DevTools:**

- ✅ Endpoints esperados sendo chamados
- ✅ Status codes corretos (200, 201, 204)
- ✅ Respostas no formato esperado (JSON válido)
- ✅ Headers corretos (Authorization, Content-Type)
- ❌ Sem erros 400, 401, 403, 500

**Exemplos:**
- `GET /api/customers` → 200 OK
- `POST /api/customers` → 201 Created
- `PUT /api/customers/:id` → 200 OK
- `DELETE /api/customers/:id` → 200 OK

---

#### 3. Mensagens Exibidas

**Validar na interface:**

- ✅ Mensagens de sucesso corretas
- ✅ Mensagens de erro claras
- ✅ Feedback visual adequado (loading, success, error)
- ✅ Mensagens não duplicadas

**Exemplos:**
- "Cliente criado com sucesso." → ✅ Correto
- "Cliente atualizado com sucesso!" → ✅ Correto
- "Cliente removido com sucesso." → ✅ Correto
- "E-mail ou senha incorretos" → ✅ Correto

---

#### 4. Redirecionamentos

**Validar navegação:**

- ✅ Após login → `/dashboard.html`
- ✅ Após salvar cliente → `/clients.html` ou permanece na página
- ✅ Após remover cliente → `/clients.html`
- ✅ Após cancelar → página anterior ou `/clients.html`
- ✅ Botão "Voltar" → página anterior

---

#### 5. Estados Finais

**Validar após ações:**

- ✅ Dados salvos corretamente (recarregar página e verificar)
- ✅ Sessão mantida (não deslogar após ação)
- ✅ UI atualizada (lista, formulário, contadores)
- ✅ Botões voltam ao estado normal (não ficam em loading)

---

## 📊 PLANILHA DE RESULTADOS

### Estrutura Sugerida:

| Arquivo | Teste | Status | Classificação | Prioridade | Observações |
|---------|-------|--------|---------------|------------|-------------|
| login.cy.js | exibe erro quando o e-mail esta vazio | ✅ Passou | - | - | - |
| login.cy.js | faz login com sucesso | ✅ Passou | - | - | - |
| client-edit.cy.js | Editar nome salva a alteracao | ✅ Passou | - | - | Já corrigido |
| client-edit.cy.js | [Nome do teste] | ❌ Falhou | 🔹 Teste desatualizado | ALTA | [Detalhes] |

---

## 📈 RELATÓRIO FINAL DE EXECUÇÃO

### Estrutura do Relatório:

```markdown
# 📊 RELATÓRIO DE EXECUÇÃO CYPRESS - [DATA]

## Resumo Executivo

- **Total de Testes:** [número]
- **Testes Passando:** [número] ([percentual]%)
- **Testes Falhando:** [número] ([percentual]%)
- **Taxa de Sucesso:** [percentual]%

## Testes por Prioridade

### Prioridade ALTA
- **Total:** [número]
- **Passando:** [número]
- **Falhando:** [número]

### Prioridade MÉDIA
- **Total:** [número]
- **Passando:** [número]
- **Falhando:** [número]

### Prioridade BAIXA
- **Total:** [número]
- **Passando:** [número]
- **Falhando:** [número]

## Detalhamento de Falhas

[Usar template de registro de falha para cada teste que falhou]

## Análise por Classificação

### 🔹 Teste Desatualizado
- [Lista de testes]

### 🔹 Teste Frágil
- [Lista de testes]

### 🔹 Bug Real da Aplicação
- [Lista de testes]

### ⚠️ Falha de Ambiente/Dados
- [Lista de testes]

## Verificações Realizadas

### Console do Navegador
- ✅ Sem erros críticos
- ⚠️ [Warnings encontrados, se houver]

### Requests da API
- ✅ Todos os endpoints chamados corretamente
- ❌ [Endpoints com problema, se houver]

### Mensagens Exibidas
- ✅ Mensagens corretas
- ❌ [Mensagens incorretas, se houver]

### Redirecionamentos
- ✅ Todos corretos
- ❌ [Problemas encontrados, se houver]

### Estados Finais
- ✅ Dados salvos corretamente
- ❌ [Problemas encontrados, se houver]

## Decisão Go / No-Go

### Análise:
[Análise detalhada baseada nos resultados]

### Decisão:
- [ ] ✅ **GO para Produção**
- [ ] ⚠️ **GO COM RESSALVA**
- [ ] ❌ **NO-GO**

### Justificativa:
[Justificativa da decisão baseada em evidências]

## Próximos Passos

1. [ ] [Ação recomendada]
2. [ ] [Ação recomendada]
3. [ ] [Ação recomendada]
```

---

## 🎯 CRITÉRIO DE SUCESSO

### Execução Válida se:

- ✅ Todos os testes críticos foram executados
- ✅ Falhas estão classificadas com análise QA detalhada
- ✅ Nenhuma regressão crítica identificada
- ✅ Sistema permanece funcional após os testes
- ✅ Console sem erros críticos
- ✅ Relatório completo gerado

### Decisão Go / No-Go:

#### ✅ **GO para Produção:**
- Taxa de sucesso ≥ 80%
- Nenhuma falha crítica (autenticação, salvamento, remoção)
- Falhas restantes são não-críticas e classificadas
- Nenhuma regressão identificada

#### ⚠️ **GO COM RESSALVA:**
- Taxa de sucesso ≥ 60%
- Falhas não-críticas (acessibilidade, validações secundárias)
- Plano de correção documentado
- Nenhuma regressão crítica

#### ❌ **NO-GO:**
- Taxa de sucesso < 60%
- Falhas críticas (login, salvamento, remoção)
- Regressões identificadas
- Erros críticos no console
- Sistema quebrado após testes

---

## 📌 CHECKLIST DE EXECUÇÃO

### Antes de Executar:

- [ ] Backend rodando (localhost:3000)
- [ ] Frontend rodando (localhost:4000)
- [ ] Cypress instalado (`npm install`)
- [ ] Fixtures disponíveis
- [ ] Ambiente de teste limpo

### Durante Execução:

- [ ] Executar testes por prioridade
- [ ] Documentar cada falha imediatamente
- [ ] Capturar screenshots
- [ ] Verificar console do navegador
- [ ] Verificar requests da API
- [ ] Verificar mensagens exibidas

### Após Execução:

- [ ] Analisar relatório HTML
- [ ] Classificar todas as falhas
- [ ] Preencher template de análise
- [ ] Calcular taxa de sucesso
- [ ] Tomar decisão Go / No-Go
- [ ] Documentar próximos passos

---

## ✅ CONCLUSÃO

**Status:** ✅ **GUIA COMPLETO DISPONÍVEL**

Este guia fornece:
- ✅ Instruções claras de execução
- ✅ Template de análise de falhas
- ✅ Critérios de classificação
- ✅ Checklist de verificação
- ✅ Estrutura de relatório final

**Pronto para:**
- ✅ Execução manual dos testes
- ✅ Análise profissional dos resultados
- ✅ Classificação precisa de falhas
- ✅ Decisão fundamentada Go / No-Go

---

**Próximo Passo:** Executar testes seguindo este guia e documentar resultados.
