# 📋 Instruções para Executar Testes Cypress

## 🎯 Pré-requisitos

Antes de executar os testes, certifique-se de que:

1. **Node.js e npm estão instalados**
   ```powershell
   node --version
   npm --version
   ```

2. **Dependências estão instaladas**
   ```powershell
   cd gestao-vendas-clientes-api
   npm install
   cd api
   npm install
   cd ..
   ```

3. **Servidores estão rodando**
   - **API Backend**: Deve estar rodando em `http://localhost:3000`
   - **Frontend Web**: Deve estar rodando em `http://localhost:4000`

4. **Banco de dados está configurado**
   - PostgreSQL deve estar rodando
   - Variáveis de ambiente devem estar configuradas no arquivo `.env` da API
   - Banco de dados deve estar criado e migrado

## 🚀 Executando os Testes

### Opção 1: Modo Interativo (Recomendado para desenvolvimento)

Abra o Cypress em modo interativo para ver os testes sendo executados:

```powershell
cd gestao-vendas-clientes-api
npm run cypress:open
```

Isso abrirá a interface gráfica do Cypress onde você pode:
- Selecionar quais testes executar
- Ver os testes rodando em tempo real
- Inspecionar elementos durante a execução
- Ver screenshots e vídeos dos testes

### Opção 2: Modo Headless (Para CI/CD)

Execute todos os testes em modo headless (sem interface gráfica):

```powershell
cd gestao-vendas-clientes-api
npm run cypress:run
```

Isso executará todos os testes e gerará um relatório em `cypress/reports/`.

### Opção 3: Executar Teste Específico

Para executar apenas um arquivo de teste específico:

```powershell
cd gestao-vendas-clientes-api
npx cypress run --spec "cypress/e2e/login.cy.js"
```

## 📊 Estrutura dos Testes

### Arquivos de Teste Disponíveis

1. **login.cy.js** - Testes de autenticação e login
2. **register.cy.js** - Testes de registro de usuário
3. **password-reset.cy.js** - Testes de recuperação de senha
4. **password-strength.cy.js** - Testes de validação de força de senha
5. **session.cy.js** - Testes de gerenciamento de sessão
6. **products.cy.js** - Testes de gerenciamento de produtos
7. **sales.cy.js** - Testes de gerenciamento de vendas
8. **profile.cy.js** - Testes de perfil de usuário
9. **security.cy.js** - Testes de segurança (rate limiting, etc)
10. **regression.cy.js** - Testes de regressão
11. **clients-form.cy.js** - Testes de formulário de clientes
12. **clients-listing.cy.js** - Testes de listagem de clientes
13. **client-edit.cy.js** - Testes de edição de clientes
14. **dashboard.cy.js** - Testes do dashboard
15. **recipes.cy.js** - Testes de receitas/fichas técnicas
16. **accessibility.cy.js** - Testes de acessibilidade (axe-core)

### Comandos Customizados do Cypress

Os seguintes comandos customizados estão disponíveis:

- `cy.loginAsAdmin()` - Faz login como administrador
- `cy.seedSession(sessionData)` - Define uma sessão no sessionStorage
- `cy.clearSession()` - Limpa a sessão do sessionStorage
- `cy.stubDashboardMetrics()` - Simula métricas do dashboard

## 🔧 Configuração

### Variáveis de Ambiente para Testes

Certifique-se de que as seguintes variáveis estão configuradas no `.env` da API:

```env
# JWT Configuration
JWT_SECRET=seu-jwt-secret-aqui
JWT_REFRESH_SECRET=seu-jwt-refresh-secret-aqui
JWT_TTL_SECONDS=900
JWT_REFRESH_TTL_SECONDS=86400

# CORS
ALLOWED_ORIGINS=http://localhost:4000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sgvc_db
DB_USER=sgvc_user
DB_PASSWORD=sua-senha-aqui

# Email (opcional para testes)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=seu-email@example.com
SMTP_PASS=sua-senha-aqui
```

### Credenciais de Teste

**Administrador Padrão:**
- Email: `admin@sgvc.com`
- Senha: `Admin@123!` (conforme nova política de senhas fortes)

