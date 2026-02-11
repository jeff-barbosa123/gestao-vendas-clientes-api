# 🤖 AUTOMAÇÃO CYPRESS - FLUXO COMPLETO

## 📋 Descrição

Script de automação end-to-end que executa todo o fluxo da aplicação SGVC em um único teste:

1. ✅ **Login** - Autenticação do usuário
2. ✅ **Criação de Usuário** - Registro de novo usuário via modal
3. ✅ **Dashboard** - Visualização de métricas e indicadores
4. ✅ **Clientes** - Listagem, criação de PF e PJ
5. ✅ **Produtos** - Listagem e criação
6. ✅ **Vendas** - Listagem
7. ✅ **Receitas** - Listagem
8. ✅ **Relatórios** - Visualização
9. ✅ **Simulação** - Simulação de preços
10. ✅ **Vínculos** - Vínculos de receitas
11. ✅ **Perfil** - Atualização de perfil
12. ✅ **Error Monitoring** - Monitoramento de erros
13. ✅ **Logout** - Encerramento de sessão

**Tempo estimado de execução:** ~10-15 minutos

---

## 🚀 Como Executar

### Pré-requisitos

1. **Node.js** instalado (v18 ou superior)
2. **Cypress** instalado (já incluído nas dependências)
3. **Aplicação rodando** em `http://localhost:4000` (ou configurar `CYPRESS_BASE_URL`)

### Opção 1: Executar via Interface Gráfica (Recomendado para Debug)

```bash
# Executar apenas o fluxo completo
npm run cypress:open:fluxo-completo

# Ou executar todos os testes
npm run cypress:open:local
```

### Opção 2: Executar em Modo Headless (CI/CD)

```bash
# Executar apenas o fluxo completo
npm run cypress:run:fluxo-completo

# Ou executar todos os testes
npm run cypress:run:local
```

### Opção 3: Executar com URL Customizada

```bash
# Homologação
CYPRESS_BASE_URL=https://hmg.sgvc.com.br npm run cypress:run:fluxo-completo

# Produção (cuidado!)
CYPRESS_BASE_URL=https://sgvc.com.br npm run cypress:run:fluxo-completo
```

### Opção 4: Configurar Comportamento (NOVO!)

```bash
# Criar novo usuário a cada execução
CREATE_NEW_USER=true npm run cypress:run:fluxo-completo

# Usar usuário existente (PADRÃO - recomendado)
npm run cypress:run:fluxo-completo

# Não criar receita (apenas navegação)
CREATE_RECIPE=false npm run cypress:run:fluxo-completo

# Criar novo usuário + não criar receita
CREATE_NEW_USER=true CREATE_RECIPE=false npm run cypress:run:fluxo-completo
```

**Scripts pré-configurados:**
```bash
# Novo usuário
npm run cypress:run:fluxo-completo:novo-usuario

# Sem criar receita
npm run cypress:run:fluxo-completo:sem-receita
```

---

## 📁 Estrutura do Script

```
cypress/e2e/fluxo-completo.cy.js
```

### Seções do Teste

1. **Setup** - Limpeza de sessão e cookies
2. **Etapa 1: Login** - Autenticação inicial
3. **Etapa 2: Dashboard** - Validação de métricas
4. **Etapa 3: Criação de Usuário** - Registro completo
5. **Etapas 4-9: Funcionalidades** - Navegação e validação
6. **Etapa 10-13: Telas Secundárias** - Relatórios, simulação, etc.
7. **Etapa 14-16: Validações Finais** - Logout e limpeza

---

## 🔧 Configuração

### Variáveis de Ambiente

```bash
# Base URL da aplicação
CYPRESS_BASE_URL=http://localhost:4000

# Timeout padrão (em ms)
CYPRESS_DEFAULT_COMMAND_TIMEOUT=10000
```

### Credenciais de Teste

O script utiliza credenciais padrão:

```javascript
// Login inicial
email: 'admin@negocio.com'
password: 'Admin@123!'

// Novo usuário criado durante o teste
email: `teste${timestamp}@automacao.com`
password: 'Teste@123!'
```

---

## 📊 Relatórios

Após a execução, os relatórios são gerados em:

```
cypress/reports/fluxo-completo-report.html
```

### Visualizar Relatório

1. Abra o arquivo HTML gerado em um navegador
2. Visualize screenshots, vídeos e logs detalhados
3. Analise estatísticas de execução

---

## 🐛 Troubleshooting

### Erro: "Cannot connect to server"

**Solução:** Certifique-se de que a aplicação está rodando:
```bash
npm run dev:local
```

### Erro: "Element not found"

**Possíveis causas:**
- Aplicação não está totalmente carregada
- Seletor HTML mudou
- JavaScript ainda não executou

**Solução:** Aumentar timeout ou verificar seletores no código

### Erro: "Session expired"

**Solução:** O script limpa sessão automaticamente. Se persistir:
```javascript
// Verificar se sessionStorage está sendo limpo
cy.window().then((win) => {
  win.sessionStorage.clear();
});
```

### Teste Falhando em uma Etapa Específica

1. Execute apenas até a etapa anterior
2. Verifique logs do Cypress
3. Valide que a aplicação está funcionando manualmente
4. Ajuste interceptações ou seletores se necessário

---

## 📝 Personalização

### Modificar Dados de Teste

Edite as constantes no início do arquivo:

```javascript
const testUser = {
  name: `Usuário Teste ${timestamp}`,
  email: `teste${timestamp}@automacao.com`,
  password: 'Teste@123!',
};
```

### Adicionar Novas Etapas

```javascript
// Adicionar após uma etapa existente
cy.log('📝 Nova Etapa: Descrição');
cy.get('#novo-botao').click();
cy.location('pathname').should('eq', '/nova-pagina.html');
cy.log('✅ Nova funcionalidade validada');
```

### Modificar Timeouts

```javascript
cy.location('pathname', { timeout: 15000 }).should('eq', '/dashboard.html');
```

---

## ✅ Checklist de Validação

Antes de executar, verifique:

- [ ] Aplicação está rodando e acessível
- [ ] Banco de dados está configurado e conectado
- [ ] Usuário padrão `admin@negocio.com` existe no banco
- [ ] Porta 4000 está livre (ou ajustar `CYPRESS_BASE_URL`)
- [ ] Dependências do Cypress estão instaladas (`npm install`)

---

## 📈 Métricas Esperadas

Após execução bem-sucedida:

- ✅ **16 etapas** executadas
- ✅ **~10-15 minutos** de duração
- ✅ **100%** de cobertura das funcionalidades principais
- ✅ **0 erros** críticos
- ✅ **Screenshots** gerados para cada etapa

---

## 🔐 Segurança

⚠️ **IMPORTANTE:**

- Não commitar credenciais reais
- Usar credenciais de teste em ambientes de desenvolvimento
- Não executar em produção com dados reais
- Limpar dados de teste após execução

---

## 📞 Suporte

Em caso de problemas:

1. Verificar logs do Cypress
2. Executar manualmente a funcionalidade que falhou
3. Verificar se há mudanças recentes no código
4. Consultar documentação do Cypress: https://docs.cypress.io

---

## 🎯 Próximos Passos

Melhorias futuras sugeridas:

- [ ] Adicionar testes de edição de registros
- [ ] Incluir testes de exclusão
- [ ] Adicionar validação de paginação
- [ ] Testar filtros avançados
- [ ] Validar exportação de dados
- [ ] Testar responsividade mobile

---

**Versão:** 1.0.0  
**Data de Criação:** 2025-01-XX  
**Última Atualização:** 2025-01-XX