**Observação:** Se você migrou as senhas no banco de dados, certifique-se de que a senha do admin está hasheada com bcrypt. Caso contrário, use o script de migração:

```powershell
cd gestao-vendas-clientes-api/api
node scripts/migrate-passwords.js
```

## 📈 Relatórios

Após a execução dos testes, os relatórios estarão disponíveis em:

- **HTML Report**: `cypress/reports/index.html`
- **JSON Report**: `cypress/reports/*-report.json`
- **Screenshots**: `cypress/screenshots/` (apenas para testes que falharem)
- **Vídeos**: `cypress/videos/` (apenas quando vídeos estão habilitados)

Para abrir o relatório HTML:

```powershell
cd gestao-vendas-clientes-api
start cypress/reports/index.html
```

## 🐛 Troubleshooting

### Erro: "Cannot connect to localhost:4000"

**Solução:** Certifique-se de que o frontend está rodando:
```powershell
cd gestao-vendas-clientes-api/web
npm install
npm start
```

### Erro: "API request failed" ou "401 Unauthorized"

**Solução:** 
1. Verifique se a API está rodando em `http://localhost:3000`
2. Verifique se o `JWT_SECRET` está configurado corretamente
3. Verifique se o banco de dados está acessível
4. Execute as migrações do banco de dados:
   ```powershell
   cd gestao-vendas-clientes-api/api
   node scripts/seed-users.js
   ```

### Erro: "Element not found" ou "Timeout"

**Solução:**
1. Verifique se os IDs dos elementos HTML estão corretos
2. Aumente o timeout padrão do Cypress no `cypress.config.js`:
   ```javascript
   e2e: {
     defaultCommandTimeout: 10000, // 10 segundos
     // ...
   }
   ```

### Testes Falhando Após Mudanças de Segurança

Se os testes estão falhando após as implementações de segurança:

1. **Verifique senhas**: Todos os testes devem usar senhas fortes (`Admin@123!` ou similar)
2. **Verifique sessionStorage**: Os testes devem usar `sessionStorage` ao invés de `localStorage` para tokens
3. **Verifique rate limiting**: Alguns testes podem estar sendo bloqueados por rate limiting. Adicione pequenos delays entre requisições ou use `cy.wait()` adequadamente

### Limpar Dados de Teste

Se precisar limpar os dados de teste no banco:

```powershell
cd gestao-vendas-clientes-api/api
node scripts/seed-users.js --reset
```

## ✅ Checklist Antes de Executar Testes

- [ ] Node.js e npm instalados
- [ ] Dependências instaladas (`npm install` na raiz e em `api/`)
- [ ] PostgreSQL rodando
- [ ] Banco de dados criado e migrado
- [ ] Arquivo `.env` configurado na API
- [ ] API rodando em `http://localhost:3000`
- [ ] Frontend rodando em `http://localhost:4000`
- [ ] Credenciais de admin configuradas corretamente
- [ ] Senhas migradas (se aplicável)

## 📝 Notas Importantes

1. **Senhas Fortes**: Todos os testes agora exigem senhas fortes (mínimo 8 caracteres, com maiúscula, minúscula, número e caractere especial)

2. **SessionStorage**: Os testes foram atualizados para usar `sessionStorage` ao invés de `localStorage` para melhor segurança

3. **Rate Limiting**: Alguns endpoints têm rate limiting ativo. Testes podem precisar de ajustes se executados muito rapidamente

4. **Banco de Dados**: Os testes podem criar/modificar dados no banco. Considere usar um banco de teste separado ou limpar após os testes

5. **Interceptação**: Muitos testes usam `cy.intercept()` para simular respostas da API. Certifique-se de que os intercepts estão configurados corretamente

## 🎓 Recursos Adicionais

- [Documentação Oficial do Cypress](https://docs.cypress.io/)
- [Best Practices do Cypress](https://docs.cypress.io/guides/references/best-practices)
- [Comandos Customizados do Cypress](https://docs.cypress.io/api/cypress-api/custom-commands)

---

**Última atualização:** Dezembro 2024
